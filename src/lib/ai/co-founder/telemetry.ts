import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { getCoFounderCacheStats, coFounderCache } from './cache';
import { getRateLimiterDiagnostics } from './rate-limiter';

/**
 * ============================================================================
 * CO-FOUNDER STRUCTURED PRODUCTION TELEMETRY & CANARY OBSERVABILITY (PHASE 10)
 * ============================================================================
 * Provides:
 * 1. OpenTelemetry-compatible span abstraction for distributed tracing.
 * 2. Fine-grained LLM telemetry (token accounting, duration, provider, channel).
 * 3. Tool execution telemetry with duration, user context, and error attribution.
 * 4. Error classification matrix (rate limits, auth, upstream timeouts, etc.).
 * 5. Bounded in-memory rolling ring buffer for instant metrics & diagnostics.
 * 6. Automated Production Health Canary Probe (DB, cache, rate limiter, credentials).
 */

export type ErrorCategory =
  | 'rate_limit'
  | 'auth_denied'
  | 'upstream_timeout'
  | 'upstream_error'
  | 'validation_error'
  | 'budget_exhausted'
  | 'internal_error';

export type TelemetryChannel =
  | 'chat'
  | 'voice'
  | 'vision'
  | 'proactive'
  | 'task_worker';

export type LLMProvider =
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'fallback';

export interface LLMTelemetryEvent {
  id: string;
  timestamp: number;
  traceId: string;
  spanId: string;
  provider: LLMProvider;
  model: string;
  channel: TelemetryChannel;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  temperature?: number;
  success: boolean;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ToolTelemetryEvent {
  id: string;
  timestamp: number;
  traceId: string;
  spanId: string;
  toolName: string;
  durationMs: number;
  success: boolean;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

export interface TelemetrySpan {
  spanId: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
  setAttribute: (key: string, value: any) => void;
  addEvent: (name: string, attributes?: Record<string, any>) => void;
  recordException: (err: any) => void;
  end: (status?: 'ok' | 'error') => void;
}

export interface CanaryProbeResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  details?: string;
  timestamp: number;
}

export interface CanaryHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  totalLatencyMs: number;
  probes: CanaryProbeResult[];
}

export interface TelemetrySummary {
  windowMs: number;
  totalLLMCalls: number;
  totalToolExecutions: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  averageLLMDurationMs: number;
  p95LLMDurationMs: number;
  averageToolDurationMs: number;
  llmSuccessRate: number; // 0.0 - 1.0
  toolSuccessRate: number; // 0.0 - 1.0
  errorsByCategory: Record<ErrorCategory, number>;
  providerBreakdown: Record<
    string,
    { calls: number; tokens: number; avgDurationMs: number }
  >;
  topTools: Array<{
    toolName: string;
    executions: number;
    avgDurationMs: number;
    errorCount: number;
  }>;
}

/**
 * Classifies an unknown error into a structured ErrorCategory.
 */
export function classifyError(err: any): ErrorCategory {
  if (!err) return 'internal_error';

  const status =
    err.status || err.statusCode || err.response?.status || err.code;
  const msg = (err.message || String(err)).toLowerCase();

  if (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('quota exceeded')
  ) {
    return 'rate_limit';
  }

  if (
    status === 401 ||
    status === 403 ||
    msg.includes('permission') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('denied')
  ) {
    return 'auth_denied';
  }

  if (
    status === 408 ||
    status === 504 ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('deadline exceeded')
  ) {
    return 'upstream_timeout';
  }

  if (
    msg.includes('token budget') ||
    msg.includes('budget exhausted') ||
    msg.includes('max context')
  ) {
    return 'budget_exhausted';
  }

  if (
    status === 400 ||
    status === 422 ||
    msg.includes('validation') ||
    msg.includes('invalid') ||
    msg.includes('zod') ||
    msg.includes('schema')
  ) {
    return 'validation_error';
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    msg.includes('upstream') ||
    msg.includes('gemini') ||
    msg.includes('groq') ||
    msg.includes('openrouter')
  ) {
    return 'upstream_error';
  }

  return 'internal_error';
}

