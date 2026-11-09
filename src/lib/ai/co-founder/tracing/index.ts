import 'server-only';

import { trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { recordToolTelemetry, recordLLMTelemetry } from '../telemetry';

/**
 * ============================================================================
 * AI CO-FOUNDER & WORKFORCE DISTRIBUTED TRACING ENGINE (PHASE 11)
 * ============================================================================
 * Implements OpenTelemetry custom spans, safe attribute sanitization,
 * Sentry correlation, and execution ledger reconciliation.
 */

export type CoFounderSpanType =
  | 'cofounder.request'
  | 'model.call'
  | 'tool.call'
  | 'worker.run'
  | 'worker.delegate'
  | 'research.search'
  | 'research.fetch'
  | 'source.verify'
  | 'approval.request'
  | 'action.execute'
  | 'action.verify';

export interface TraceRecord {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: CoFounderSpanType;
  startTime: number;
  endTime?: number;
  durationMs: number;
  status: 'ok' | 'error';
  workerId?: string;
  toolName?: string;
  provider?: string;
  model?: string;
  resultState?: string;
  approvalState?: string;
  cacheHit?: boolean;
  retryCount?: number;
  sourceCount?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  attributes: Record<string, string | number | boolean>;
  errorMessage?: string;
}

// Bounded rolling ring buffer for recent searchable traces (max 500)
class TraceRingBuffer {
  private buffer: TraceRecord[] = [];
  private readonly maxSize = 500;

  add(record: TraceRecord): void {
    this.buffer.unshift(record);
    if (this.buffer.length > this.maxSize) {
      this.buffer.pop();
    }
  }

  getRecent(
    limit = 100,
    filter?: { workerId?: string; name?: string; status?: string }
  ): TraceRecord[] {
    let result = this.buffer;
    if (filter?.workerId) {
      result = result.filter((t) => t.workerId === filter.workerId);
    }
    if (filter?.name) {
      result = result.filter((t) => t.name === filter.name);
    }
    if (filter?.status) {
      result = result.filter((t) => t.status === filter.status);
    }
    return result.slice(0, limit);
  }

  clear(): void {
    this.buffer = [];
  }
}

export const traceBuffer = new TraceRingBuffer();

/**
 * Redacts sensitive credentials, cookies, tokens, and customer PII from trace attributes.
 */
export function sanitizeTraceAttributes(
  attributes: Record<string, any>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  const HARD_SENSITIVE_KEY_REGEX =
    /password|secret|cookie|auth|api_?key|jwt|private|cvv|card|credential|bearer|session|pin/i;
  const AUTH_TOKEN_KEY_REGEX =
    /(?:auth|session|access|refresh|id|csrf)_?token|token_?(?:hash|secret|value)/i;

  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  const PHONE_REGEX = /(\+?91[\s-]?)?[6-9]\d{9}/g;
  const JWT_REGEX = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g;
  const HEX_KEY_REGEX = /\b[a-f0-9]{32,64}\b/gi;

  for (const [key, val] of Object.entries(attributes)) {
    if (val === undefined || val === null) continue;

    if (HARD_SENSITIVE_KEY_REGEX.test(key) || AUTH_TOKEN_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
      continue;
    }

    if (typeof val === 'string') {
      let cleaned = val
        .replace(JWT_REGEX, '[REDACTED_JWT]')
        .replace(HEX_KEY_REGEX, '[REDACTED_SECRET]')
        .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
        .replace(PHONE_REGEX, '[REDACTED_PHONE]');

      // Truncate large string payloads
      if (cleaned.length > 500) {
        cleaned = cleaned.slice(0, 497) + '...';
      }
      sanitized[key] = cleaned;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    } else if (typeof val === 'object') {
      try {
        let str = JSON.stringify(val);
        str = str
          .replace(JWT_REGEX, '[REDACTED_JWT]')
          .replace(HEX_KEY_REGEX, '[REDACTED_SECRET]')
          .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
          .replace(PHONE_REGEX, '[REDACTED_PHONE]');
        if (str.length > 500) {
          str = str.slice(0, 497) + '...';
        }
        sanitized[key] = str;
      } catch {
        sanitized[key] = '[COMPLEX_OBJECT]';
      }
    }
  }

  return sanitized;
}

export interface SafeSpanContext {
  setAttribute: (key: string, value: string | number | boolean) => void;
  recordException: (err: any) => void;
  addEvent: (name: string, attrs?: Record<string, any>) => void;
}

/**
 * Wraps an async operation in an OpenTelemetry custom span with safe attribute redaction.
 */
export async function withCoFounderSpan<T>(
  name: CoFounderSpanType,
  attributes: Record<string, any>,
  fn: (ctx: SafeSpanContext) => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('ruhvi-cofounder');
  const safeAttributes = sanitizeTraceAttributes(attributes);
  const startTime = Date.now();

  const spanId = `sp_${Math.random().toString(36).substring(2, 10)}`;
  const traceId =
    attributes.traceId || `tr_${Math.random().toString(36).substring(2, 12)}`;

  let otelSpan: Span | null = null;
  try {
    otelSpan = tracer.startSpan(name, { attributes: safeAttributes });
  } catch {
    // Gracefully handle uninitialized tracer
  }

  const mutableAttributes: Record<string, string | number | boolean> = {
    ...safeAttributes,
  };
  let errorCaught: any = null;

  const ctx: SafeSpanContext = {
    setAttribute: (key, value) => {
      const sanitized = sanitizeTraceAttributes({ [key]: value });
      Object.assign(mutableAttributes, sanitized);
      if (otelSpan) {
        for (const [k, v] of Object.entries(sanitized)) {
          otelSpan.setAttribute(k, v);
        }
      }
    },
    recordException: (err) => {
      errorCaught = err;
      if (otelSpan) {
        otelSpan.recordException(err);
        otelSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: err?.message || String(err),
        });
      }
    },
    addEvent: (eventName, eventAttrs) => {
      const safeEventAttrs = eventAttrs
        ? sanitizeTraceAttributes(eventAttrs)
        : undefined;
      if (otelSpan) {
        otelSpan.addEvent(eventName, safeEventAttrs);
      }
    },
  };

  try {
    const result = await fn(ctx);
    const durationMs = Date.now() - startTime;

    if (otelSpan) {
      otelSpan.setStatus({ code: SpanStatusCode.OK });
      otelSpan.end();
    }

    // Persist safe trace record in buffer
    traceBuffer.add({
      id: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      traceId,
      spanId,
      name,
      startTime,
      endTime: Date.now(),
      durationMs,
      status: 'ok',
      workerId: String(
        mutableAttributes.workerId || mutableAttributes['worker.id'] || ''
      ),
      toolName: String(
        mutableAttributes.toolName || mutableAttributes['tool.name'] || ''
      ),
      provider: String(mutableAttributes.provider || ''),
      model: String(mutableAttributes.model || ''),
      resultState: String(mutableAttributes.resultState || 'completed'),
      approvalState: String(mutableAttributes.approvalState || 'not_required'),
      cacheHit: Boolean(mutableAttributes.cacheHit),
      retryCount: Number(mutableAttributes.retryCount || 0),
      sourceCount: Number(mutableAttributes.sourceCount || 0),
      attributes: mutableAttributes,
    });

    return result;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    ctx.recordException(err);

    if (otelSpan) {
      otelSpan.end();
    }

    traceBuffer.add({
      id: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      traceId,
      spanId,
      name,
      startTime,
      endTime: Date.now(),
      durationMs,
      status: 'error',
      workerId: String(
        mutableAttributes.workerId || mutableAttributes['worker.id'] || ''
      ),
      toolName: String(
        mutableAttributes.toolName || mutableAttributes['tool.name'] || ''
      ),
      provider: String(mutableAttributes.provider || ''),
      model: String(mutableAttributes.model || ''),
      resultState: 'failed',
      approvalState: String(mutableAttributes.approvalState || 'not_required'),
      cacheHit: Boolean(mutableAttributes.cacheHit),
      retryCount: Number(mutableAttributes.retryCount || 0),
      sourceCount: Number(mutableAttributes.sourceCount || 0),
      attributes: mutableAttributes,
      errorMessage: err?.message || String(err),
    });

    throw err;
  }
}
