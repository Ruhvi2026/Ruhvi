import 'server-only';

import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionDeclaration,
} from '@google/generative-ai';
import { CO_FOUNDER_TOOL_DECLARATIONS } from './brain';
import { executeCoFounderTool, ToolExecutionResult } from './tool-bridge';
import { validatePromptSecurity, tokenBudgetManager } from './security';

export interface OrchestrationStep {
  iteration: number;
  thought?: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  toolResults?: Array<ToolExecutionResult>;
  requiresApproval?: boolean;
  approvalDetails?: any;
}

export interface FallbackProviderConfig {
  provider: string;
  apiKey: string;
  modelName?: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}

export interface OrchestrationOptions {
  apiKey: string;
  modelName?: string;
  systemInstruction?: string;
  maxIterations?: number;
  timeoutMs?: number;
  scopes?: string[];
  userId?: string;
  customTools?: any[];
  onStep?: (step: OrchestrationStep) => void | Promise<void>;
  provider?:
    'gemini' | 'openrouter' | 'openai' | 'deepseek' | 'custom' | string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
  fallbackChain?: FallbackProviderConfig[];
}

export interface OrchestrationResult {
  success: boolean;
  responseText: string;
  toolCallsExecuted: number;
  steps: OrchestrationStep[];
  iterations: number;
  modelUsed: string;
  provider: string;
  pausedForApproval?: boolean;
  pendingApproval?: any;
  error?: string;
}

