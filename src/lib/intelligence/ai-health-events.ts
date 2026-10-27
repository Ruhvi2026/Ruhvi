import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  createBusinessEvent,
  validateBusinessEvent,
  type BusinessEvent,
  type BusinessEventType,
  type EventSource,
  type EventActor,
} from './event-contract';

/**
 * ============================================================================
 * AI & INFRASTRUCTURE HEALTH EVENT PIPELINE (TRACK B - PHASE 13)
 * ============================================================================
 * Normalizes, validates, and observes AI service health, multi-credential routing,
 * token consumption, latency, failover transitions, and rate-limit triggers.
 *
 * Guarantees:
 * 1. Strict Privacy & Prompt Confidentiality: NEVER captures user prompts,
 *    customer chat messages, system prompt templates, or customer PII.
 * 2. Pure System Telemetry: Captures strictly operational telemetry (provider,
 *    model, feature, tokens_used, latency_ms, estimated_cost, and diagnostic codes).
 * 3. Multi-Credential Observability: Records credential IDs, correlation IDs,
 *    and failover recovery statuses without leaking API keys or credentials.
 * 4. Zero Interruption: Read-only observation with deterministic idempotency.
 */

export type AiProvider =
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'together'
  | 'huggingface'
  | 'sarvam'
  | 'system';

export type AiFailureType =
  'RATE_LIMIT' | 'TIMEOUT' | 'AUTH_ERROR' | 'PROVIDER_DOWN' | 'GENERAL_FAILURE';

export interface ObserveAiRequestParams {
  provider: AiProvider | string;
  model: string;
  feature: string;
  tokensUsed?: number;
  latencyMs?: number;
  estimatedCost?: number;
  status: 'success' | 'failed';
  credentialId?: string;
  correlationId?: string;
  httpStatusCode?: number;
  errorMessage?: string;
  idempotencyKey?: string;
}

export interface ObserveAiFailoverParams {
  feature: string;
  primaryProvider: AiProvider | string;
  failedProvider: AiProvider | string;
  fallbackProvider: AiProvider | string;
  model?: string;
  errorType?: AiFailureType | string;
  providerErrorCode?: string;
  recoveryStatus: 'recovered' | 'exhausted' | 'retrying';
  latencyMs?: number;
  retryCount?: number;
  correlationId?: string;
  credentialId?: string;
}

export interface ObserveAiRateLimitParams {
  provider: AiProvider | string;
  model?: string;
  feature: string;
  httpStatusCode?: number;
  retryCount?: number;
  credentialId?: string;
  correlationId?: string;
}

export interface ObserveAiHealthResult {
  observed: boolean;
  event: BusinessEvent;
  idempotencyKey: string;
}

/**
 * Observes an AI request completion telemetry signal.
 * Guaranteed zero prompt or query text logging.
 */
export async function observeAiRequestCompleted(
  params: ObserveAiRequestParams
): Promise<ObserveAiHealthResult> {
  const {
    provider,
    model,
    feature,
    tokensUsed = 0,
    latencyMs = 0,
    estimatedCost = 0,
    status,
    credentialId,
    correlationId,
    httpStatusCode = 200,
    errorMessage,
    idempotencyKey,
  } = params;

  const deterministicKey =
    idempotencyKey ||
    (correlationId
      ? `idemp_ai_req_${correlationId}_${status}`
      : `idemp_ai_req_${provider}_${feature}_${Date.now()}`);

  const payload: Record<string, any> = {
    provider,
    model,
    feature,
    tokensUsed: Number(tokensUsed) || 0,
    latencyMs: Number(latencyMs) || 0,
    estimatedCost: Number(estimatedCost) || 0,
    status,
    credentialId: credentialId || undefined,
    correlationId: correlationId || undefined,
    httpStatusCode: Number(httpStatusCode) || 200,
    errorMessage: errorMessage || undefined,
  };

  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  const event = createBusinessEvent({
    eventType: 'AI_REQUEST_COMPLETED',
    source: 'ai_co_founder',
    idempotencyKey: deterministicKey,
    actor: {
      type: 'ai_agent',
      id: `${provider}:${model}`,
    },
    entity: {
      type: 'ai_service',
      id: provider,
      code: model,
    },
    payload,
  });

  return {
    observed: true,
    event,
    idempotencyKey: deterministicKey,
  };
}

/**
 * Observes a multi-credential fallback or failover transition signal.
 */
