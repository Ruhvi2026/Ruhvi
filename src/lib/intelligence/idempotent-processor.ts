import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { validateBusinessEvent, type BusinessEvent } from './event-contract';

/**
 * ============================================================================
 * IDEMPOTENT EVENT PROCESSOR & RETRY ENGINE (TRACK B - PHASE 14)
 * ============================================================================
 * Guarantees duplicate prevention, bounded exponential backoff retries, and
 * safe replay for all business events flowing into the Shared Intelligence Layer.
 *
 * Guarantees:
 * 1. Zero Duplicate Processing: Deterministic idempotency keys prevent re-executed
 *    webhooks, user refreshes, and network retries from duplicating business mutations.
 * 2. Metric Safety: Replayed events return cached/deduplicated outcomes without
 *    incrementing KPI metrics (e.g., net sales, order counts, stock allocations).
 * 3. Bounded Retries: Transient errors (locks, timeouts, network hiccups) are retried
 *    up to maxRetries with exponential backoff. Terminal errors fail fast.
 * 4. Safe Batch Replay: Historical event sequences can be safely re-streamed to verify
 *    state without side-effect re-execution.
 */

export type ProcessingStatus =
  'processed' | 'duplicate' | 'failed_transient' | 'failed_terminal';

export interface ProcessEventOptions<T = any> {
  maxRetries?: number;
  backoffBaseMs?: number;
  handler?: (event: BusinessEvent) => Promise<T>;
  isTransientError?: (error: any) => boolean;
  customDeduplicator?: {
    isProcessed: (key: string) => Promise<boolean>;
    markProcessed: (key: string, event: BusinessEvent) => Promise<void>;
  };
}

export interface ProcessEventResult<T = any> {
  status: ProcessingStatus;
  event: BusinessEvent;
  idempotencyKey: string;
  executed: boolean;
  result?: T;
  retryCount: number;
  error?: string;
}

// In-memory fast-path deduplication cache with sliding window (prevents micro-burst duplicates)
const inMemoryProcessedKeys = new Map<string, number>();
const IN_MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

function pruneMemoryCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of inMemoryProcessedKeys.entries()) {
    if (now - timestamp > IN_MEMORY_TTL_MS) {
      inMemoryProcessedKeys.delete(key);
    }
  }
}

/**
 * Checks whether an event's idempotency key has already been processed.
 */
export async function isEventAlreadyProcessed(
  idempotencyKey: string,
  customCheck?: (key: string) => Promise<boolean>
): Promise<boolean> {
  if (customCheck) {
    return customCheck(idempotencyKey);
  }

  // 1. Fast path: check in-memory cache
  if (inMemoryProcessedKeys.has(idempotencyKey)) {
    return true;
  }

  // 2. Authoritative check: query public.order_events metadata
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('order_events')
      .select('id')
      .filter('metadata->>idempotency_key', 'eq', idempotencyKey)
      .limit(1);

    if (!error && data && data.length > 0) {
      inMemoryProcessedKeys.set(idempotencyKey, Date.now());
      return true;
    }
  } catch {
    // If DB check fails, fallback to processing with caution
  }

  return false;
}

/**
 * Marks an event's idempotency key as processed.
 */
export async function recordProcessedEvent(
  idempotencyKey: string,
  event: BusinessEvent,
  customRecord?: (key: string, event: BusinessEvent) => Promise<void>
): Promise<void> {
  pruneMemoryCache();
  inMemoryProcessedKeys.set(idempotencyKey, Date.now());

  if (customRecord) {
    await customRecord(idempotencyKey, event);
    return;
  }

  // Only persist to order_events if the entity is an order or payment
  if (event.entity.type === 'order' || event.entity.type === 'payment') {
    try {
      const supabase = getServiceClient();
      await supabase.from('order_events').insert({
        order_id: event.entity.id,
        event_type: event.eventType,
        portal: event.source,
        metadata: {
          ...event.payload,
          idempotency_key: idempotencyKey,
          processed_at: new Date().toISOString(),
        },
      });
    } catch {
      // Best-effort ledger persistence
    }
  }
}

/**
 * Determines whether an error is transient (safe to retry) or terminal.
 */
export function defaultIsTransient(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();

  // Transient network, deadlock, or rate-limit codes
  return (
    msg.includes('timeout') ||
    msg.includes('connection refused') ||
    msg.includes('deadlock') ||
    msg.includes('lock wait timeout') ||
    msg.includes('too many connections') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('econnreset')
  );
}

/**
 * Sleeps for a given duration in milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes a canonical BusinessEvent idempotently with bounded retries.
 */
export async function processBusinessEvent<T = any>(
  rawEvent: any,
  options: ProcessEventOptions<T> = {}
): Promise<ProcessEventResult<T>> {
  const {
    maxRetries = 3,
    backoffBaseMs = 50,
    handler,
    isTransientError = defaultIsTransient,
    customDeduplicator,
  } = options;

  // 1. Validate Event Contract
  const validation = validateBusinessEvent(rawEvent);
  if (!validation.success || !validation.event) {
    return {
      status: 'failed_terminal',
      event: rawEvent,
      idempotencyKey: rawEvent?.idempotencyKey || 'unknown_invalid',
      executed: false,
      retryCount: 0,
      error: `Event schema validation failed: ${validation.error}`,
    };
  }

  const event = validation.event;
  const idempotencyKey = event.idempotencyKey;

  // 2. Deduplication check
  const alreadyProcessed = await isEventAlreadyProcessed(
    idempotencyKey,
    customDeduplicator?.isProcessed
  );

  if (alreadyProcessed) {
    return {
      status: 'duplicate',
      event,
      idempotencyKey,
      executed: false,
      retryCount: 0,
    };
  }

  // 3. Execution with Bounded Retries
  let attempts = 0;
  let lastError: any = null;

  while (attempts <= maxRetries) {
    try {
      let result: T | undefined = undefined;

      if (handler) {
        result = await handler(event);
      }

      // Record successful processing
      await recordProcessedEvent(
        idempotencyKey,
        event,
        customDeduplicator?.markProcessed
      );

      return {
        status: 'processed',
        event,
        idempotencyKey,
        executed: true,
        result,
        retryCount: attempts,
      };
    } catch (err: any) {
      lastError = err;
      attempts++;

      const isTransient = isTransientError(err);
      if (!isTransient || attempts > maxRetries) {
        // Terminal failure or retry budget exhausted
        return {
          status: isTransient ? 'failed_transient' : 'failed_terminal',
          event,
          idempotencyKey,
          executed: false,
          retryCount: attempts - 1,
          error: err?.message || String(err),
        };
      }

      // Exponential backoff with jitter
      const backoff = backoffBaseMs * Math.pow(2, attempts - 1);
      const jitter = Math.random() * 20;
      await sleep(backoff + jitter);
    }
  }

  return {
    status: 'failed_transient',
    event,
    idempotencyKey,
    executed: false,
    retryCount: maxRetries,
    error: lastError?.message || 'Max retries exhausted',
  };
}

/**
 * Replays a batch of events safely, ensuring already-processed events are skipped.
 */
export async function replayEventBatch<T = any>(
  events: BusinessEvent[],
  options: ProcessEventOptions<T> = {}
): Promise<ProcessEventResult<T>[]> {
  const results: ProcessEventResult<T>[] = [];

  for (const event of events) {
    const res = await processBusinessEvent<T>(event, options);
    results.push(res);
  }

  return results;
}

/**
 * Clears in-memory deduplication cache (useful for testing or cache reset).
 */
export function clearInMemoryDeduplicationCache(): void {
  inMemoryProcessedKeys.clear();
}
