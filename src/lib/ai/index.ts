/**
 * AI Orchestration Engine
 *
 * The single, centralized AI request handler used by ALL callers:
 *   - /api/chat (customer chatbot)
 *   - /api/admin/ai/generate (product AI generation)
 *   - /api/admin/ai/playground (admin playground)
 *   - Any future AI feature
 *
 * Architecture:
 *   Two-level routing:
 *   Level 1: Provider selection (priority/round-robin/best_responsive)
 *   Level 2: Credential selection within a provider (priority-based with health tracking)
 *
 * Features:
 *   - Multi-credential per provider with priority-based failover
 *   - Centralized error classification (no unnecessary credential rotation for bad requests)
 *   - Atomic health state transitions (concurrency-safe via DB optimistic locking)
 *   - Model-level fallback on MODEL_ERROR
 *   - Infinite-loop prevention via visited-provider/credential sets
 *   - Max attempt limits (configurable)
 *   - Structured observability logs
 *   - Full backward compatibility with legacy single-apiKey providers
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

// ── Sub-modules ────────────────────────────────────────────────────────────
import { resolveEffectiveApiKey } from './keys';
import { logFailureDiagnostic } from './diagnostics';
import {
  classifyError,
  getFailoverActionDescription,
} from './error-classifier';
import {
  getHealthyCredentials,
  getCredentialKey,
  markCredentialRateLimited,
  markCredentialQuotaExhausted,
  markCredentialInvalid,
  markCredentialSuccess,
  incrementCredentialRequests,
  hasCredentials,
} from './credentials';
import {
  getDefaultModel,
  getModelFallback,
  markModelUnavailable,
  markModelActive,
} from './model-health';

// ── Provider Interface ─────────────────────────────────────────────────────
export interface AIProvider {
  /**
   * Initialize the provider with an API key/config.
   */
  initialize(apiKey: string): void;

  /**
   * Generates structured product content and SEO metadata.
   */
  generateStructuredProductContent(
    prompt: string,
    modelName: string
  ): Promise<{
    content: Record<string, any>;
    usage: { tokens: number; cost: number };
  }>;

  /**
   * Generates content with tool/function calling support.
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

// ── Global Load Balancing State ────────────────────────────────────────────
// NOTE: In serverless environments these are per-instance but still provide
// meaningful round-robin behavior within a single instance's lifetime.
let globalRoundRobinCounter = 0;
const latencyTracker = new Map<
  string,
  { avgLatencyMs: number; failCount: number }
>();

// ── Provider Factory ───────────────────────────────────────────────────────

/**
 * Instantiate and initialize an AI provider with the given API key.
 * This function is kept provider-agnostic — adding new providers
 * requires only a new branch here.
 */
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

// ── Supabase Admin Client Factory ──────────────────────────────────────────

async function createAdminClientFromCookies() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

// ── Correlation ID Generator ───────────────────────────────────────────────

function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── Rate Limit Check ───────────────────────────────────────────────────────

