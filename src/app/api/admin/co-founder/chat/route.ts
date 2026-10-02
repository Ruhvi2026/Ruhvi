import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCoFounderSystemPrompt } from '@/lib/ai/co-founder/brain';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { resolveEffectiveApiKey } from '@/lib/ai/keys';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

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
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const latest = messages[messages.length - 1];
    if (!latest?.text) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    // 1. Synthesize prioritized Co-Founder System Prompt
    const systemPrompt = await getCoFounderSystemPrompt({
      userId: auth.uid,
      userRole: auth.role || 'founder',
      adminName: 'Founder',
      channel: channel as 'voice' | 'text',
      sessionGoal: latest.text,
    });

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

    let responseText = '';
    let answeredProvider = primaryProvider;
    let answeredModel = primaryModel;
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

    return NextResponse.json({
      response: responseText,
      provider: answeredProvider,
      model: answeredModel,
      fallbackUsed: answeredProvider !== primaryProvider,
      timestamp: Date.now(),
    });
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
