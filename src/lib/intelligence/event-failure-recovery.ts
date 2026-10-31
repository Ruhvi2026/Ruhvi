import 'server-only';

import { createScopedLogger } from '@/lib/logger';
import type { BusinessEvent } from './event-contract';

const logger = createScopedLogger('EventFailureRecovery');

export type FailedEventStatus = 'pending_retry' | 'dead_letter' | 'recovered';

export interface FailedBusinessEventEntry {
  id: string;
  eventId: string;
  eventType: string;
  idempotencyKey: string;
  source: string;
  orderId?: string;
  rawEvent?: BusinessEvent;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  status: FailedEventStatus;
  firstFailedAt: string;
  lastAttemptAt: string;
}

export interface RecordFailedEventParams {
  eventId: string;
  eventType: string;
  idempotencyKey: string;
  source: string;
  orderId?: string;
  rawEvent?: BusinessEvent;
  errorMessage: string;
  maxRetries?: number;
}

const MAX_QUEUE_SIZE = 500;
const DEFAULT_MAX_RETRIES = 3;

// In-memory bounded dead-letter / failure queue
const failureQueue: Map<string, FailedBusinessEventEntry> = new Map();

/**
 * Records a failed canonical event persistence attempt into the recovery queue.
 * Makes the failure visible and tracks retry progression without unbounded growth.
 */
export function recordFailedEvent(
  params: RecordFailedEventParams
): FailedBusinessEventEntry {
  const {
    eventId,
    eventType,
    idempotencyKey,
    source,
    orderId,
    rawEvent,
    errorMessage,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = params;

  // Deduplicate by idempotency key in the queue
  const existing = failureQueue.get(idempotencyKey);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastAttemptAt = now;
    existing.retryCount += 1;
    existing.errorMessage = errorMessage;

    if (existing.retryCount >= existing.maxRetries) {
      existing.status = 'dead_letter';
      logger.error(
        `[DLQ] Canonical event ${eventId} (${eventType}) exceeded max retries (${existing.maxRetries}). Moved to Dead-Letter Queue. Error: ${errorMessage}`
      );
    } else {
      existing.status = 'pending_retry';
      logger.warn(
        `[Retry] Canonical event ${eventId} (${eventType}) failed attempt ${existing.retryCount}/${existing.maxRetries}. Queued for retry.`
      );
    }

    return existing;
  }

  // Evict oldest if exceeding queue capacity
  if (failureQueue.size >= MAX_QUEUE_SIZE) {
    const oldestKey = failureQueue.keys().next().value;
    if (oldestKey) failureQueue.delete(oldestKey);
  }

  const entry: FailedBusinessEventEntry = {
    id: `fail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventId,
    eventType,
    idempotencyKey,
    source,
    orderId,
    rawEvent,
    errorMessage,
    retryCount: 0,
    maxRetries,
    status: 'pending_retry',
    firstFailedAt: now,
    lastAttemptAt: now,
  };

  failureQueue.set(idempotencyKey, entry);
  logger.error(
    `[Failure] Canonical event ${eventId} (${eventType}) failed persistence: ${errorMessage}. Enqueued for recovery.`
  );

  return entry;
}

/**
 * Retrieves all failed event entries, optionally filtered by status.
 */
export function getFailedEvents(
  statusFilter?: FailedEventStatus
): FailedBusinessEventEntry[] {
  const entries = Array.from(failureQueue.values());
  if (!statusFilter) return entries;
  return entries.filter((e) => e.status === statusFilter);
}

/**
 * Retrieves all events currently in the Dead-Letter Queue.
 */
export function getDeadLetterQueue(): FailedBusinessEventEntry[] {
  return getFailedEvents('dead_letter');
}

/**
 * Executes a bounded retry batch over pending failed events using the provided persistence executor.
 */
export async function retryPendingEvents(
  executor: (entry: FailedBusinessEventEntry) => Promise<boolean>
): Promise<{
  attempted: number;
  recovered: number;
  deadLettered: number;
}> {
  const pending = getFailedEvents('pending_retry');
  let attempted = 0;
  let recovered = 0;
  let deadLettered = 0;

  for (const entry of pending) {
    attempted++;
    try {
      const success = await executor(entry);
      if (success) {
        entry.status = 'recovered';
        recovered++;
        logger.info(
          `[Recovered] Canonical event ${entry.eventId} (${entry.eventType}) successfully persisted on retry.`
        );
      } else {
        entry.retryCount += 1;
        entry.lastAttemptAt = new Date().toISOString();
        if (entry.retryCount >= entry.maxRetries) {
          entry.status = 'dead_letter';
          deadLettered++;
        }
      }
    } catch (err: any) {
      entry.retryCount += 1;
      entry.errorMessage = err.message || 'Retry execution failed';
      entry.lastAttemptAt = new Date().toISOString();
      if (entry.retryCount >= entry.maxRetries) {
        entry.status = 'dead_letter';
        deadLettered++;
      }
    }
  }

  return { attempted, recovered, deadLettered };
}

/**
 * Clears the in-memory failure queue (for test environments and maintenance).
 */
export function clearFailureQueue(): void {
  failureQueue.clear();
}