export const DANGLING_PROMISE_REGEX =
  /(?:আমি\s+চেক\s+করে\s+জানাচ্ছি|চেক\s+করে\s+জানাচ্ছি|চেক\s+করছি|আমি\s+দেখছি|একটু\s+দাঁড়ান|let\s+me\s+check|i\s+will\s+check|i\s*['’]?m\s+checking|checking\s+(?:on|this|into|now)|i\s*['’]?ll\s+check\s+and\s+let\s+you\s+know|i\s*['’]?ll\s+get\s+back\s+to\s+you|check\s+kore\s+janacchi|dekhe\s+bolchi)/i;

export interface ChatHistoryMessage {
  sender?: string;
  role?: string;
  text?: string;
  content?: string;
  imageUrl?: string;
  imageBase64?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

/**
 * Normalizes tool declarations to strictly valid Gemini SDK FunctionDeclaration objects.
 */
export function formatGeminiFunctionDeclarations(
  declarations: any[]
): FunctionDeclaration[] {
  return declarations.map((decl) => {
    const rawParams = decl.parameters || { type: 'OBJECT', properties: {} };

    const normalizeProperty = (prop: any): any => {
      if (!prop || typeof prop !== 'object') return prop;
      const copy: any = { ...prop };

      if (typeof copy.type === 'string') {
        const lower = copy.type.toLowerCase();
        if (lower === 'string') copy.type = SchemaType.STRING;
        else if (lower === 'number') copy.type = SchemaType.NUMBER;
        else if (lower === 'integer') copy.type = SchemaType.INTEGER;
        else if (lower === 'boolean') copy.type = SchemaType.BOOLEAN;
        else if (lower === 'array') copy.type = SchemaType.ARRAY;
        else if (lower === 'object') copy.type = SchemaType.OBJECT;
      }

      if (copy.properties && typeof copy.properties === 'object') {
        const nextProps: Record<string, any> = {};
        for (const [k, v] of Object.entries(copy.properties)) {
          nextProps[k] = normalizeProperty(v);
        }
        copy.properties = nextProps;
      }

      if (copy.items && typeof copy.items === 'object') {
        copy.items = normalizeProperty(copy.items);
      }

      return copy;
    };

    return {
      name: decl.name,
      description: decl.description,
      parameters: normalizeProperty(rawParams),
    };
  });
}

/**
 * Normalizes message history to adhere to Gemini's strict alternation rules:
 * - Must start with 'user'
 * - Alternates user -> model -> user -> model
 */
export function normalizeGeminiHistory(
  messages: ChatHistoryMessage[]
): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  if (!messages || messages.length === 0) return [];

  const raw = messages.slice(0, -1);
  const firstUserIdx = raw.findIndex((m) => (m.sender || m.role) === 'user');
  if (firstUserIdx === -1) return [];

  const validHistory: Array<{
    role: 'user' | 'model';
    parts: [{ text: string }];
  }> = [];
  let expectedRole: 'user' | 'model' = 'user';

  for (let i = firstUserIdx; i < raw.length; i++) {
    const m = raw[i];
    const role = (m.sender || m.role) === 'user' ? 'user' : 'model';
    const text = (m.text || m.content || '').trim();

    if (role === expectedRole && text) {
      validHistory.push({
        role,
        parts: [{ text }],
      });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }

  return validHistory;
}

/**
 * Normalizes tool declarations to standard OpenAI/OpenRouter Function Calling schemas.
 */
export function formatOpenAITools(declarations: any[]): Array<{
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, any>;
  };
}> {
  if (!Array.isArray(declarations)) return [];

  return declarations.map((decl) => {
    const rawParams = decl.parameters || { type: 'object', properties: {} };

    const normalizeProperty = (prop: any): any => {
      if (!prop || typeof prop !== 'object') return prop;
      const copy: any = { ...prop };

      if (typeof copy.type === 'string') {
        copy.type = copy.type.toLowerCase();
      }

      if (copy.properties && typeof copy.properties === 'object') {
        const nextProps: Record<string, any> = {};
        for (const [k, v] of Object.entries(copy.properties)) {
          nextProps[k] = normalizeProperty(v);
        }
        copy.properties = nextProps;
      }

      if (copy.items && typeof copy.items === 'object') {
        copy.items = normalizeProperty(copy.items);
      }

      return copy;
    };

    return {
      type: 'function',
      function: {
        name: decl.name,
        description: decl.description,
        parameters: {
          type: 'object',
          ...normalizeProperty(rawParams),
        },
      },
    };
  });
}

/**
 * Normalizes chat history for OpenAI / OpenRouter / DeepSeek / Custom endpoints.
 */
export function normalizeOpenAIMessages(
  messages: ChatHistoryMessage[],
  systemInstruction?: string
): Array<any> {
  const result: any[] = [];

  if (systemInstruction?.trim()) {
    result.push({
      role: 'system',
      content: systemInstruction.trim(),
    });
  }

  if (!Array.isArray(messages)) return result;

  for (const m of messages) {
    const rawRole = (
      m.role || (m.sender === 'assistant' ? 'assistant' : 'user')
    ).toLowerCase();
    const role =
      rawRole === 'model' || rawRole === 'assistant' ? 'assistant' : 'user';
    const content = (m.text || m.content || '').trim();

    if (content) {
      result.push({ role, content });
    }
  }

  return result;
}

/**
 * Resolves API endpoint and authentication headers for OpenAI-compatible providers.
 */
export function resolveOpenAIProviderEndpoint(
  provider: string,
  apiKey: string,
  options?: { baseUrl?: string; customHeaders?: Record<string, string> }
): { endpoint: string; headers: Record<string, string>; defaultModel: string } {
  const p = (provider || 'openrouter').toLowerCase();

  if (p === 'openrouter') {
    return {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ruhvi.in',
        'X-Title': 'Ruhvi AI Co-Founder',
        ...(options?.customHeaders || {}),
      },
      defaultModel: 'google/gemini-2.0-flash-001',
    };
  }

  if (p === 'openai') {
    return {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(options?.customHeaders || {}),
      },
      defaultModel: 'gpt-4o-mini',
    };
  }

  if (p === 'deepseek') {
    return {
      endpoint: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(options?.customHeaders || {}),
      },
      defaultModel: 'deepseek-reasoner',
    };
  }

  // Custom Gateway / Ollama / LMStudio
  const rawBase =
    options?.baseUrl ||
    process.env.CUSTOM_GATEWAY_URL ||
    'http://localhost:11434/v1';
  const base = rawBase.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.customHeaders || {}),
  };
  if (apiKey && apiKey !== 'dummy-key') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return {
    endpoint: `${base}/chat/completions`,
    headers,
    defaultModel: 'auto/best-fast',
  };
}

