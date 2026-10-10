import 'server-only';

import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionDeclaration,
} from '@google/generative-ai';
import { CO_FOUNDER_TOOL_DECLARATIONS } from './brain';
import { executeCoFounderTool, ToolExecutionResult } from './tool-bridge';

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

export interface ChatHistoryMessage {
  sender?: string;
  role?: string;
  text?: string;
  content?: string;
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
 * Executes the Autonomous Tool-Calling reasoning loop using Google Gemini SDK.
 *
 * Loop:
 * 1. User message sent to Gemini with native function declarations.
 * 2. If model requests function calls, execute them via executeCoFounderTool.
 * 3. If any tool requires approval, pause loop and surface pending approval.
 * 4. Feed function responses back into Gemini chat session.
 * 5. Repeat until model synthesizes a final text answer, or maxIterations is reached.
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

  if (!userPrompt) {
    return {
      success: false,
      responseText: 'Empty user prompt provided.',
      toolCallsExecuted: 0,
      steps: [],
      iterations: 0,
      modelUsed: 'none',
      provider: 'gemini',
      error: 'Empty prompt',
    };
  }

  if (!options.apiKey) {
    return {
      success: false,
      responseText: 'Gemini API key is not configured.',
      toolCallsExecuted: 0,
      steps: [],
      iterations: 0,
      modelUsed: 'none',
      provider: 'gemini',
      error: 'Missing API key',
    };
  }

  const maxIterations = Math.min(Math.max(options.maxIterations || 8, 1), 12);
  const userScopes = options.scopes || [
    'admin:full',
    'mcp_tools:read',
    'mcp_tools:write',
    'analytics:read',
  ];

  const candidateModels = [
    options.modelName,
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(candidateModels));
  const validHistory = normalizeGeminiHistory(messages);
  const genAI = new GoogleGenerativeAI(options.apiKey);
  const functionDeclarations = formatGeminiFunctionDeclarations(
    options.customTools || CO_FOUNDER_TOOL_DECLARATIONS
  );

  let lastError: string | undefined;

  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
        tools: [{ functionDeclarations }],
      });

      const chat = model.startChat({ history: validHistory });
      let currentInput: any = userPrompt;
      let iteration = 0;
      let totalToolsExecuted = 0;
      const steps: OrchestrationStep[] = [];
      let finalResponseText = '';
      let pausedForApproval = false;
      let pendingApproval: any = null;

      while (iteration < maxIterations) {
        iteration++;

        const responseResult = await chat.sendMessage(currentInput);
        const response = responseResult.response;
        const functionCalls = response.functionCalls();

        // If no tool call was requested, model returned its final answer
        if (!functionCalls || functionCalls.length === 0) {
          finalResponseText = response.text();
          steps.push({
            iteration,
            thought: finalResponseText,
          });
          break;
        }

        // Process requested function calls
        const currentStep: OrchestrationStep = {
          iteration,
          toolCalls: functionCalls.map((fc) => ({
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

        // Feed tool results back into the conversation for next iteration
        currentInput = functionResponseParts;
      }

      // If loop exited due to maxIterations without final text, request quick synthesis
      if (!finalResponseText && iteration >= maxIterations) {
        try {
          const synthesisResult = await chat.sendMessage(
            'Maximum tool iterations reached. Please summarize your final response and findings for the founder based on the tool outputs gathered above.'
          );
          finalResponseText = synthesisResult.response.text();
        } catch {
          finalResponseText =
            'Tool execution limit reached. Please review the executed steps.';
        }
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