async function enforceRateLimit(
  supabaseAdmin: any,
  globalConfig: any,
  userId: string,
  userRole: string,
  featureKey: string,
  primaryProviderId: string,
  primaryModel: string,
  prompt: string
): Promise<void> {
  if (!globalConfig.enableRateLimiting) return;

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
            : { rpm: 5, daily: 30, tokens: 10000, maxPromptLength: 2000 });

  if (limits.maxPromptLength > 0 && prompt.length > limits.maxPromptLength) {
    throw new Error(
      `Prompt length exceeds allowed limit of ${limits.maxPromptLength} characters for role '${userRole}'.`
    );
  }

  if (limits.rpm > 0 || limits.daily > 0 || limits.tokens > 0) {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    if (limits.rpm > 0) {
      const { count: rpmCount } = await supabaseAdmin
        .from('ai_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_identifier', userId)
        .gte('created_at', oneMinuteAgo);

      if ((rpmCount || 0) >= limits.rpm) {
        await logFailureDiagnostic({
          feature: featureKey,
          primary_provider: primaryProviderId || 'unknown',
          failed_provider: primaryProviderId || 'unknown',
          model: primaryModel,
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

    if (limits.daily > 0 || limits.tokens > 0) {
      const { data: dailyLogs } = await supabaseAdmin
        .from('ai_logs')
        .select('tokens_used')
        .eq('user_identifier', userId)
        .gte('created_at', startOfDayISO);

      const dailyCount = dailyLogs?.length || 0;
      const dailyTokens =
        dailyLogs?.reduce(
          (acc: number, log: any) => acc + (log.tokens_used || 0),
          0
        ) || 0;

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
}

// ── Main Orchestration Function ────────────────────────────────────────────

/**
 * Generate AI content for a feature using the full routing engine.
 *
 * Routing flow:
 *   1. Load feature config (provider, model)
 *   2. Apply security/rate-limiting
 *   3. Build provider execution chain (respects routing strategy)
 *   4. For each provider:
 *      a. Load healthy credentials (new multi-credential system)
 *      b. Fallback to legacy apiKey if no credentials exist
 *      c. For each credential: attempt generation
 *      d. On success: return result
 *      e. On error: classify → decide action (cooldown/invalid/next/fail)
 *   5. On model error: try next active model within same provider
 *   6. Track visited providers/credentials to prevent loops
 *   7. Respect max attempt limits
 */
export async function generateAIContent(
  featureKey: string,
  prompt: string
): Promise<Record<string, any>> {
  const correlationId = generateCorrelationId();
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

  console.log(
    `[AI_ROUTING_REQUEST] correlationId=${correlationId} feature=${featureKey}`
  );

  // ── 1. Load Settings ─────────────────────────────────────────────────────
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
  const { data: globalData } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'ai_global')
    .single();

  const featureConfig = featuresData?.value?.[featureKey];
  if (!featureConfig || !featureConfig.enabled) {
    throw new Error(`AI Feature '${featureKey}' is currently disabled.`);
  }

  const globalConfig = globalData?.value || {};

  // ── 2. PII Redaction ─────────────────────────────────────────────────────
  if (globalConfig.enablePiiRedaction) {
    prompt = prompt.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      '[EMAIL]'
    );
    prompt = prompt.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  }

  // ── 3. User Identity & Rate Limiting ─────────────────────────────────────
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
        userRole = userProfile?.role || 'user';
        if (decodedToken.email === 'ruhvi.main@gmail.com') userRole = 'admin';
      }
    }
  } catch (e) {
    userRole = 'guest';
  }

  try {
    await enforceRateLimit(
      supabaseAdmin,
      globalConfig,
      userId,
      userRole,
      featureKey,
      featureConfig.provider,
      featureConfig.model,
      prompt
    );
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

  // ── 4. Build Provider Execution Chain ────────────────────────────────────
  const providersConfig: any[] = Array.isArray(providersData?.value)
    ? providersData.value
    : [];
  const primaryProviderId = featureConfig.provider;
  const primaryModel = featureConfig.model;

  const executionChain: Array<{ id: string; model: string; config: any }> = [];

  const primaryConfig = providersConfig.find((p) => p.id === primaryProviderId);
  if (primaryConfig && primaryConfig.status !== 'offline') {
    executionChain.push({
      id: primaryProviderId,
      model: primaryModel,
      config: primaryConfig,
    });
  }

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

  // ── 5. Apply Routing Strategy ─────────────────────────────────────────────
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
        return (
          statsA.avgLatencyMs +
          statsA.failCount * 5000 -
          (statsB.avgLatencyMs + statsB.failCount * 5000)
        );
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

  // ── 6. Max Attempt Limits ─────────────────────────────────────────────────
  const maxCredentialAttempts = Number(globalConfig.maxCredentialAttempts) || 3;
  const maxProviderAttempts = Number(globalConfig.maxProviderAttempts) || 3;
  const maxTotalAttempts = Number(globalConfig.maxTotalAttempts) || 5;

  // ── 7. Two-Level Routing Loop ─────────────────────────────────────────────
  const visitedCredentials = new Set<string>();
  const visitedProviders = new Set<string>();
  const errors: string[] = [];

  let totalAttempts = 0;
  let providerAttempts = 0;
  let firstFailedProvider: string | null = null;
  let initialFailureError: string | null = null;

  for (const chainItem of executionChain) {
    if (visitedProviders.has(chainItem.id)) continue;
    if (providerAttempts >= maxProviderAttempts) break;

    visitedProviders.add(chainItem.id);
    providerAttempts++;

    console.log(
      `[AI_PROVIDER_SELECTED] correlationId=${correlationId} provider=${chainItem.id}`
    );

    // ── Determine model for this provider ─────────────────────────────────
    // Try to get the configured default model from health records first
    let currentModel = chainItem.model;
    try {
      const defaultModelRecord = await getDefaultModel(
        chainItem.id,
        supabaseAdmin
      );
      if (defaultModelRecord) {
        currentModel = defaultModelRecord.model_id;
      }
    } catch {
      // If model health table not yet populated, use config model
    }

    // ── Load credentials for this provider ────────────────────────────────
    const useMultiCredential = await hasCredentials(
      chainItem.id,
      supabaseAdmin
    );

    if (useMultiCredential) {
      // NEW: Multi-credential routing
      const credentials = await getHealthyCredentials(
        chainItem.id,
        supabaseAdmin
      );

      if (credentials.length === 0) {
        errors.push(`${chainItem.id}: No healthy credentials available`);
        console.log(
          `[AI_PROVIDER_SKIPPED] correlationId=${correlationId} provider=${chainItem.id} reason=no_healthy_credentials`
        );
        if (!firstFailedProvider) {
          firstFailedProvider = chainItem.id;
          initialFailureError = 'No healthy credentials available';
        }
        continue; // Try next provider
      }

      let credentialAttempts = 0;
      let modelFallbackTriggered = false;
      let currentModelForProvider = currentModel;

      // Model-level outer loop: try current model, then fallback models
      while (true) {
        let modelSucceeded = false;

        for (const credential of credentials) {
          if (visitedCredentials.has(credential.id)) continue;
          if (credentialAttempts >= maxCredentialAttempts) break;
          if (totalAttempts >= maxTotalAttempts) break;

          visitedCredentials.add(credential.id);
          credentialAttempts++;
          totalAttempts++;

          const apiKey = await getCredentialKey(credential.id, supabaseAdmin);
          if (!apiKey) {
            console.warn(
              `[AI_CREDENTIAL_SKIPPED] credential=${credential.id} reason=no_key`
            );
            continue;
          }

          console.log(
            `[AI_CREDENTIAL_SELECTED] correlationId=${correlationId} provider=${chainItem.id} credential=${credential.id} (${credential.display_name}) priority=${credential.priority} model=${currentModelForProvider}`
          );

          await incrementCredentialRequests(credential.id, supabaseAdmin);

          const startTime = Date.now();
          try {
            // Initialize provider with this credential's key
            let activeProvider: AIProvider;
            const type = chainItem.config?.type || chainItem.id;

            if (type === 'gemini') {
              const { GeminiProvider } = await import('./providers/gemini');
              activeProvider = new GeminiProvider() as AIProvider;
            } else if (type === 'openai') {
              const { OpenAIProvider } = await import('./providers/openai');
              activeProvider = new OpenAIProvider() as AIProvider;
            } else if (type === 'anthropic') {
              const { AnthropicProvider } =
                await import('./providers/anthropic');
              activeProvider = new AnthropicProvider() as AIProvider;
            } else if (type === 'openrouter') {
              const { OpenRouterProvider } =
                await import('./providers/openrouter');
              activeProvider = new OpenRouterProvider() as AIProvider;
            } else if (type === 'custom') {
              const { CustomProvider } = await import('./providers/custom');
              activeProvider = new CustomProvider(
                chainItem.config || {}
              ) as AIProvider;
            } else if (type === 'deepseek') {
              const { DeepSeekProvider } = await import('./providers/deepseek');
              activeProvider = new DeepSeekProvider() as AIProvider;
            } else {
              throw new Error(`Provider type ${type} is not implemented.`);
            }

            activeProvider.initialize(apiKey);
            const { content, usage } =
              await activeProvider.generateStructuredProductContent(
                prompt,
                currentModelForProvider
              );
            const executionTime = Date.now() - startTime;

            // ── SUCCESS ──────────────────────────────────────────────────
            console.log(
              `[AI_REQUEST_SUCCESS] correlationId=${correlationId} provider=${chainItem.id} credential=${credential.id} model=${currentModelForProvider} latency=${executionTime}ms`
            );

            // Update credential health
            await markCredentialSuccess(credential.id, supabaseAdmin);
            await markModelActive(
              chainItem.id,
              currentModelForProvider,
              supabaseAdmin
            );

            // Update latency tracker
            const prevStats = latencyTracker.get(chainItem.id) || {
              avgLatencyMs: executionTime,
              failCount: 0,
            };
            const newAvg =
              prevStats.avgLatencyMs === 9999
                ? executionTime
                : Math.round(
                    prevStats.avgLatencyMs * 0.7 + executionTime * 0.3
                  );
            latencyTracker.set(chainItem.id, {
              avgLatencyMs: newAvg,
              failCount: Math.max(0, prevStats.failCount - 1),
            });

            // Log recovery if this was a fallback
            if (firstFailedProvider && firstFailedProvider !== chainItem.id) {
              await logFailureDiagnostic({
                feature: featureKey,
                primary_provider: primaryProviderId,
                failed_provider: firstFailedProvider,
                fallback_provider: chainItem.id,
                model: currentModelForProvider,
                error_message: `Primary provider '${firstFailedProvider}' failed (${initialFailureError}). Recovered via fallback provider '${chainItem.id}'.`,
                error_type: 'RECOVERED_VIA_FALLBACK',
                user_identifier: userId,
                user_role: userRole,
                latency_ms: executionTime,
                attempt_number: totalAttempts,
                recovery_status: 'recovered',
                metadata: {
                  tokens: usage.tokens,
                  cost: usage.cost,
                  credentialId: credential.id,
                  correlationId,
                },
              });
            }

            // Log success to ai_logs
            await supabaseAdmin.from('ai_logs').insert([
              {
                provider: chainItem.id,
                model: currentModelForProvider,
                feature: featureKey,
                tokens_used: usage.tokens,
                estimated_cost: usage.cost,
                status: 'success',
                user_identifier: userId,
                credential_id: credential.id,
                correlation_id: correlationId,
                latency_ms: executionTime,
              },
            ]);

            return content;
          } catch (error: any) {
            const executionTime = Date.now() - startTime;
            const classified = classifyError(error);
            const falloverAction = getFailoverActionDescription(classified);

            console.error(
              `[AI Engine] Attempt failed: provider=${chainItem.id} credential=${credential.id} model=${currentModelForProvider} category=${classified.category}:`,
              error.message
            );

            errors.push(
              `${chainItem.id}[${credential.display_name}]: ${error.message}`
            );
            if (!firstFailedProvider) {
              firstFailedProvider = chainItem.id;
              initialFailureError = error.message;
            }

            // Update latency tracker failure penalty
            const prevStats = latencyTracker.get(chainItem.id) || {
              avgLatencyMs: 5000,
              failCount: 0,
            };
            latencyTracker.set(chainItem.id, {
              avgLatencyMs: prevStats.avgLatencyMs,
              failCount: prevStats.failCount + 1,
            });

            // ── Act on error classification ────────────────────────────
            if (classified.category === 'RATE_LIMIT') {
              console.log(
                `[AI_RATE_LIMIT] correlationId=${correlationId} credential=${credential.id} → entering cooldown`
              );
              await markCredentialRateLimited(credential.id, supabaseAdmin);
            } else if (classified.category === 'QUOTA_EXHAUSTED') {
              console.log(
                `[AI_QUOTA_EXHAUSTED] correlationId=${correlationId} credential=${credential.id}`
              );
              await markCredentialQuotaExhausted(credential.id, supabaseAdmin);
            } else if (classified.category === 'AUTH_INVALID') {
              console.warn(
                `[AI_CREDENTIAL_INVALID] correlationId=${correlationId} credential=${credential.id}`
              );
              await markCredentialInvalid(
                credential.id,
                error.message,
                supabaseAdmin
              );
            } else if (classified.category === 'MODEL_ERROR') {
              // Don't rotate credential — rotate model
              console.log(
                `[AI_MODEL_ERROR] correlationId=${correlationId} model=${currentModelForProvider} → triggering model fallback`
              );
              await markModelUnavailable(
                chainItem.id,
                currentModelForProvider,
                error.message,
                supabaseAdmin
              );

              // Find next model and break credential loop to restart with new model
              const fallbackModel = await getModelFallback(
                chainItem.id,
                currentModelForProvider,
                supabaseAdmin
              );
              if (fallbackModel) {
                console.log(
                  `[AI_MODEL_FALLBACK] correlationId=${correlationId} from=${currentModelForProvider} to=${fallbackModel.model_id}`
                );
                currentModelForProvider = fallbackModel.model_id;
                modelFallbackTriggered = true;

                await logFailureDiagnostic({
                  feature: featureKey,
                  primary_provider: primaryProviderId,
                  failed_provider: chainItem.id,
                  model: currentModelForProvider,
                  error_message: `Model '${currentModelForProvider}' unavailable. Falling back to '${fallbackModel.model_id}'.`,
                  error_type: 'MODEL_ERROR',
                  user_identifier: userId,
                  user_role: userRole,
                  latency_ms: executionTime,
                  attempt_number: totalAttempts,
                  recovery_status: 'retrying',
                  metadata: {
                    correlationId,
                    fallbackModel: fallbackModel.model_id,
                    fallback_action: falloverAction,
                  },
                });

                // Reset visited credentials for the model retry
                credentials.forEach((c) => visitedCredentials.delete(c.id));
                credentialAttempts = 0;
                break; // Break credential loop, restart with new model
              } else {
                // No model fallback available → escalate to provider fallback
                console.log(
                  `[AI_MODEL_FALLBACK_EXHAUSTED] correlationId=${correlationId} provider=${chainItem.id}`
                );
              }
            } else if (
              classified.category === 'REQUEST_ERROR' ||
              classified.category === 'SAFETY_ERROR'
            ) {
              // Do NOT rotate credentials for request/safety errors
              console.log(
                `[AI_REQUEST_FINAL_FAILURE] correlationId=${correlationId} reason=${classified.category} (no credential rotation)`
              );

              await logFailureDiagnostic({
                feature: featureKey,
                primary_provider: primaryProviderId,
                failed_provider: chainItem.id,
                model: currentModelForProvider,
                error_message: error.message,
                error_type: classified.category,
                user_identifier: userId,
                user_role: userRole,
                latency_ms: executionTime,
                attempt_number: totalAttempts,
                recovery_status: 'exhausted',
                metadata: {
                  correlationId,
                  credential_id: credential.id,
                  fallback_action: falloverAction,
                },
              });

              await supabaseAdmin.from('ai_logs').insert([
                {
                  provider: chainItem.id,
                  model: currentModelForProvider,
                  feature: featureKey,
                  status: 'failed',
                  error_message: error.message,
                  user_identifier: userId,
                  credential_id: credential.id,
                  correlation_id: correlationId,
                  http_status_code: classified.httpStatus,
                },
              ]);

              throw new Error(error.message); // Propagate immediately — no point retrying
            }

            // Log failure diagnostic for other categories
            await logFailureDiagnostic({
              feature: featureKey,
              primary_provider: primaryProviderId,
              failed_provider: chainItem.id,
              model: currentModelForProvider,
              error_message: error.message,
              error_type: classified.category,
              user_identifier: userId,
              user_role: userRole,
              latency_ms: executionTime,
              attempt_number: totalAttempts,
              recovery_status:
                totalAttempts >= maxTotalAttempts ? 'exhausted' : 'retrying',
              metadata: {
                correlationId,
                credential_id: credential.id,
                credential_name: credential.display_name,
                fallback_action: falloverAction,
                http_status_code: classified.httpStatus,
              },
            });

            await supabaseAdmin.from('ai_logs').insert([
              {
                provider: chainItem.id,
                model: currentModelForProvider,
                feature: featureKey,
                status: 'failed',
                error_message: error.message,
                user_identifier: userId,
                credential_id: credential.id,
                correlation_id: correlationId,
                retry_count: credentialAttempts - 1,
              },
            ]);

            // Continue to next credential if appropriate
            if (classified.shouldRotateCredential) {
              console.log(
                `[AI_CREDENTIAL_FAILOVER] correlationId=${correlationId} from=${credential.id} action=${falloverAction}`
              );
              continue;
            }
          }
        } // end credential loop

        // If model fallback was triggered, continue the outer while loop with the new model
        if (modelFallbackTriggered) {
          modelFallbackTriggered = false;
          continue;
        }

        break; // No more model fallbacks — exit while loop
      } // end model-while loop
    } else {
      // LEGACY: Single-apiKey mode (backward compatibility)
      const startTime = Date.now();
      try {
        console.log(
          `[AI Engine] Legacy mode: provider=${chainItem.id} model=${currentModel}`
        );
        const { provider: aiProvider, model: modelName } = await getAIProvider(
          chainItem.id,
          currentModel,
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

        if (firstFailedProvider && firstFailedProvider !== chainItem.id) {
          await logFailureDiagnostic({
            feature: featureKey,
            primary_provider: primaryProviderId,
            failed_provider: firstFailedProvider,
            fallback_provider: chainItem.id,
            model: modelName,
            error_message: `Primary provider '${firstFailedProvider}' failed (${initialFailureError}). Recovered via fallback provider '${chainItem.id}'.`,
            error_type: 'RECOVERED_VIA_FALLBACK',
            user_identifier: userId,
            user_role: userRole,
            latency_ms: executionTime,
            attempt_number: totalAttempts + 1,
            recovery_status: 'recovered',
            metadata: { tokens: usage.tokens, cost: usage.cost, correlationId },
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
            correlation_id: correlationId,
            latency_ms: executionTime,
          },
        ]);

        return content;
      } catch (error: any) {
        const executionTime = Date.now() - startTime;
        console.error(
          `[AI Engine] Legacy generation failed for ${chainItem.id}:`,
          error
        );
        errors.push(`${chainItem.id}: ${error.message}`);

        if (!firstFailedProvider) {
          firstFailedProvider = chainItem.id;
          initialFailureError = error.message;
        }

        const prevStats = latencyTracker.get(chainItem.id) || {
          avgLatencyMs: 5000,
          failCount: 0,
        };
        latencyTracker.set(chainItem.id, {
          avgLatencyMs: prevStats.avgLatencyMs,
          failCount: prevStats.failCount + 1,
        });

        const classified = classifyError(error);

        await logFailureDiagnostic({
          feature: featureKey,
          primary_provider: primaryProviderId,
          failed_provider: chainItem.id,
          fallback_provider: executionChain[providerAttempts]?.id,
          model: currentModel,
          error_message: error.message || 'Unknown provider error',
          error_type: classified.category,
          stack_trace: error.stack,
          user_identifier: userId,
          user_role: userRole,
          latency_ms: executionTime,
          attempt_number: totalAttempts + 1,
          recovery_status:
            providerAttempts >= executionChain.length
              ? 'exhausted'
              : 'retrying',
          metadata: { correlationId },
        });

        await supabaseAdmin.from('ai_logs').insert([
          {
            provider: chainItem.id,
            model: currentModel,
            feature: featureKey,
            status: 'failed',
            error_message: error.message,
            user_identifier: userId,
            correlation_id: correlationId,
          },
        ]);

        // For request/safety errors don't try next provider
        if (
          classified.category === 'REQUEST_ERROR' ||
          classified.category === 'SAFETY_ERROR'
        ) {
          throw error;
        }
      }
    }

    if (totalAttempts >= maxTotalAttempts) {
      console.log(
        `[AI_REQUEST_FINAL_FAILURE] correlationId=${correlationId} maxTotalAttempts=${maxTotalAttempts} reached`
      );
      break;
    }
  } // end provider loop

  console.log(
    `[AI_REQUEST_FINAL_FAILURE] correlationId=${correlationId} errors=${errors.join(' | ')}`
  );

  if (errors.length > 0) {
    throw new Error(
      `AI Generation failed across configured providers. Errors: ${errors.join(' | ')}`
    );
  }

  throw new Error(
    'AI Generation failed: No configured providers available in the fallback chain.'
  );
}