/**
 * Helper to safely parse tool call arguments.
 */
function tryParseJson(args: any): Record<string, any> {
  if (!args) return {};
  if (typeof args === 'object') return args;
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Executes the Autonomous Tool-Calling reasoning loop using OpenAI-compatible APIs
 * (OpenRouter, OpenAI, DeepSeek, Custom Gateway).
 */
export async function runOpenAICompatibleAgentLoop(
  messages: ChatHistoryMessage[],
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  const provider = (options.provider || 'openrouter').toLowerCase();
  const { endpoint, headers, defaultModel } = resolveOpenAIProviderEndpoint(
    provider,
    options.apiKey,
    { baseUrl: options.baseUrl, customHeaders: options.customHeaders }
  );

  const modelName = options.modelName || defaultModel;
  const maxIterations = Math.min(Math.max(options.maxIterations || 8, 1), 12);
  const userScopes = options.scopes || [
    'admin:full',
    'mcp_tools:read',
    'mcp_tools:write',
    'analytics:read',
    'analytics:write',
    'products:read',
    'inventory:read',
    'orders:read',
    'customer:read',
    'support_ticket:read',
    'coupons:read',
  ];

  const tools = formatOpenAITools(
    options.customTools || CO_FOUNDER_TOOL_DECLARATIONS
  );
  const conversationMessages = normalizeOpenAIMessages(
    messages,
    options.systemInstruction
  );

  let iteration = 0;
  let totalToolsExecuted = 0;
  const steps: OrchestrationStep[] = [];
  let finalResponseText = '';
  let pausedForApproval = false;
  let pendingApproval: any = null;

  while (iteration < maxIterations) {
    iteration++;

    const payload: any = {
      model: modelName,
      messages: conversationMessages,
      ...(modelName?.includes('reasoner') ? {} : { temperature: 0.3 }),
      max_tokens: 2048,
    };

    if (tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `${provider.toUpperCase()} API Error (${res.status}): ${errText}`
      );
    }

    const data = await res.json();
    const assistantMessage = data.choices?.[0]?.message;

    if (!assistantMessage) {
      throw new Error(
        `${provider.toUpperCase()} returned empty response choices.`
      );
    }

    const toolCalls = assistantMessage.tool_calls;

    // If no tool call was requested, model returned its final answer
    if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
      const candidateText = (assistantMessage.content || '').trim();

      // Intercept dangling placeholder promises ("আমি চেক করে জানাচ্ছি") without tools
      if (
        DANGLING_PROMISE_REGEX.test(candidateText) &&
        iteration < maxIterations - 1
      ) {
        conversationMessages.push(assistantMessage);
        conversationMessages.push({
          role: 'user',
          content:
            'CRITICAL INSTRUCTION: Do not output placeholder promises like "checking". You have active tools. Call the appropriate tool immediately to inspect the database, or return the actual verified findings in your response.',
        });
        continue;
      }

      finalResponseText = candidateText;
      steps.push({
        iteration,
        thought: finalResponseText,
      });
      break;
    }

    // Append assistant tool-calling message to history
    conversationMessages.push(assistantMessage);

    const currentStep: OrchestrationStep = {
      iteration,
      toolCalls: toolCalls.map((tc: any) => ({
        name: tc.function?.name,
        args: tryParseJson(tc.function?.arguments),
      })),
      toolResults: [],
    };

    for (const tc of toolCalls) {
      totalToolsExecuted++;
      const toolName = tc.function?.name;
      const toolArgs = tryParseJson(tc.function?.arguments);

      try {
        const execResult = await executeCoFounderTool(
          toolName,
          toolArgs,
          userScopes
        );
        currentStep.toolResults!.push(execResult);

        // Check if human approval is required
        const isApprovalRequired =
          execResult.data?.pendingApprovalId ||
          execResult.data?.requiresApproval ||
          execResult.data?.requires_approval ||
          execResult.data?.workerResult?.requiredApproval;

        if (isApprovalRequired) {
          pausedForApproval = true;
          pendingApproval = {
            toolName,
            args: toolArgs,
            result: execResult.data,
            pendingApprovalId:
              execResult.data?.pendingApprovalId || execResult.data?.approvalId,
          };
          currentStep.requiresApproval = true;
          currentStep.approvalDetails = pendingApproval;
        }

        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: toolName,
          content: JSON.stringify({
            success: execResult.success,
            data: execResult.data ?? null,
            summary: execResult.summaryForVoice,
            error: execResult.error ?? null,
          }),
        });
      } catch (toolErr: any) {
        const errResult: ToolExecutionResult = {
          toolName,
          success: false,
          error: toolErr?.message || 'Tool execution error',
          summaryForVoice: `Failed to execute ${toolName}`,
        };
        currentStep.toolResults!.push(errResult);

        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: toolName,
          content: JSON.stringify({
            success: false,
            error: toolErr?.message || 'Tool execution error',
          }),
        });
      }
    }

    steps.push(currentStep);
    if (options.onStep) {
      await options.onStep(currentStep);
    }

    // If high-impact action requires founder approval, pause loop immediately
    if (pausedForApproval) {
      finalResponseText =
        'A high-impact business action has been proposed by the Co-Founder and is paused awaiting founder approval.';
      break;
    }
  }

  // If loop exited due to maxIterations without final text, request quick synthesis
  if (!finalResponseText && iteration >= maxIterations) {
    try {
      conversationMessages.push({
        role: 'user',
        content:
          'Maximum tool iterations reached. Please summarize your final response and findings for the founder based on the tool outputs gathered above.',
      });

      const synthRes = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          messages: conversationMessages,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (synthRes.ok) {
        const synthData = await synthRes.json();
        finalResponseText =
          synthData.choices?.[0]?.message?.content?.trim() || '';
      }
    } catch {
      finalResponseText =
        'Tool execution limit reached. Please review the executed steps.';
    }

    if (!finalResponseText) {
      finalResponseText =
        'Tool execution limit reached. Please review the executed steps.';
    }
  }

  // Safety guard against final unfulfilled promise
  if (
    DANGLING_PROMISE_REGEX.test(finalResponseText) &&
    totalToolsExecuted === 0
  ) {
    finalResponseText =
      'আমি এই মুহূর্তে রিয়েল-টাইম তথ্যটি সরাসরি ফেচ করতে পারছি না। অনুগ্রহ করে ড্যাশবোর্ড থেকে বর্তমান স্ট্যাটাসটি দেখে নিন অথবা আপনার প্রশ্নটি পুনরায় স্পষ্ট করুন।';
  }

  return {
    success: true,
    responseText: finalResponseText,
    toolCallsExecuted: totalToolsExecuted,
    steps,
    iterations: iteration,
    modelUsed: modelName,
    provider,
    pausedForApproval,
    pendingApproval,
  };
}

