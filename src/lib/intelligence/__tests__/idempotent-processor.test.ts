jest.mock('server-only', () => ({}));

import {
  processBusinessEvent,
  replayEventBatch,
  clearInMemoryDeduplicationCache,
  defaultIsTransient,
} from '../idempotent-processor';
import { createBusinessEvent } from '../event-contract';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Idempotent Event Processor & Retry Engine (Phase 14)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    clearInMemoryDeduplicationCache();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  const createSampleEvent = (idempotencyKey: string) =>
    createBusinessEvent({
      eventType: 'ORDER_CONFIRMED',
      source: 'orders_portal',
      idempotencyKey,
      actor: { type: 'staff', id: 'staff_123' },
      entity: { type: 'order', id: 'ord_sample_999' },
      payload: { total: 15000, itemsCount: 2 },
    });

  describe('defaultIsTransient', () => {
    it('correctly classifies transient vs terminal errors', () => {
      expect(
        defaultIsTransient(new Error('Connection timeout to database'))
      ).toBe(true);
      expect(defaultIsTransient(new Error('HTTP 429 Too Many Requests'))).toBe(
        true
      );
      expect(
        defaultIsTransient(new Error('Deadlock found when trying to get lock'))
      ).toBe(true);
      expect(defaultIsTransient(new Error('ECONNRESET'))).toBe(true);

      expect(defaultIsTransient(new Error('Invalid column name'))).toBe(false);
      expect(
        defaultIsTransient(new Error('Unauthorized permission denied'))
      ).toBe(false);
    });
  });

  describe('processBusinessEvent - Deduplication & Replay', () => {
    it('processes a new business event successfully on first invocation', async () => {
      const event = createSampleEvent('idemp_first_call_001');
      const handler = jest
        .fn()
        .mockResolvedValue({ success: true, processedOrder: 'ord_sample_999' });

      const result = await processBusinessEvent(event, { handler });

      expect(result.status).toBe('processed');
      expect(result.executed).toBe(true);
      expect(result.retryCount).toBe(0);
      expect(result.result).toEqual({
        success: true,
        processedOrder: 'ord_sample_999',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('identifies replayed duplicate event and avoids executing handler or duplicating metrics', async () => {
      const event = createSampleEvent('idemp_duplicate_test_002');
      const handler = jest.fn().mockResolvedValue({ success: true });

      // First run: executes normally
      const res1 = await processBusinessEvent(event, { handler });
      expect(res1.status).toBe('processed');
      expect(res1.executed).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);

      // Second run with identical idempotency key: duplicate detected
      const res2 = await processBusinessEvent(event, { handler });
      expect(res2.status).toBe('duplicate');
      expect(res2.executed).toBe(false);
      // Handler must NOT have been called a second time
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('processBusinessEvent - Schema Validation & Fail-Fast', () => {
    it('fails fast with failed_terminal when event schema is invalid', async () => {
      const invalidEvent = {
        eventType: 'NON_EXISTENT_TYPE',
        payload: { something: true },
      };

      const handler = jest.fn();
      const result = await processBusinessEvent(invalidEvent, { handler });

      expect(result.status).toBe('failed_terminal');
      expect(result.executed).toBe(false);
      expect(result.error).toContain('Event schema validation failed');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('processBusinessEvent - Bounded Retries', () => {
    it('retries transient failures and succeeds when subsequent attempt succeeds', async () => {
      const event = createSampleEvent('idemp_transient_retry_003');

      let attempt = 0;
      const handler = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Connection timeout to database replica');
        }
        return { recovered: true };
      });

      const result = await processBusinessEvent(event, {
        handler,
        maxRetries: 3,
        backoffBaseMs: 10,
      });

      expect(result.status).toBe('processed');
      expect(result.executed).toBe(true);
      expect(result.retryCount).toBe(1); // 1 retry performed
      expect(result.result).toEqual({ recovered: true });
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('exhausts retry budget on persistent transient errors and returns failed_transient', async () => {
      const event = createSampleEvent('idemp_exhaust_retry_004');

      const handler = jest
        .fn()
        .mockRejectedValue(new Error('Lock wait timeout exceeded'));

      const result = await processBusinessEvent(event, {
        handler,
        maxRetries: 2,
        backoffBaseMs: 10,
      });

      expect(result.status).toBe('failed_transient');
      expect(result.executed).toBe(false);
      expect(result.retryCount).toBe(2);
      expect(handler).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('fails fast on terminal non-transient error without retrying', async () => {
      const event = createSampleEvent('idemp_terminal_error_005');

      const handler = jest
        .fn()
        .mockRejectedValue(
          new Error('403 Forbidden: Insufficient permissions')
        );

      const result = await processBusinessEvent(event, {
        handler,
        maxRetries: 3,
        backoffBaseMs: 10,
      });

      expect(result.status).toBe('failed_terminal');
      expect(result.executed).toBe(false);
      expect(result.retryCount).toBe(0);
      expect(handler).toHaveBeenCalledTimes(1); // Exactly 1 attempt
    });
  });

  describe('replayEventBatch', () => {
    it('safely processes a batch of events skipping already-processed ones', async () => {
      const eventA = createSampleEvent('idemp_batch_A');
      const eventB = createSampleEvent('idemp_batch_B');

      const processedKeys = new Set<string>(['idemp_batch_A']); // Event A is already processed

      const customDeduplicator = {
        isProcessed: async (key: string) => processedKeys.has(key),
        markProcessed: async (key: string) => {
          processedKeys.add(key);
        },
      };

      const handler = jest.fn().mockResolvedValue('ok');

      const results = await replayEventBatch([eventA, eventB], {
        handler,
        customDeduplicator,
      });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('duplicate');
      expect(results[0].executed).toBe(false);

      expect(results[1].status).toBe('processed');
      expect(results[1].executed).toBe(true);

      expect(handler).toHaveBeenCalledTimes(1); // Only called for B
    });
  });
});
