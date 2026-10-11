import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCoFounderSystemPrompt } from '@/lib/ai/co-founder/brain';
import { runCoFounderAgentLoop } from '@/lib/ai/co-founder/orchestrator';
import { runAgenticStreamingSession } from '@/lib/ai/co-founder/streamer';
import { getUserScopes } from '@/lib/auth/rbac';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { resolveEffectiveApiKey } from '@/lib/ai/keys';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';
import {
  enforceCoFounderRateLimit,
  createRateLimitHeaders,
} from '@/lib/ai/co-founder/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatHistoryItem {
  sender: 'user' | 'assistant';
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      messages,
      channel = 'text',
      provider: requestedProvider,
      model: requestedModel,
      language,
      voiceStyle,
      agenticLoop: requestedAgenticLoop,
      maxIterations: requestedMaxIterations,
      stream: requestedStream,
    } = body;

    const wantsStream =
      Boolean(requestedStream) ||
      req.headers.get('accept')?.includes('text/event-stream') === true;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const latest = messages[messages.length - 1];
    if (!latest?.text && (latest?.imageUrl || latest?.imageBase64)) {
      latest.text =
        'Please review this attached image and share your analysis and thoughts.';
    }

    if (!latest?.text) {
      return NextResponse.json(
        { error: 'Message text or image is required' },
        { status: 400 }
      );
    }

    // Enforce Co-Founder rate limiting per user/role & channel tier
    const rateLimitTier = channel === 'voice' ? 'voice' : 'chat';
    const rateLimitCheck = enforceCoFounderRateLimit(auth.uid, {
      tier: rateLimitTier,
      role: auth.role || 'founder',
    });
    if (!rateLimitCheck.success) {
      return rateLimitCheck.response!;
    }

    // 1. Synthesize prioritized Co-Founder System Prompt
    let systemPrompt = await getCoFounderSystemPrompt({
      userId: auth.uid,
      userRole: auth.role || 'founder',
      adminName: 'Founder',
      channel: channel as 'voice' | 'text',
      sessionGoal: latest.text,
      language,
      voiceStyle,
    });

    // Inject Intent-Aware Image Handling Instructions if image is present
    if (latest.imageUrl || latest.imageBase64) {
      const imgRef = latest.imageUrl || latest.imageBase64;
      systemPrompt +=
        `\n\n[USER ATTACHED IMAGE CONTEXT]:\n` +
        `The founder has attached an image (${latest.imageUrl ? `URL: "${latest.imageUrl}"` : 'Base64 image data'}).\n` +
        `CRITICAL INTENT RULES FOR IMAGE HANDLING:\n` +
        `1. ALWAYS prioritize the founder's specific message: "${latest.text}".\n` +
        `2. IF the founder uploaded this image for DISCUSSION, FEEDBACK, ADVICE, COMPETITOR ANALYSIS, OR QUESTIONS (e.g. competitor ad, chart, invoice, design idea, packaging, or casual discussion):\n` +
        `   - Answer their query directly using multimodal visual comprehension and co-founder business judgment.\n` +
        `   - DO NOT invoke 'generate_product_studio_photos' for discussion/inquiry queries.\n` +
        `3. IF AND ONLY IF the founder asks for PRODUCT STUDIO PHOTOS, CATALOG SHOOT, OR FULL PRODUCT ONBOARDING:\n` +
        `   - Call 'analyze_product_image' with ${latest.imageUrl ? `{ imageUrl: "${latest.imageUrl}" }` : `{ imageBase64: "${imgRef}" }`} to inspect metal karat, craftsmanship, and gemstones.\n` +
        `   - Draft high-converting SEO copy (Title, Keywords, PDP Description, Care instructions).\n` +
        `   - Call 'generate_product_studio_photos' with ${latest.imageUrl ? `{ imageUrl: "${latest.imageUrl}" }` : `{ imageBase64: "${imgRef}" }`} to generate the 6-frame catalog shoot.\n` +
        `4. Never run billable image generation ('generate_product_studio_photos') without the founder either asking for product photo generation or selecting catalog creation.`;
    }

    // Check if user is asking to browse a URL or mentioned a website
    let browsingResult: any = null;
    const urlMatch = latest.text.match(
      /https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.(?:com|in|co|org|net|io|store|shop|app)(?:\/[^\s]*)?/i
    );
    const browseIntent =
      /(browse|check|look at|inspect|open|visit|analyze|scrape|website|competitor|view|see)/i.test(
        latest.text
      );

    if (urlMatch && (browseIntent || urlMatch[0].startsWith('http'))) {
      try {
        const targetUrl = urlMatch[0];
        const { browseWebPageWithPlaywright } =
          await import('@/lib/ai/browser/playwright');
        browsingResult = await browseWebPageWithPlaywright({
          url: targetUrl,
          captureScreenshot: true,
          timeoutMs: 15000,
        });

        if (browsingResult && browsingResult.status < 400) {
          systemPrompt +=
            `\n\n[LIVE PLAYWRIGHT BROWSER RESULT FOR ${targetUrl}]:\n` +
            `Title: ${browsingResult.title}\n` +
            `Meta Description: ${browsingResult.metaDescription}\n` +
            `Headings: ${browsingResult.headings.join(' | ')}\n` +
            (browsingResult.detectedPrices.length > 0
              ? `Observed Prices / Offers: ${browsingResult.detectedPrices.join(', ')}\n`
              : '') +
            `Extracted Text Content:\n${browsingResult.textContent.slice(0, 2000)}`;
        }
      } catch (browseErr: any) {
        console.warn(
          '[Co-Founder Chat] Auto-browse fallback:',
          browseErr?.message
        );
      }
    }

    // 2. Fetch configured AI Providers & Feature Routing from DB
    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: settingsData } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['ai_providers', 'ai_features', 'ai_global']);

    const settingsMap: Record<string, any> = {};
    if (settingsData && Array.isArray(settingsData)) {
      settingsData.forEach((row) => {
        settingsMap[row.key] = row.value;
      });
    }

    const dbProviders: any[] = Array.isArray(settingsMap.ai_providers)
      ? settingsMap.ai_providers
      : [];
    const coFounderConfig = settingsMap.ai_features?.co_founder || {};
    const useAgenticLoop =
      requestedAgenticLoop !== undefined
        ? Boolean(requestedAgenticLoop)
        : Boolean(coFounderConfig.agenticLoop ?? true);

    // 3. Determine Primary Provider and Model
    const primaryProvider =
      requestedProvider && requestedProvider !== 'auto'
        ? requestedProvider
        : coFounderConfig.provider || 'gemini';

    const primaryModel =
      requestedModel && requestedModel !== 'auto'
        ? requestedModel
        : coFounderConfig.model ||
          (primaryProvider === 'gemini' ? 'gemini-3.5-flash-lite' : '');

    // 4. Construct Fallback Execution Chain
    // Sort configured providers by priority: lower number = higher priority
    const sortedDbProviders = [...dbProviders]
      .filter((p) => p.isEnabled !== false)
      .sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99));

    // Ensure primary provider is first in chain
    const chainProviderIds: string[] = [primaryProvider];

    for (const p of sortedDbProviders) {
      const type = p.type || p.id;
      if (
        !chainProviderIds.includes(type) &&
        !chainProviderIds.includes(p.id)
      ) {
        chainProviderIds.push(p.id || type);
      }
    }

    // Default safety fallback sequence if DB is empty or missing providers
    const safetySequence = [
      'gemini',
      'openrouter',
      'deepseek',
      'custom',
      'openai',
      'anthropic',
    ];
    for (const seqId of safetySequence) {
      if (!chainProviderIds.includes(seqId)) {
        chainProviderIds.push(seqId);
      }
    }

    // Pre-resolve fallback chain for agentic loop degradation
    const fallbackChain = chainProviderIds
      .filter((id) => id !== primaryProvider)
      .map((id) => {
        const pConfig = dbProviders.find((p) => p.id === id || p.type === id);
        const pType = pConfig?.type || id;
        let k = '';
        if (pType === 'gemini') {
          k =
            process.env.GEMINI_LIVE_API_KEY ||
            resolveEffectiveApiKey('gemini', null, pConfig?.apiKey).apiKey ||
            process.env.GEMINI_API_KEY ||
            '';
        } else {
          k = resolveEffectiveApiKey(pType, null, pConfig?.apiKey).apiKey || '';
        }
        return {
          provider: pType,
          apiKey: k,
          modelName: pConfig?.models?.[0],
          baseUrl: pConfig?.baseUrl,
        };
      })
      .filter((fb) => Boolean(fb.apiKey));

    // ==========================================
    // STREAMING SSE AGENTIC EXECUTION (STEP 6.3)
    // ==========================================
    if (wantsStream && useAgenticLoop) {
      const primaryConfig = dbProviders.find(
        (p) => p.id === primaryProvider || p.type === primaryProvider
      );
      const primaryType = primaryConfig?.type || primaryProvider;
      let primaryApiKey = '';
      if (primaryType === 'gemini') {
        primaryApiKey =
          process.env.GEMINI_LIVE_API_KEY ||
          resolveEffectiveApiKey('gemini', null, primaryConfig?.apiKey)
            .apiKey ||
          process.env.GEMINI_API_KEY ||
          '';
      } else {
        primaryApiKey =
          resolveEffectiveApiKey(primaryType, null, primaryConfig?.apiKey)
            .apiKey || '';
      }

      const effectiveProvider = primaryApiKey
        ? primaryType
        : fallbackChain[0]?.provider || primaryType;
      const effectiveApiKey = primaryApiKey || fallbackChain[0]?.apiKey || '';

      if (effectiveApiKey) {
        const scopes = await getUserScopes(auth.uid);
        return await runAgenticStreamingSession(messages, {
          apiKey: effectiveApiKey,
          provider: effectiveProvider,
          modelName:
            primaryModel ||
            (effectiveProvider === 'gemini'
              ? 'gemini-3.5-flash-lite'
              : effectiveProvider === 'openrouter'
                ? 'google/gemini-2.0-flash-001'
                : undefined),
          systemInstruction: systemPrompt,
          scopes,
          userId: auth.uid,
          maxIterations: Number(requestedMaxIterations) || 8,
          fallbackChain: fallbackChain.filter(
            (fb) => fb.provider !== effectiveProvider
          ),
          baseUrl: primaryConfig?.baseUrl,
        });
      }
    }

    let responseText = '';
    let answeredProvider = primaryProvider;
    let answeredModel = primaryModel;
    let agentExecutionMeta: any = null;
    const errors: string[] = [];

    const maxTokens = channel === 'voice' ? 350 : 1200;

    // 5. Execute through the fallback chain
    for (const providerId of chainProviderIds) {
      try {
        const providerConfig = dbProviders.find(
          (p) => p.id === providerId || p.type === providerId
        );
        const providerType = providerConfig?.type || providerId;

        // Resolve API Key
        let apiKey = '';
        if (providerType === 'gemini') {
          apiKey =
            process.env.GEMINI_LIVE_API_KEY ||
            resolveEffectiveApiKey('gemini', null, providerConfig?.apiKey)
              .apiKey ||
            process.env.GEMINI_API_KEY ||
            '';
        } else {
          apiKey =
            resolveEffectiveApiKey(providerType, null, providerConfig?.apiKey)
              .apiKey || '';
        }

        // ==========================================
        // PROVIDER: GOOGLE GEMINI
        // ==========================================
        if (providerType === 'gemini') {
          if (!apiKey) {
            errors.push('Gemini: API key missing');
            continue;
          }

          // ==========================================
          // AGENTIC TOOL-CALLING REASONING LOOP
          // ==========================================
          if (useAgenticLoop) {
            try {
              const scopes = await getUserScopes(auth.uid);
              const agentResult = await runCoFounderAgentLoop(messages, {
                apiKey,
                modelName:
                  primaryProvider === 'gemini' && primaryModel
                    ? primaryModel
                    : 'gemini-3.5-flash-lite',
                systemInstruction: systemPrompt,
                scopes,
                userId: auth.uid,
                maxIterations: Number(requestedMaxIterations) || 8,
              });

              if (agentResult.success && agentResult.responseText) {
                responseText = agentResult.responseText;
                answeredProvider = 'gemini';
                answeredModel = agentResult.modelUsed;
                agentExecutionMeta = {
                  toolCallsExecuted: agentResult.toolCallsExecuted,
                  steps: agentResult.steps,
                  iterations: agentResult.iterations,
                  pausedForApproval: agentResult.pausedForApproval,
                  pendingApproval: agentResult.pendingApproval,
                };
                break;
              }
            } catch (agentErr: any) {
              errors.push(`Gemini Agentic Loop: ${agentErr?.message}`);
              console.warn(
                '[Co-Founder Chat] Agentic loop failover to classic single-turn chat:',
                agentErr?.message
              );
            }
          }

          const genAI = new GoogleGenerativeAI(apiKey);

          // Gemini SDK strictly requires history to start with role 'user' and alternate user -> model
          const rawHistory = messages.slice(0, -1);
          const firstUserIdx = rawHistory.findIndex(
            (m: ChatHistoryItem) => m.sender === 'user'
          );
          const validHistory: Array<{
            role: 'user' | 'model';
            parts: [{ text: string }];
          }> = [];

          if (firstUserIdx !== -1) {
            let expectedRole: 'user' | 'model' = 'user';
            for (let i = firstUserIdx; i < rawHistory.length; i++) {
              const m = rawHistory[i];
              const role = m.sender === 'user' ? 'user' : 'model';
              if (role === expectedRole && m.text?.trim()) {
                validHistory.push({
                  role,
                  parts: [{ text: m.text.trim() }],
                });
                expectedRole = expectedRole === 'user' ? 'model' : 'user';
              }
            }
          }

          const candidateModels = [
            primaryProvider === 'gemini' && primaryModel
              ? primaryModel
              : 'gemini-3.5-flash-lite',
            'gemini-3.5-flash-lite',
            'gemini-flash-latest',
            'gemini-3.8-flash',
            'gemini-3.6-flash',
            'gemini-1.5-pro',
          ];

          // Deduplicate
          const uniqueModels = Array.from(new Set(candidateModels));

          for (const modelName of uniqueModels) {
            try {
              const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: maxTokens,
                },
              });

              const chat = model.startChat({ history: validHistory });
              const result = await chat.sendMessage(latest.text);
              const text = result.response.text();
              if (text) {
                responseText = text;
                answeredProvider = 'gemini';
                answeredModel = modelName;
                break;
              }
            } catch (geminiErr: any) {
              errors.push(`Gemini (${modelName}): ${geminiErr?.message}`);
              continue;
            }
          }

          if (responseText) break;
        }

        // ==========================================
        // PROVIDER: OPENROUTER GATEWAY
        // ==========================================
        else if (providerType === 'openrouter') {
          if (!apiKey) {
            errors.push('OpenRouter: API key missing');
            continue;
          }

          const openrouterModel =
            primaryProvider === 'openrouter' && primaryModel
              ? primaryModel
              : providerConfig?.models?.[0] || 'google/gemini-2.0-flash-001';

          // AGENTIC TOOL-CALLING REASONING LOOP (STEP 6.2/6.3)
          if (useAgenticLoop) {
            try {
              const scopes = await getUserScopes(auth.uid);
              const agentResult = await runCoFounderAgentLoop(messages, {
                apiKey,
                provider: 'openrouter',
                modelName: openrouterModel,
                systemInstruction: systemPrompt,
                scopes,
                userId: auth.uid,
                maxIterations: Number(requestedMaxIterations) || 8,
              });

              if (agentResult.success && agentResult.responseText) {
                responseText = agentResult.responseText;
                answeredProvider = 'openrouter';
                answeredModel = agentResult.modelUsed || openrouterModel;
                agentExecutionMeta = {
                  toolCallsExecuted: agentResult.toolCallsExecuted,
                  steps: agentResult.steps,
                  iterations: agentResult.iterations,
                  pausedForApproval: agentResult.pausedForApproval,
                  pendingApproval: agentResult.pendingApproval,
                };
                break;
              }
            } catch (agentErr: any) {
              errors.push(`OpenRouter Agentic Loop: ${agentErr?.message}`);
              console.warn(
                '[Co-Founder Chat] OpenRouter Agentic loop failover to single-turn:',
                agentErr?.message
              );
            }
          }

          // Single-turn fallback
          const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(0, -1).map((m: ChatHistoryItem) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: latest.text },
          ];

          const res = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://ruhvi.in',
                'X-Title': 'Ruhvi AI',
              },
              body: JSON.stringify({
                model: openrouterModel,
                messages: formattedMessages,
                temperature: 0.3,
                max_tokens: maxTokens,
              }),
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`OpenRouter (${res.status}): ${errText}`);
            continue;
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            responseText = text;
            answeredProvider = 'openrouter';
            answeredModel = openrouterModel;
            break;
          }
        }

        // ==========================================
        // PROVIDER: DEEPSEEK AI
        // ==========================================
        else if (providerType === 'deepseek') {
          if (!apiKey) {
            errors.push('DeepSeek: API key missing');
            continue;
          }

          const deepseekModel =
            primaryProvider === 'deepseek' && primaryModel
              ? primaryModel
              : providerConfig?.models?.[0] || 'deepseek-chat';

          // AGENTIC TOOL-CALLING REASONING LOOP (STEP 6.2/6.3)
          if (useAgenticLoop) {
            try {
              const scopes = await getUserScopes(auth.uid);
              const agentResult = await runCoFounderAgentLoop(messages, {
                apiKey,
                provider: 'deepseek',
                modelName: deepseekModel,
                systemInstruction: systemPrompt,
                scopes,
                userId: auth.uid,
                maxIterations: Number(requestedMaxIterations) || 8,
              });

              if (agentResult.success && agentResult.responseText) {
                responseText = agentResult.responseText;
                answeredProvider = 'deepseek';
                answeredModel = agentResult.modelUsed || deepseekModel;
                agentExecutionMeta = {
                  toolCallsExecuted: agentResult.toolCallsExecuted,
                  steps: agentResult.steps,
                  iterations: agentResult.iterations,
                  pausedForApproval: agentResult.pausedForApproval,
                  pendingApproval: agentResult.pendingApproval,
                };
                break;
              }
            } catch (agentErr: any) {
              errors.push(`DeepSeek Agentic Loop: ${agentErr?.message}`);
            }
          }

          const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(0, -1).map((m: ChatHistoryItem) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: latest.text },
          ];

          const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: deepseekModel,
              messages: formattedMessages,
              temperature: 0.3,
              max_tokens: maxTokens,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`DeepSeek (${res.status}): ${errText}`);
            continue;
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            responseText = text;
            answeredProvider = 'deepseek';
            answeredModel = deepseekModel;
            break;
          }
        }

        // ==========================================
        // PROVIDER: CUSTOM GATEWAY (OPENAI COMPATIBLE)
        // ==========================================
        else if (providerType === 'custom') {
          const rawBaseUrl =
            providerConfig?.baseUrl ||
            process.env.CUSTOM_GATEWAY_URL ||
            'http://localhost:11434/v1';

          const baseUrl = rawBaseUrl.replace(/\/$/, '');
          const endpoint = `${baseUrl}/chat/completions`;

          // SSRF protection for outbound external custom gateways
          // Allow localhost if explicitly configured for local models (e.g. Ollama/LMStudio)
          if (
            !baseUrl.includes('localhost') &&
            !baseUrl.includes('127.0.0.1')
          ) {
            try {
              await assertSafeOutboundUrl(endpoint);
            } catch (ssrfErr: any) {
              errors.push(`Custom Gateway SSRF: ${ssrfErr.message}`);
              continue;
            }
          }

          const customModel =
            primaryProvider === 'custom' && primaryModel
              ? primaryModel
              : providerConfig?.models?.[0] || 'auto/best-fast';

          let headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (apiKey && apiKey !== 'dummy-key') {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          if (providerConfig?.customHeaders) {
            try {
              const parsed = JSON.parse(providerConfig.customHeaders);
              headers = { ...headers, ...parsed };
            } catch {}
          }

          // AGENTIC TOOL-CALLING REASONING LOOP (STEP 6.2/6.3)
          if (useAgenticLoop) {
            try {
              const scopes = await getUserScopes(auth.uid);
              const agentResult = await runCoFounderAgentLoop(messages, {
                apiKey,
                provider: 'custom',
                modelName: customModel,
                baseUrl,
                customHeaders: providerConfig?.customHeaders
                  ? JSON.parse(providerConfig.customHeaders)
                  : undefined,
                systemInstruction: systemPrompt,
                scopes,
                userId: auth.uid,
                maxIterations: Number(requestedMaxIterations) || 8,
              });

              if (agentResult.success && agentResult.responseText) {
                responseText = agentResult.responseText;
                answeredProvider = 'custom';
                answeredModel = agentResult.modelUsed || customModel;
                agentExecutionMeta = {
                  toolCallsExecuted: agentResult.toolCallsExecuted,
                  steps: agentResult.steps,
                  iterations: agentResult.iterations,
                  pausedForApproval: agentResult.pausedForApproval,
                  pendingApproval: agentResult.pendingApproval,
                };
                break;
              }
            } catch (agentErr: any) {
              errors.push(`Custom Gateway Agentic Loop: ${agentErr?.message}`);
            }
          }

          const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(0, -1).map((m: ChatHistoryItem) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: latest.text },
          ];

          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: customModel,
              messages: formattedMessages,
              temperature: 0.3,
              max_tokens: maxTokens,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`Custom Gateway (${res.status}): ${errText}`);
            continue;
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            responseText = text;
            answeredProvider = 'custom';
            answeredModel = customModel;
            break;
          }
        }

        // ==========================================
        // PROVIDER: OPENAI
        // ==========================================
        else if (providerType === 'openai') {
          if (!apiKey) {
            errors.push('OpenAI: API key missing');
            continue;
          }

          const openaiModel =
            primaryProvider === 'openai' && primaryModel
              ? primaryModel
              : providerConfig?.models?.[0] || 'gpt-4o-mini';

          // AGENTIC TOOL-CALLING REASONING LOOP (STEP 6.2/6.3)
          if (useAgenticLoop) {
            try {
              const scopes = await getUserScopes(auth.uid);
              const agentResult = await runCoFounderAgentLoop(messages, {
                apiKey,
                provider: 'openai',
                modelName: openaiModel,
                systemInstruction: systemPrompt,
                scopes,
                userId: auth.uid,
                maxIterations: Number(requestedMaxIterations) || 8,
              });

              if (agentResult.success && agentResult.responseText) {
                responseText = agentResult.responseText;
                answeredProvider = 'openai';
                answeredModel = agentResult.modelUsed || openaiModel;
                agentExecutionMeta = {
                  toolCallsExecuted: agentResult.toolCallsExecuted,
                  steps: agentResult.steps,
                  iterations: agentResult.iterations,
                  pausedForApproval: agentResult.pausedForApproval,
                  pendingApproval: agentResult.pendingApproval,
                };
                break;
              }
            } catch (agentErr: any) {
              errors.push(`OpenAI Agentic Loop: ${agentErr?.message}`);
            }
          }

          const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(0, -1).map((m: ChatHistoryItem) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: latest.text },
          ];

          const res = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: openaiModel,
                messages: formattedMessages,
                temperature: 0.3,
                max_tokens: maxTokens,
              }),
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`OpenAI (${res.status}): ${errText}`);
            continue;
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            responseText = text;
            answeredProvider = 'openai';
            answeredModel = openaiModel;
            break;
          }
        }

        // ==========================================
        // PROVIDER: ANTHROPIC CLAUDE
        // ==========================================
        else if (providerType === 'anthropic') {
          if (!apiKey) {
            errors.push('Anthropic: API key missing');
            continue;
          }

          const anthropicModel =
            primaryProvider === 'anthropic' && primaryModel
              ? primaryModel
              : providerConfig?.models?.[0] || 'claude-3-5-sonnet-20241022';

          const formattedMessages = [
            ...messages.slice(0, -1).map((m: ChatHistoryItem) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: latest.text },
          ];

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: anthropicModel,
              system: systemPrompt,
              messages: formattedMessages,
              max_tokens: maxTokens,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`Anthropic (${res.status}): ${errText}`);
            continue;
          }

          const data = await res.json();
          const text = data.content?.[0]?.text?.trim();
          if (text) {
            responseText = text;
            answeredProvider = 'anthropic';
            answeredModel = anthropicModel;
            break;
          }
        }
      } catch (providerErr: any) {
        errors.push(`${providerId}: ${providerErr?.message}`);
        console.warn(
          `[Co-Founder Chat] Provider ${providerId} failover:`,
          providerErr?.message
        );
        continue;
      }
    }

    if (!responseText) {
      console.error('[Co-Founder Multi-Provider Exhaustion]', errors);
      return NextResponse.json(
        {
          error: 'All configured AI providers failed to generate a response',
          details: errors,
          response:
            'I encountered connectivity issues reaching my cognitive providers. Please check that at least one provider (Gemini, DeepSeek, Custom Gateway) is active in the AI Control Center.',
        },
        { status: 502 }
      );
    }

    const rateHeaders = createRateLimitHeaders(rateLimitCheck.result);

    return NextResponse.json(
      {
        response: responseText,
        provider: answeredProvider,
        model: answeredModel,
        fallbackUsed: answeredProvider !== primaryProvider,
        browsingResult: browsingResult || undefined,
        timestamp: Date.now(),
        ...(agentExecutionMeta ? { agent: agentExecutionMeta } : {}),
      },
      {
        headers: rateHeaders,
      }
    );
  } catch (error: any) {
    console.error('[Co-Founder Chat Error]', error);
    return NextResponse.json(
      {
        error: error?.message || 'Co-Founder service temporarily unavailable',
        response: `I encountered an issue processing that: ${error?.message || 'Please try again.'}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getActiveProactiveSignals } =
      await import('@/lib/ai/co-founder/proactive');
    const { getServiceClient } = await import('@/lib/supabase/service');
    const supabase = getServiceClient();

    // Fetch real-time operational signals
    const [ticketsRes, lowStockRes, rawSignals] = await Promise.all([
      supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, priority, created_at')
        .in('status', ['open', 'pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('is_active', true)
        .lte('stock_quantity', 5)
        .limit(5),
      getActiveProactiveSignals(5),
    ]);

    const openTickets = ticketsRes.data || [];
    const lowStockItems = lowStockRes.data || [];
    const signals = rawSignals || [];

    const alerts: Array<{
      id: string;
      type: 'ticket' | 'stock' | 'signal';
      title: string;
      message: string;
      severity: 'high' | 'critical' | 'medium';
    }> = [];

    if (openTickets.length > 0) {
      alerts.push({
        id: `ticket_${openTickets[0].id}`,
        type: 'ticket',
        title: 'Pending Support Ticket Alert',
        message: `${openTickets.length}টি পেন্ডিং সাপোর্ট টিকিট পর্যালোচনার অপেক্ষায়। (${openTickets.map((t) => `#${t.ticket_number || t.id.slice(0, 8)} - ${t.title}`).join(', ')})`,
        severity: openTickets.some(
          (t) => t.priority === 'urgent' || t.priority === 'high'
        )
          ? 'critical'
          : 'high',
      });
    }

    if (lowStockItems.length > 0) {
      alerts.push({
        id: `stock_${lowStockItems[0].id}`,
        type: 'stock',
        title: 'Low Inventory Alert',
        message: `${lowStockItems.length}টি প্রডাক্টের স্টক আশঙ্কাজনকভাবে কম (≤ 5 units): ${lowStockItems.map((p) => p.name).join(', ')}`,
        severity: 'high',
      });
    }

    signals.forEach((s) => {
      alerts.push({
        id: s.id || s.fingerprint,
        type: 'signal',
        title: s.title,
        message: s.summary,
        severity: s.severity === 'critical' ? 'critical' : 'medium',
      });
    });

    let proactiveMessage = '';
    if (alerts.length > 0) {
      const topAlerts = alerts.slice(0, 3);
      proactiveMessage =
        `🔔 **প্রোঅ্যাকটিভ আপডেট (Ruhvi AI Co-Founder):**\n` +
        topAlerts.map((a) => `• **${a.title}**: ${a.message}`).join('\n\n') +
        `\n\nআপনি চাইলে এখনই যেকোনো অ্যাকশন নিতে বা বিস্তারিত দেখতে আমাকে নির্দেশ দিন।`;
    }

    return NextResponse.json({
      success: true,
      hasAlerts: alerts.length > 0,
      alerts,
      proactiveMessage,
      openTicketsCount: openTickets.length,
      lowStockCount: lowStockItems.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[Co-Founder Proactive Alert Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to scan proactive alerts' },
      { status: 500 }
    );
  }
}