/**
 * Executes the Autonomous Tool-Calling reasoning loop using Google Gemini SDK.
 */
export async function runGeminiAgentLoop(
  messages: ChatHistoryMessage[],
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  const latestMessage = messages[messages.length - 1];
  const userPrompt = (
    latestMessage?.text ||
    latestMessage?.content ||
    ''
  ).trim();

  const maxIterations = Math.min(Math.max(options.maxIterations || 8, 1), 12);
  const userScopes = options.scopes || [
    'admin:full',
    'mcp_tools:read',
    'mcp_tools:write',
    'analytics:read',
    'analytics:write',
    'products:read',
    'inventory:read',
    'orders:read',
    'customer:read',
    'support_ticket:read',
    'coupons:read',
  ];

  const resolveGeminiModel = (m?: string): string => {
    if (!m) return 'gemini-3.5-flash';
    const legacyMap: Record<string, string> = {
      'gemini-2.5-flash': 'gemini-3.5-flash-lite',
      'gemini-2.5-pro': 'gemini-3.5-flash',
      'gemini-2.5-flash-lite': 'gemini-3.5-flash-lite',
      'gemini-1.5-flash': 'gemini-3.5-flash-lite',
      'gemini-1.5-pro': 'gemini-3.5-flash',
      'gemini-2.0-flash': 'gemini-3.5-flash-lite',
      'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
      'gemini-2.0-flash-001': 'gemini-3.5-flash-lite',
    };
    return legacyMap[m] || m;
  };

  const candidateModels = [
    resolveGeminiModel(options.modelName),
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(candidateModels));
  const validHistory = normalizeGeminiHistory(messages);
  const functionDeclarations = formatGeminiFunctionDeclarations(
    options.customTools || CO_FOUNDER_TOOL_DECLARATIONS
  );

  let lastError: string | undefined;

  for (const modelName of uniqueModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${options.apiKey}`;
      const userParts: any[] = [];
      if (latestMessage?.imageBase64) {
        const cleanBase64 = latestMessage.imageBase64.replace(
          /^data:[^;]+;base64,/,
          ''
        );
        const mime =
          latestMessage.imageBase64.match(/^data:([^;]+);base64,/)?.[1] ||
          'image/jpeg';
        userParts.push({
          inline_data: {
            mime_type: mime,
            data: cleanBase64,
          },
        });
      }
      userParts.push({ text: userPrompt });

      const conversationContents: any[] = [
        ...validHistory,
        { role: 'user', parts: userParts },
      ];

      let iteration = 0;
      let totalToolsExecuted = 0;
      const steps: OrchestrationStep[] = [];
      let finalResponseText = '';
      let pausedForApproval = false;
      let pendingApproval: any = null;

      while (iteration < maxIterations) {
        iteration++;

        const requestBody: any = {
          contents: conversationContents,
          tools: [{ function_declarations: functionDeclarations }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        };

        if (options.systemInstruction) {
          requestBody.system_instruction = {
            parts: [{ text: options.systemInstruction }],
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini API Error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const candidateContent = candidate?.content;

        if (!candidateContent) {
          throw new Error('Gemini returned empty candidate content');
        }

        // Look for any functionCall in the parts
        const functionCalls = (candidateContent.parts || [])
          .filter((p: any) => Boolean(p.functionCall))
          .map((p: any) => p.functionCall);

        // If no tool call was requested, model returned its final answer
        if (!functionCalls || functionCalls.length === 0) {
          const candidateText = (candidateContent.parts || [])
            .map((p: any) => p.text || '')
            .join('')
            .trim();

          // Intercept dangling placeholder promises ("আমি চেক করে জানাচ্ছি") without tools
          if (
            DANGLING_PROMISE_REGEX.test(candidateText) &&
            iteration < maxIterations - 1
          ) {
            conversationContents.push(candidateContent);
            conversationContents.push({
              role: 'user',
              parts: [
                {
                  text: 'CRITICAL INSTRUCTION: Do not output placeholder promises like "checking". You have active tools. Call the appropriate tool immediately to inspect the database, or return the actual verified findings in your response.',
                },
              ],
            });
            continue;
          }

          finalResponseText = candidateText;
          steps.push({
            iteration,
            thought: finalResponseText,
          });
          break;
        }

        // Keep model's candidate content in history (preserves thoughtSignature)
        conversationContents.push(candidateContent);

        // Process requested function calls
        const currentStep: OrchestrationStep = {
          iteration,
          toolCalls: functionCalls.map((fc: any) => ({
            name: fc.name,
            args: (fc.args as Record<string, any>) || {},
          })),
          toolResults: [],
        };

        const functionResponseParts: any[] = [];

        for (const fc of functionCalls) {
          totalToolsExecuted++;
          try {
            const execResult = await executeCoFounderTool(
              fc.name,
              (fc.args as Record<string, any>) || {},
              userScopes
            );
            currentStep.toolResults!.push(execResult);

            // Check if human approval is required
            const isApprovalRequired =
              execResult.data?.pendingApprovalId ||
              execResult.data?.requiresApproval ||
              execResult.data?.requires_approval ||
              execResult.data?.workerResult?.requiredApproval;

            if (isApprovalRequired) {
              pausedForApproval = true;
              pendingApproval = {
                toolName: fc.name,
                args: fc.args,
                result: execResult.data,
                pendingApprovalId:
                  execResult.data?.pendingApprovalId ||
                  execResult.data?.approvalId,
              };
              currentStep.requiresApproval = true;
              currentStep.approvalDetails = pendingApproval;
            }

            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: {
                  success: execResult.success,
                  data: execResult.data ?? null,
                  summary: execResult.summaryForVoice,
                  error: execResult.error ?? null,
                },
              },
            });
          } catch (toolErr: any) {
            const errResult: ToolExecutionResult = {
              toolName: fc.name,
              success: false,
              error: toolErr?.message || 'Tool execution error',
              summaryForVoice: `Failed to execute ${fc.name}`,
            };
            currentStep.toolResults!.push(errResult);

            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: {
                  success: false,
                  error: toolErr?.message || 'Tool execution error',
                },
              },
            });
          }
        }

        steps.push(currentStep);
        if (options.onStep) {
          await options.onStep(currentStep);
        }

        // If high-impact action requires founder approval, pause loop immediately
        if (pausedForApproval) {
          finalResponseText =
            'A high-impact business action has been proposed by the Co-Founder and is paused awaiting founder approval.';
          break;
        }

        // Append tool results to conversation with role 'user'
        conversationContents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }

      // If loop exited due to maxIterations without final text, request quick synthesis
      if (!finalResponseText && iteration >= maxIterations) {
        try {
          conversationContents.push({
            role: 'user',
            parts: [
              {
                text: 'Maximum tool iterations reached. Please summarize your final response and findings for the founder based on the tool outputs gathered above.',
              },
            ],
          });
          const synthRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: conversationContents,
              generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
            }),
          });
          if (synthRes.ok) {
            const synthData = await synthRes.json();
            finalResponseText = (
              synthData.candidates?.[0]?.content?.parts || []
            )
              .map((p: any) => p.text || '')
              .join('')
              .trim();
          }
        } catch {
          finalResponseText =
            'Tool execution limit reached. Please review the executed steps.';
        }
      }

      // Safety guard against final unfulfilled promise
      if (
        DANGLING_PROMISE_REGEX.test(finalResponseText) &&
        totalToolsExecuted === 0
      ) {
        finalResponseText =
          'আমি এই মুহূর্তে রিয়েল-টাইম তথ্যটি সরাসরি ফেচ করতে পারছি না। অনুগ্রহ করে ড্যাশবোর্ড থেকে বর্তমান স্ট্যাটাসটি দেখে নিন অথবা আপনার প্রশ্নটি পুনরায় স্পষ্ট করুন।';
      }

      return {
        success: true,
        responseText: finalResponseText,
        toolCallsExecuted: totalToolsExecuted,
        steps,
        iterations: iteration,
        modelUsed: modelName,
        provider: 'gemini',
        pausedForApproval,
        pendingApproval,
      };
    } catch (modelErr: any) {
      lastError = modelErr?.message || String(modelErr);
      continue;
    }
  }

  return {
    success: false,
    responseText: 'Agentic reasoning loop failed across all candidate models.',
    toolCallsExecuted: 0,
    steps: [],
    iterations: 0,
    modelUsed: 'none',
    provider: 'gemini',
    error: lastError,
  };
}

/**
 * Universal Unified Entry Point for Co-Founder Autonomous Tool-Calling reasoning loop.
 *
 * Supports:
 * - Google Gemini (native function declarations)
 * - OpenRouter (OpenAI-compatible tools & multi-model gateway)
 * - OpenAI (gpt-4o, gpt-4o-mini)
 * - DeepSeek (deepseek-chat)
 * - Custom Gateways (vLLM, Ollama, LMStudio)
 * - Automatic multi-provider fallback degradation
 */
export async function runCoFounderAgentLoop(
  messages: ChatHistoryMessage[],
  options: OrchestrationOptions
): Promise<OrchestrationResult> {
  const latestMessage = messages[messages.length - 1];
  const userPrompt = (
    latestMessage?.text ||
    latestMessage?.content ||
    ''
  ).trim();

  const provider = (options.provider || 'gemini').toLowerCase();

  if (!userPrompt) {
    return {
      success: false,
      responseText: 'Empty user prompt provided.',
      toolCallsExecuted: 0,
      steps: [],
      iterations: 0,
      modelUsed: 'none',
      provider,
      error: 'Empty prompt',
    };
  }

  // 1. Prompt Injection & Jailbreak Guard (Phase 10: Security Hardening)
  const securityCheck = validatePromptSecurity(userPrompt);
  if (!securityCheck.safe && securityCheck.threatLevel === 'high') {
    return {
      success: false,
      responseText:
        'I am unable to process prompts that attempt to override system security guidelines or extract confidential instructions.',
      toolCallsExecuted: 0,
      steps: [],
      iterations: 0,
      modelUsed: 'security-guard',
      provider,
      error: `Security violation: ${securityCheck.reason}`,
    };
  }

  // 2. Token Budget Guard (Phase 10: Runaway Session Prevention)
  const sessionId =
    (options as any).sessionId || options.userId || 'session_default';
  const estimatedTokens = Math.max(10, Math.round(userPrompt.length / 4));
  const budgetStatus = tokenBudgetManager.checkBudget(
    sessionId,
    estimatedTokens
  );
  if (!budgetStatus.allowed) {
    return {
      success: false,
      responseText:
        'Your session token budget has been exhausted. Please start a new session or contact the administrator.',
      toolCallsExecuted: 0,
      steps: [],
      iterations: 0,
      modelUsed: 'budget-guard',
      provider,
      error: budgetStatus.reason || 'Token budget exceeded',
    };
  }

  if (!options.apiKey) {
    return {
      success: false,
      responseText: `${provider === 'gemini' ? 'Gemini' : provider.toUpperCase()} API key is not configured.`,
      toolCallsExecuted: 0,
      steps: [],
      iterations: 0,
      modelUsed: 'none',
      provider,
      error: 'Missing API key',
    };
  }

  const recordConsumedBudget = (res: OrchestrationResult) => {
    if (res.success) {
      const tokensConsumed = Math.max(
        10,
        Math.round((userPrompt.length + (res.responseText?.length || 0)) / 4)
      );
      tokenBudgetManager.consumeTokens(sessionId, tokensConsumed);
    }
  };

  let primaryError: string | undefined;

  // 1. Attempt Primary Provider Loop
  try {
    if (['openrouter', 'openai', 'deepseek', 'custom'].includes(provider)) {
      const res = await runOpenAICompatibleAgentLoop(messages, options);
      if (res.success) {
        recordConsumedBudget(res);
        return res;
      }
      primaryError =
        res.error || 'Primary provider agentic loop returned failure';
    } else {
      const res = await runGeminiAgentLoop(messages, options);
      if (res.success) {
        recordConsumedBudget(res);
        return res;
      }
      primaryError = res.error || 'Gemini agentic loop returned failure';
    }
  } catch (err: any) {
    primaryError = err?.message || String(err);
  }

  // 2. Multi-Provider Fallback Degradation (if configured)
  if (options.fallbackChain && options.fallbackChain.length > 0) {
    for (const fb of options.fallbackChain) {
      if (!fb.apiKey) continue;
      const fbProvider = fb.provider.toLowerCase();
      try {
        const fbOptions: OrchestrationOptions = {
          ...options,
          provider: fbProvider,
          apiKey: fb.apiKey,
          modelName: fb.modelName,
          baseUrl: fb.baseUrl,
          customHeaders: fb.customHeaders,
          fallbackChain: undefined, // prevent infinite recursion
        };

        if (fbProvider === 'gemini') {
          const fbRes = await runGeminiAgentLoop(messages, fbOptions);
          if (fbRes.success) return fbRes;
        } else {
          const fbRes = await runOpenAICompatibleAgentLoop(messages, fbOptions);
          if (fbRes.success) return fbRes;
        }
      } catch (fbErr: any) {
        console.warn(
          `[Co-Founder Orchestrator] Fallback to ${fbProvider} failed:`,
          fbErr?.message
        );
        continue;
      }
    }
  }

  return {
    success: false,
    responseText: `Agentic reasoning loop failed across providers: ${primaryError}`,
    toolCallsExecuted: 0,
    steps: [],
    iterations: 0,
    modelUsed: 'none',
    provider,
    error: primaryError,
  };
}
