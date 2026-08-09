import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

export interface AIProvider {
  /**
   * Initialize the provider with API keys/config
   */
  initialize(apiKey: string): void;

  /**
   * Generates structured product content and SEO metadata based on a prompt
   * @param prompt The prompt describing the product
   * @param modelName The specific model to use (e.g. gemini-2.5-flash)
   * @returns An object containing the parsed JSON content and usage metadata
   */
  generateStructuredProductContent(
    prompt: string,
    modelName: string
  ): Promise<{
    content: Record<string, any>;
    usage: { tokens: number; cost: number };
  }>;

  /**
   * Generates content while allowing the model to call tools
   */
  generateWithTools?(
    prompt: string,
    modelName: string,
    tools: import('./tools/index').AITool[]
  ): Promise<{
    content: string;
    toolCalls?: any[];
    usage: { tokens: number; cost: number };
  }>;
}

// Global load balancing & latency tracking state
let globalRoundRobinCounter = 0;
const latencyTracker = new Map<
  string,
  { avgLatencyMs: number; failCount: number }
>();

import { resolveEffectiveApiKey } from './keys';

export async function getAIProvider(
  providerId: string,
  modelName: string,
  providerConfig?: any
): Promise<{ provider: AIProvider; model: string }> {
  const type =
    providerConfig?.type || (providerId === 'gemini' ? 'gemini' : providerId);
  const resolved = resolveEffectiveApiKey(type, providerConfig?.apiKey, null);
  let apiKey = resolved.apiKey;

  if (!apiKey) {
    throw new Error(
      `No API key configured for provider '${providerId}' (${type}). Please configure an API key in Admin AI Control Center or set the ${type.toUpperCase()}_API_KEY environment variable.`
    );
  }

  let activeProvider: AIProvider;

  if (type === 'gemini') {
    const { GeminiProvider } = await import('./providers/gemini');
    activeProvider = new GeminiProvider() as AIProvider;
  } else if (type === 'openai') {
    const { OpenAIProvider } = await import('./providers/openai');
    activeProvider = new OpenAIProvider() as AIProvider;
  } else if (type === 'anthropic') {
    const { AnthropicProvider } = await import('./providers/anthropic');
    activeProvider = new AnthropicProvider() as AIProvider;
  } else if (type === 'openrouter') {
    const { OpenRouterProvider } = await import('./providers/openrouter');
    activeProvider = new OpenRouterProvider() as AIProvider;
  } else if (type === 'custom') {
    const { CustomProvider } = await import('./providers/custom');
    activeProvider = new CustomProvider(providerConfig || {}) as AIProvider;
  } else if (type === 'deepseek') {
    const { DeepSeekProvider } = await import('./providers/deepseek');
    activeProvider = new DeepSeekProvider() as AIProvider;
  } else {
    throw new Error(`Provider type ${type} is not implemented yet.`);
  }

  activeProvider.initialize(apiKey);
  return { provider: activeProvider, model: modelName };
}

import { logFailureDiagnostic } from './diagnostics';