/**
 * Generates an 8-byte (16 hex chars) random ID.
 */
function generateId(prefix: string = ''): string {
  const hex = Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 10);
  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Starts an OpenTelemetry-compatible in-memory span.
 */
export function startSpan(
  name: string,
  attributes: Record<string, any> = {},
  traceId?: string
): TelemetrySpan {
  const spanTraceId = traceId || generateId('tr');
  const spanId = generateId('sp');
  const startTime = Date.now();
  const spanAttributes = { ...attributes };
  const events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }> = [];

  let isEnded = false;
  let status: 'ok' | 'error' = 'ok';
  let endTime: number | undefined;
  let durationMs: number | undefined;

  const span: TelemetrySpan = {
    spanId,
    traceId: spanTraceId,
    name,
    startTime,
    get endTime() {
      return endTime;
    },
    get durationMs() {
      return durationMs;
    },
    get status() {
      return status;
    },
    attributes: spanAttributes,
    events,
    setAttribute(key: string, value: any) {
      spanAttributes[key] = value;
    },
    addEvent(eventName: string, eventAttrs?: Record<string, any>) {
      events.push({
        name: eventName,
        timestamp: Date.now(),
        attributes: eventAttrs,
      });
    },
    recordException(err: any) {
      status = 'error';
      spanAttributes['error.category'] = classifyError(err);
      spanAttributes['error.message'] = err?.message || String(err);
      events.push({
        name: 'exception',
        timestamp: Date.now(),
        attributes: {
          'exception.message': err?.message || String(err),
          'exception.type': err?.name || 'Error',
        },
      });
    },
    end(finalStatus?: 'ok' | 'error') {
      if (isEnded) return;
      isEnded = true;
      endTime = Date.now();
      durationMs = endTime - startTime;
      if (finalStatus) status = finalStatus;
    },
  };

  return span;
}

/**
 * Co-Founder Telemetry Store (In-Memory Bounded Ring Buffer).
 */
export class CoFounderTelemetryStore {
  private maxBufferSize: number;
  private llmBuffer: LLMTelemetryEvent[] = [];
  private toolBuffer: ToolTelemetryEvent[] = [];

  constructor(options?: { maxBufferSize?: number }) {
    this.maxBufferSize = options?.maxBufferSize || 1000;
  }

  recordLLM(
    event: Omit<LLMTelemetryEvent, 'id' | 'timestamp'>
  ): LLMTelemetryEvent {
    const fullEvent: LLMTelemetryEvent = {
      ...event,
      id: generateId('llm'),
      timestamp: Date.now(),
    };

    this.llmBuffer.push(fullEvent);
    if (this.llmBuffer.length > this.maxBufferSize) {
      this.llmBuffer.shift();
    }

    return fullEvent;
  }

  recordTool(
    event: Omit<ToolTelemetryEvent, 'id' | 'timestamp'>
  ): ToolTelemetryEvent {
    const fullEvent: ToolTelemetryEvent = {
      ...event,
      id: generateId('tool'),
      timestamp: Date.now(),
    };

    this.toolBuffer.push(fullEvent);
    if (this.toolBuffer.length > this.maxBufferSize) {
      this.toolBuffer.shift();
    }

    return fullEvent;
  }

  getRecentLLMEvents(limit: number = 50): LLMTelemetryEvent[] {
    return this.llmBuffer.slice(-limit).reverse();
  }

  getRecentToolEvents(limit: number = 50): ToolTelemetryEvent[] {
    return this.toolBuffer.slice(-limit).reverse();
  }

