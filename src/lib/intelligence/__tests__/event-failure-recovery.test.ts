import {
  recordFailedEvent,
  getFailedEvents,
  getDeadLetterQueue,
  retryPendingEvents,
  clearFailureQueue,
} from '../event-failure-recovery';
import { observeOrderLifecycleTransition } from '../order-lifecycle';
import { observePaymentOutcome } from '../payment-events';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Event Failure Recovery & Observability (Phase 20)', () => {
  const mockedGetServiceClient = getServiceClient as jest.Mock;

  beforeEach(() => {
    clearFailureQueue();
    jest.clearAllMocks();
  });

  describe('1. Failure Recording and DLQ Lifecycle', () => {
    it('records a failed event into the queue with status pending_retry', () => {
      const entry = recordFailedEvent({
        eventId: 'evt_test_123',
        eventType: 'ORDER_CONFIRMED',
        idempotencyKey: 'idemp_test_123',
        source: 'orders_portal',
        orderId: 'order_1',
        errorMessage: 'Connection timeout to database',
        maxRetries: 3,
      });

      expect(entry.status).toBe('pending_retry');
      expect(entry.retryCount).toBe(0);
      expect(entry.maxRetries).toBe(3);
      expect(getFailedEvents()).toHaveLength(1);
      expect(getDeadLetterQueue()).toHaveLength(0);
    });

    it('transitions to dead_letter when retryCount reaches maxRetries', () => {
      const key = 'idemp_test_dlq';

      // Initial failure
      recordFailedEvent({
        eventId: 'evt_fail_1',
        eventType: 'PAYMENT_CONFIRMED',
        idempotencyKey: key,
        source: 'webhook_phonepe',
        errorMessage: 'PostgREST 500 internal error',
        maxRetries: 2,
      });

      // Retry 1
      recordFailedEvent({
        eventId: 'evt_fail_1',
        eventType: 'PAYMENT_CONFIRMED',
        idempotencyKey: key,
        source: 'webhook_phonepe',
        errorMessage: 'PostgREST 500 internal error',
        maxRetries: 2,
      });

      expect(getFailedEvents('pending_retry')).toHaveLength(1);
      expect(getDeadLetterQueue()).toHaveLength(0);

      // Retry 2 (hits maxRetries: 2)
      const dlqEntry = recordFailedEvent({
        eventId: 'evt_fail_1',
        eventType: 'PAYMENT_CONFIRMED',
        idempotencyKey: key,
        source: 'webhook_phonepe',
        errorMessage: 'PostgREST 500 internal error',
        maxRetries: 2,
      });

      expect(dlqEntry.status).toBe('dead_letter');
      expect(getDeadLetterQueue()).toHaveLength(1);
      expect(getFailedEvents('pending_retry')).toHaveLength(0);
    });

    it('retries pending events and marks successful ones as recovered', async () => {
      recordFailedEvent({
        eventId: 'evt_recover_1',
        eventType: 'ORDER_CONFIRMED',
        idempotencyKey: 'idemp_rec_1',
        source: 'orders_portal',
        errorMessage: 'Transient network glitch',
      });

      recordFailedEvent({
        eventId: 'evt_recover_2',
        eventType: 'SHIPPED',
        idempotencyKey: 'idemp_rec_2',
        source: 'orders_portal',
        errorMessage: 'Permanent constraint error',
      });

      const mockExecutor = jest.fn(async (entry) => {
        if (entry.idempotencyKey === 'idemp_rec_1') {
          return true; // Success
        }
        return false; // Still failing
      });

      const result = await retryPendingEvents(mockExecutor);

      expect(result.attempted).toBe(2);
      expect(result.recovered).toBe(1);
      expect(getFailedEvents('recovered')).toHaveLength(1);
      expect(getFailedEvents('recovered')[0].idempotencyKey).toBe(
        'idemp_rec_1'
      );
    });
  });

  describe('2. End-to-End Pipeline Observability', () => {
    it('sets observed: false and error in observeOrderLifecycleTransition when DB insert fails', async () => {
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
          insert: jest.fn().mockResolvedValue({
            error: { message: 'Database connection failed' },
          }),
        })),
      };

      mockedGetServiceClient.mockReturnValue(mockSupabase);

      const result = await observeOrderLifecycleTransition({
        orderId: 'order_test_99',
        toStatus: 'processing',
        actor: { type: 'staff', id: 'staff_1' },
      });

      expect(result.observed).toBe(false);
      expect(result.persistedToEventLog).toBe(false);
      expect(result.error).toBe('Database connection failed');

      // Failure must be logged in failure recovery queue
      const failed = getFailedEvents();
      expect(failed).toHaveLength(1);
      expect(failed[0].orderId).toBe('order_test_99');
      expect(failed[0].errorMessage).toBe('Database connection failed');
    });

    it('sets observed: false and error in observePaymentOutcome when DB insert fails', async () => {
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
          insert: jest.fn().mockResolvedValue({
            error: { message: 'Socket connection reset' },
          }),
        })),
      };

      mockedGetServiceClient.mockReturnValue(mockSupabase);

      const result = await observePaymentOutcome({
        orderId: 'order_pay_77',
        gateway: 'phonepe',
        merchantTransactionId: 'MTX_777',
        amount: 5000,
        outcome: 'CONFIRMED',
      });

      expect(result.observed).toBe(false);
      expect(result.persistedToEventLog).toBe(false);
      expect(result.error).toBe('Socket connection reset');

      // Failure must be visible in recovery queue
      const failed = getFailedEvents();
      expect(failed).toHaveLength(1);
      expect(failed[0].orderId).toBe('order_pay_77');
    });
  });
});