export async function generateAIContent(
  featureKey: string,
  prompt: string
): Promise<Record<string, any>> {
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

  const { data: featuresData } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'ai_features')
    .single();
  const { data: providersData } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'ai_providers')
    .single();

  let featureConfig = featuresData?.value?.[featureKey];
  if (!featureConfig || !featureConfig.enabled) {
    throw new Error(`AI Feature '${featureKey}' is currently disabled.`);
  }

  // Fetch Global Security Config
  const { data: globalData } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'ai_global')
    .single();
  const globalConfig = globalData?.value || {};

  // PII Redaction
  if (globalConfig.enablePiiRedaction) {
    prompt = prompt.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      '[EMAIL]'
    );
    prompt = prompt.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  }

  // Rate Limiting Enforcement (Guest, Logged-in User, Staff, Manager, Admin)
  let userRole = 'guest';
  let userId = 'anonymous';

  try {
    const sessionCookie = cookieStore.get('__session')?.value;

    if (sessionCookie) {
      const decodedToken = decodeJwt(sessionCookie);
      userId = decodedToken.sub || 'anonymous';

      if (userId !== 'anonymous') {
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('firebase_uid', userId)
          .maybeSingle();
        if (userProfile?.role) {
          userRole = userProfile.role;
        } else {
          userRole = 'user';
        }
        // Primary admin override
        if (decodedToken.email === 'ruhvi.main@gmail.com') userRole = 'admin';
      }
    }
  } catch (e) {
    userRole = 'guest';
  }

  if (globalConfig.enableRateLimiting) {
    try {
      // Find limits with fallbacks for role names ('user' or 'customer')
      const roleKey =
        userRole === 'customer' || userRole === 'user'
          ? globalConfig.rateLimits?.['user']
            ? 'user'
            : 'customer'
          : userRole;
      const limits =
        (globalConfig.rateLimits && globalConfig.rateLimits[roleKey]) ||
        (userRole === 'admin'
          ? { rpm: 60, daily: 1000, tokens: 500000, maxPromptLength: 15000 }
          : userRole === 'manager'
            ? { rpm: 30, daily: 400, tokens: 200000, maxPromptLength: 10000 }
            : userRole === 'staff'
              ? { rpm: 20, daily: 200, tokens: 100000, maxPromptLength: 8000 }
              : userRole === 'user' || userRole === 'customer'
                ? { rpm: 10, daily: 100, tokens: 25000, maxPromptLength: 4000 }
                : { rpm: 5, daily: 30, tokens: 10000, maxPromptLength: 2000 }); // Guest default

      // Max Prompt Length Check
      if (
        limits.maxPromptLength &&
        limits.maxPromptLength > 0 &&
        prompt.length > limits.maxPromptLength
      ) {
        throw new Error(
          `Prompt length exceeds allowed limit of ${limits.maxPromptLength} characters for role '${userRole}'.`
        );
      }

      if (limits.rpm > 0 || limits.daily > 0 || limits.tokens > 0) {
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayISO = startOfDay.toISOString();

        // Count RPM
        if (limits.rpm > 0) {
          const { count: rpmCount } = await supabaseAdmin
            .from('ai_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_identifier', userId)
            .gte('created_at', oneMinuteAgo);

          if ((rpmCount || 0) >= limits.rpm) {
            // Log failure diagnostic with 24h TTL
            await logFailureDiagnostic({
              feature: featureKey,
              primary_provider: featureConfig.provider || 'unknown',
              failed_provider: featureConfig.provider || 'unknown',
              model: featureConfig.model,
              error_message: `Rate limit exceeded for role ${userRole}. Max ${limits.rpm} requests per minute.`,
              error_type: 'RATE_LIMIT_EXCEEDED',
              user_identifier: userId,
              user_role: userRole,
              recovery_status: 'exhausted',
            });
            throw new Error(
              `Rate limit exceeded for role ${userRole}. Max ${limits.rpm} requests per minute.`
            );
          }
        }

        // Count Daily & Tokens
        if (limits.daily > 0 || limits.tokens > 0) {
          const { data: dailyLogs } = await supabaseAdmin
            .from('ai_logs')
            .select('tokens_used')
            .eq('user_identifier', userId)
            .gte('created_at', startOfDayISO);

          const dailyCount = dailyLogs?.length || 0;
          const dailyTokens =
            dailyLogs?.reduce((acc, log) => acc + (log.tokens_used || 0), 0) ||
            0;

          if (limits.daily > 0 && dailyCount >= limits.daily) {
            throw new Error(
              `Daily quota exceeded for role ${userRole}. Max ${limits.daily} requests per day.`
            );
          }
          if (limits.tokens > 0 && dailyTokens >= limits.tokens) {
            throw new Error(
              `Token limit exceeded for role ${userRole}. Max ${limits.tokens} tokens per day.`
            );
          }
        }
      }
    } catch (e: any) {
      if (
        e.message.includes('Rate limit exceeded') ||
        e.message.includes('quota exceeded') ||
        e.message.includes('Token limit exceeded') ||
        e.message.includes('Prompt length exceeds')
      ) {
        throw e;
      }
      console.error('[AI Engine] Rate limit checking error:', e);
    }
  }

  let providersConfig: any[] = Array.isArray(providersData?.value)
    ? providersData.value
    : [];

  // Create our fallback chain starting with the feature's primary provider
  const primaryProviderId = featureConfig.provider;
  const primaryModel = featureConfig.model;

  // Construct the execution chain
  const executionChain: Array<{ id: string; model: string; config: any }> = [];
  const errors: string[] = [];

  const primaryConfig = providersConfig.find((p) => p.id === primaryProviderId);
  if (primaryConfig && primaryConfig.status !== 'offline') {
    executionChain.push({
      id: primaryProviderId,
      model: primaryModel,
      config: primaryConfig,
    });
  }

  // Priority fallback chain for multi-provider resilience
  const fallbackProviders = providersConfig
    .filter(
      (p) => p.isEnabled && p.status !== 'offline' && p.id !== primaryProviderId
    )
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  for (const fp of fallbackProviders) {
    const fpModel =
      fp.models && fp.models.length > 0
        ? fp.models[0]
        : fp.type === 'gemini'
          ? 'gemini-2.5-flash'
          : fp.type === 'custom'
            ? 'auto/best-fast'
            : fp.type === 'deepseek'
              ? 'deepseek-chat'
              : 'gpt-4o-mini';
    executionChain.push({ id: fp.id, model: fpModel, config: fp });
  }

  // Load Balancing & Routing Strategy Logic
  const routingStrategy = globalConfig.routingStrategy || 'priority';

  if (executionChain.length > 1) {
    if (routingStrategy === 'round_robin') {
      const startIndex = globalRoundRobinCounter % executionChain.length;
      globalRoundRobinCounter = (globalRoundRobinCounter + 1) % 1000000;

      const rotated = executionChain
        .slice(startIndex)
        .concat(executionChain.slice(0, startIndex));
      executionChain.length = 0;
      executionChain.push(...rotated);
      console.log(
        `[AI Engine] Strategy: Round Robin (Start Index: ${startIndex}, Provider: ${executionChain[0].id})`
      );
    } else if (routingStrategy === 'best_responsive') {
      executionChain.sort((a, b) => {
        const statsA = latencyTracker.get(a.id) || {
          avgLatencyMs: 9999,
          failCount: 0,
        };
        const statsB = latencyTracker.get(b.id) || {
          avgLatencyMs: 9999,
          failCount: 0,
        };

        const scoreA = statsA.avgLatencyMs + statsA.failCount * 5000;
        const scoreB = statsB.avgLatencyMs + statsB.failCount * 5000;

        return scoreA - scoreB;
      });
      console.log(
        `[AI Engine] Strategy: Best Responsive (Fastest Provider: ${executionChain[0].id})`
      );
    }
  }

  if (executionChain.length === 0) {
    await logFailureDiagnostic({
      feature: featureKey,
      primary_provider: primaryProviderId || 'none',
      failed_provider: primaryProviderId || 'none',
      error_message: `No available AI providers online for feature '${featureKey}'.`,
      error_type: 'PROVIDER_DOWN',
      user_identifier: userId,
      user_role: userRole,
      recovery_status: 'exhausted',
    });
    throw new Error(
      `No available AI providers online for feature '${featureKey}'.`
    );
  }

  let attemptCount = 0;
  let firstFailedProvider: string | null = null;
  let initialFailureError: string | null = null;

  for (const chainItem of executionChain) {
    attemptCount++;
    const startTime = Date.now();
    try {
      console.log(
        `[AI Engine] Attempting generation with provider: ${chainItem.id} (Model: ${chainItem.model}, Attempt: ${attemptCount})`
      );
      const { provider: aiProvider, model: modelName } = await getAIProvider(
        chainItem.id,
        chainItem.model,
        chainItem.config
      );

      const { content, usage } =
        await aiProvider.generateStructuredProductContent(prompt, modelName);
      const executionTime = Date.now() - startTime;

      // Update latency tracker
      const prevStats = latencyTracker.get(chainItem.id) || {
        avgLatencyMs: executionTime,
        failCount: 0,
      };
      const newAvg =
        prevStats.avgLatencyMs === 9999
          ? executionTime
          : Math.round(prevStats.avgLatencyMs * 0.7 + executionTime * 0.3);
      latencyTracker.set(chainItem.id, {
        avgLatencyMs: newAvg,
        failCount: Math.max(0, prevStats.failCount - 1),
      });

      // If this was a fallback recovery after a primary failure, log the recovery diagnostic with 24h TTL
      if (firstFailedProvider && firstFailedProvider !== chainItem.id) {
        await logFailureDiagnostic({
          feature: featureKey,
          primary_provider: primaryProviderId,
          failed_provider: firstFailedProvider,
          fallback_provider: chainItem.id,
          model: modelName,
          error_message: `Primary provider '${firstFailedProvider}' failed (${initialFailureError}). Automatically recovered via fallback provider '${chainItem.id}'.`,
          error_type: 'RECOVERED_VIA_FALLBACK',
          user_identifier: userId,
          user_role: userRole,
          latency_ms: executionTime,
          attempt_number: attemptCount,
          recovery_status: 'recovered',
          metadata: {
            tokens: usage.tokens,
            cost: usage.cost,
            recoveredAt: new Date().toISOString(),
          },
        });
      }

      await supabaseAdmin.from('ai_logs').insert([
        {
          provider: chainItem.id,
          model: modelName,
          feature: featureKey,
          tokens_used: usage.tokens,
          estimated_cost: usage.cost,
          status: 'success',
          user_identifier: userId,
        },
      ]);

      return content;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(
        `[AI Engine] Generation failed for ${chainItem.id}:`,
        error
      );
      errors.push(`${chainItem.id}: ${error.message}`);

      if (!firstFailedProvider) {
        firstFailedProvider = chainItem.id;
        initialFailureError = error.message;
      }

      // Track failure penalty
      const prevStats = latencyTracker.get(chainItem.id) || {
        avgLatencyMs: 5000,
        failCount: 0,
      };
      latencyTracker.set(chainItem.id, {
        avgLatencyMs: prevStats.avgLatencyMs,
        failCount: prevStats.failCount + 1,
      });

      const isLastAttempt = attemptCount === executionChain.length;
      const errorType = error.message?.includes('Rate limit')
        ? 'RATE_LIMIT_EXCEEDED'
        : error.message?.includes('API key') || error.message?.includes('401')
          ? 'AUTH_ERROR'
          : error.message?.includes('timeout') || executionTime > 15000
            ? 'TIMEOUT'
            : 'GENERAL_FAILURE';

      // Log temporary failure diagnostic (24h TTL)
      await logFailureDiagnostic({
        feature: featureKey,
        primary_provider: primaryProviderId,
        failed_provider: chainItem.id,
        fallback_provider: isLastAttempt
          ? undefined
          : executionChain[attemptCount]?.id,
        model: chainItem.model,
        error_message: error.message || 'Unknown provider error',
        error_type: errorType,
        stack_trace: error.stack,
        user_identifier: userId,
        user_role: userRole,
        latency_ms: executionTime,
        attempt_number: attemptCount,
        recovery_status: isLastAttempt ? 'exhausted' : 'retrying',
      });

      await supabaseAdmin.from('ai_logs').insert([
        {
          provider: chainItem.id,
          model: chainItem.model,
          feature: featureKey,
          status: 'failed',
          error_message: error.message,
          user_identifier: userId,
        },
      ]);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `AI Generation failed across configured providers. Errors: ${errors.join(' | ')}`
    );
  }

  throw new Error(
    'AI Generation failed: No configured providers available in the fallback chain.'
  );
}