  getTelemetrySummary(windowMs: number = 3600000): TelemetrySummary {
    const cutoff = Date.now() - windowMs;
    const llmEvents = this.llmBuffer.filter((e) => e.timestamp >= cutoff);
    const toolEvents = this.toolBuffer.filter((e) => e.timestamp >= cutoff);

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalLLMDuration = 0;
    let successfulLLM = 0;

    const llmDurations: number[] = [];
    const providerBreakdown: Record<
      string,
      { calls: number; tokens: number; totalDuration: number }
    > = {};

    const errorsByCategory: Record<ErrorCategory, number> = {
      rate_limit: 0,
      auth_denied: 0,
      upstream_timeout: 0,
      upstream_error: 0,
      validation_error: 0,
      budget_exhausted: 0,
      internal_error: 0,
    };

    for (const e of llmEvents) {
      totalPromptTokens += e.promptTokens || 0;
      totalCompletionTokens += e.completionTokens || 0;
      totalTokens += e.totalTokens || 0;
      totalLLMDuration += e.durationMs || 0;
      llmDurations.push(e.durationMs || 0);

      if (e.success) {
        successfulLLM++;
      } else if (e.errorCategory) {
        errorsByCategory[e.errorCategory] =
          (errorsByCategory[e.errorCategory] || 0) + 1;
      }

      if (!providerBreakdown[e.provider]) {
        providerBreakdown[e.provider] = {
          calls: 0,
          tokens: 0,
          totalDuration: 0,
        };
      }
      providerBreakdown[e.provider].calls++;
      providerBreakdown[e.provider].tokens += e.totalTokens || 0;
      providerBreakdown[e.provider].totalDuration += e.durationMs || 0;
    }

    // Tool metrics
    let totalToolDuration = 0;
    let successfulTools = 0;
    const toolMap: Record<
      string,
      { executions: number; totalDuration: number; errorCount: number }
    > = {};

    for (const t of toolEvents) {
      totalToolDuration += t.durationMs || 0;
      if (t.success) {
        successfulTools++;
      } else {
        if (t.errorCategory) {
          errorsByCategory[t.errorCategory] =
            (errorsByCategory[t.errorCategory] || 0) + 1;
        }
      }

      if (!toolMap[t.toolName]) {
        toolMap[t.toolName] = {
          executions: 0,
          totalDuration: 0,
          errorCount: 0,
        };
      }
      toolMap[t.toolName].executions++;
      toolMap[t.toolName].totalDuration += t.durationMs || 0;
      if (!t.success) toolMap[t.toolName].errorCount++;
    }

    // p95 LLM Latency calculation
    llmDurations.sort((a, b) => a - b);
    const p95Index = Math.floor(llmDurations.length * 0.95);
    const p95LLMDurationMs =
      llmDurations.length > 0 ? llmDurations[p95Index] || 0 : 0;

    const formattedProviderBreakdown: Record<
      string,
      { calls: number; tokens: number; avgDurationMs: number }
    > = {};
    for (const [k, v] of Object.entries(providerBreakdown)) {
      formattedProviderBreakdown[k] = {
        calls: v.calls,
        tokens: v.tokens,
        avgDurationMs: v.calls > 0 ? Math.round(v.totalDuration / v.calls) : 0,
      };
    }

    const topTools = Object.entries(toolMap)
      .map(([toolName, data]) => ({
        toolName,
        executions: data.executions,
        avgDurationMs:
          data.executions > 0
            ? Math.round(data.totalDuration / data.executions)
            : 0,
        errorCount: data.errorCount,
      }))
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10);

    return {
      windowMs,
      totalLLMCalls: llmEvents.length,
      totalToolExecutions: toolEvents.length,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      averageLLMDurationMs:
        llmEvents.length > 0
          ? Math.round(totalLLMDuration / llmEvents.length)
          : 0,
      p95LLMDurationMs,
      averageToolDurationMs:
        toolEvents.length > 0
          ? Math.round(totalToolDuration / toolEvents.length)
          : 0,
      llmSuccessRate:
        llmEvents.length > 0
          ? Math.round((successfulLLM / llmEvents.length) * 1000) / 1000
          : 1,
      toolSuccessRate:
        toolEvents.length > 0
          ? Math.round((successfulTools / toolEvents.length) * 1000) / 1000
          : 1,
      errorsByCategory,
      providerBreakdown: formattedProviderBreakdown,
      topTools,
    };
  }

  clear(): void {
    this.llmBuffer = [];
    this.toolBuffer = [];
  }
}

// Global Singleton
export const telemetry = new CoFounderTelemetryStore({
  maxBufferSize: 1000,
});