export async function observeAiFailoverTriggered(
  params: ObserveAiFailoverParams
): Promise<ObserveAiHealthResult> {
  const {
    feature,
    primaryProvider,
    failedProvider,
    fallbackProvider,
    model,
    errorType = 'GENERAL_FAILURE',
    providerErrorCode,
    recoveryStatus,
    latencyMs = 0,
    retryCount = 0,
    correlationId,
    credentialId,
  } = params;

  const deterministicKey = correlationId
    ? `idemp_ai_failover_${correlationId}_${failedProvider}_${fallbackProvider}`
    : `idemp_ai_failover_${feature}_${failedProvider}_${fallbackProvider}_${Date.now()}`;

  const payload: Record<string, any> = {
    feature,
    primaryProvider,
    failedProvider,
    fallbackProvider,
    model: model || undefined,
    errorType,
    providerErrorCode: providerErrorCode || undefined,
    recoveryStatus,
    latencyMs: Number(latencyMs) || 0,
    retryCount: Number(retryCount) || 0,
    correlationId: correlationId || undefined,
    credentialId: credentialId || undefined,
  };

  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  const event = createBusinessEvent({
    eventType: 'AI_FAILOVER_TRIGGERED',
    source: 'ai_co_founder',
    idempotencyKey: deterministicKey,
    actor: {
      type: 'system',
      id: 'multi_credential_router',
    },
    entity: {
      type: 'ai_service',
      id: failedProvider,
      code: fallbackProvider,
    },
    payload,
  });

  return {
    observed: true,
    event,
    idempotencyKey: deterministicKey,
  };
}

/**
 * Observes a rate-limit event triggered by an upstream AI provider.
 */
export async function observeAiRateLimitHit(
  params: ObserveAiRateLimitParams
): Promise<ObserveAiHealthResult> {
  const {
    provider,
    model,
    feature,
    httpStatusCode = 429,
    retryCount = 0,
    credentialId,
    correlationId,
  } = params;

  const deterministicKey = correlationId
    ? `idemp_ai_ratelimit_${correlationId}_${provider}`
    : `idemp_ai_ratelimit_${provider}_${feature}_${Date.now()}`;

  const payload: Record<string, any> = {
    provider,
    model: model || undefined,
    feature,
    httpStatusCode: Number(httpStatusCode) || 429,
    retryCount: Number(retryCount) || 0,
    credentialId: credentialId || undefined,
    correlationId: correlationId || undefined,
  };

  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  const event = createBusinessEvent({
    eventType: 'AI_RATE_LIMIT_HIT',
    source: 'ai_co_founder',
    idempotencyKey: deterministicKey,
    actor: {
      type: 'system',
      id: 'multi_credential_router',
    },
    entity: {
      type: 'ai_service',
      id: provider,
      code: model || feature,
    },
    payload,
  });

  return {
    observed: true,
    event,
    idempotencyKey: deterministicKey,
  };
}

/**
 * Fetches and transforms historical AI telemetry logs from public.ai_logs.
 */
export async function fetchAiHealthEvents(
  options: {
    provider?: string;
    feature?: string;
    limit?: number;
  } = {}
): Promise<BusinessEvent[]> {
  const { provider, feature, limit = 50 } = options;
  const supabase = getServiceClient();

  let query = supabase
    .from('ai_logs')
    .select(
      'id, provider, model, feature, tokens_used, estimated_cost, status, latency_ms, created_at, credential_id, correlation_id'
    );

  if (provider) query = query.eq('provider', provider);
  if (feature) query = query.eq('feature', feature);

  const { data: rows, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !rows) {
    return [];
  }

  const events: BusinessEvent[] = [];

  for (const row of rows) {
    const candidate = {
      id: `evt_ai_log_${row.id}`,
      schemaVersion: 1,
      eventType: 'AI_REQUEST_COMPLETED' as BusinessEventType,
      source: 'ai_co_founder' as EventSource,
      timestamp: row.created_at,
      idempotencyKey: `idemp_ai_log_${row.id}`,
      actor: {
        type: 'ai_agent' as const,
        id: `${row.provider}:${row.model}`,
      },
      entity: {
        type: 'ai_service' as const,
        id: row.provider,
        code: row.model,
      },
      payload: {
        provider: row.provider,
        model: row.model,
        feature: row.feature,
        tokensUsed: row.tokens_used,
        estimatedCost: Number(row.estimated_cost) || 0,
        status: row.status,
        latencyMs: row.latency_ms,
        credentialId: row.credential_id || undefined,
        correlationId: row.correlation_id || undefined,
      },
    };

    const validation = validateBusinessEvent(candidate);
    if (validation.success && validation.event) {
      events.push(validation.event);
    }
  }

  return events;
}