export function recordLLMTelemetry(
  event: Omit<LLMTelemetryEvent, 'id' | 'timestamp'>
): LLMTelemetryEvent {
  return telemetry.recordLLM(event);
}

export function recordToolTelemetry(
  event: Omit<ToolTelemetryEvent, 'id' | 'timestamp'>
): ToolTelemetryEvent {
  return telemetry.recordTool(event);
}

export function getTelemetrySummary(
  windowMs?: number
): TelemetrySummary {
  return telemetry.getTelemetrySummary(windowMs);
}

export function resetTelemetry(): void {
  telemetry.clear();
}

/**
 * Runs a comprehensive canary probe verifying system readiness across components.
 */
export async function runCoFounderHealthCanary(): Promise<CanaryHealthReport> {
  const startTotal = Date.now();
  const probes: CanaryProbeResult[] = [];

  // Probe 1: Database (Supabase)
  try {
    const dbStart = Date.now();
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from('products')
        .select('id')
        .limit(1);
      const latencyMs = Date.now() - dbStart;
      if (error) {
        probes.push({
          name: 'supabase_db',
          status: 'degraded',
          latencyMs,
          details: error.message,
          timestamp: Date.now(),
        });
      } else {
        probes.push({
          name: 'supabase_db',
          status: 'healthy',
          latencyMs,
          details: 'Connected',
          timestamp: Date.now(),
        });
      }
    } else {
      probes.push({
        name: 'supabase_db',
        status: 'degraded',
        latencyMs: 0,
        details: 'SUPABASE_SERVICE_ROLE_KEY unconfigured',
        timestamp: Date.now(),
      });
    }
  } catch (err: any) {
    probes.push({
      name: 'supabase_db',
      status: 'unhealthy',
      latencyMs: 0,
      details: err?.message || 'Database connection error',
      timestamp: Date.now(),
    });
  }

  // Probe 2: Intelligent Cache
  try {
    const cacheStart = Date.now();
    coFounderCache.has('_canary_probe_');
    const stats = getCoFounderCacheStats();
    const latencyMs = Date.now() - cacheStart;
    probes.push({
      name: 'lru_cache',
      status: 'healthy',
      latencyMs,
      details: `Active entries: ${stats.entryCount}, Hit ratio: ${stats.hitRatio}`,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    probes.push({
      name: 'lru_cache',
      status: 'unhealthy',
      latencyMs: 0,
      details: err?.message || 'Cache inspection error',
      timestamp: Date.now(),
    });
  }

  // Probe 3: Rate Limiter Store
  try {
    const rlStart = Date.now();
    const rlDiag = getRateLimiterDiagnostics();
    const latencyMs = Date.now() - rlStart;
    probes.push({
      name: 'rate_limiter',
      status: 'healthy',
      latencyMs,
      details: `Active tracked keys: ${rlDiag.totalActiveKeys}`,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    probes.push({
      name: 'rate_limiter',
      status: 'unhealthy',
      latencyMs: 0,
      details: err?.message || 'Rate limiter store error',
      timestamp: Date.now(),
    });
  }

  // Probe 4: LLM Credentials Readiness
  try {
    const creds: string[] = [];
    if (process.env.GEMINI_API_KEY) creds.push('gemini');
    if (process.env.GROQ_API_KEY) creds.push('groq');
    if (process.env.OPENROUTER_API_KEY) creds.push('openrouter');
    if (process.env.OPENAI_API_KEY) creds.push('openai');

    probes.push({
      name: 'llm_providers',
      status: creds.length > 0 ? 'healthy' : 'degraded',
      latencyMs: 0,
      details:
        creds.length > 0
          ? `Configured providers: ${creds.join(', ')}`
          : 'No LLM API keys configured in environment',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    probes.push({
      name: 'llm_providers',
      status: 'unhealthy',
      latencyMs: 0,
      details: err?.message || 'Credential verification failed',
      timestamp: Date.now(),
    });
  }

  const totalLatencyMs = Date.now() - startTotal;

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const hasUnhealthy = probes.some((p) => p.status === 'unhealthy');
  const hasDegraded = probes.some((p) => p.status === 'degraded');

  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalLatencyMs,
    probes,
  };
}
