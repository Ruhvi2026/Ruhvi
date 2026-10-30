jest.mock('server-only', () => ({}));
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import { observePaymentOutcome, fetchPaymentEvents } from '../payment-events';
import { getServiceClient } from '@/lib/supabase/service';

describe('Payment Outcome Intelligence Pipeline (Phase 09)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('observePaymentOutcome', () => {
    it('observes a fresh payment confirmation from PhonePe webhook', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'order_events') {
          return {
            select: mockSelect,
            eq: mockEq1,
            order: mockOrder,
            limit: mockLimit,
            insert: mockInsert,
          };
        }
        return {};
      });

      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const result = await observePaymentOutcome({
        orderId: '00000000-0000-0000-0000-000000000002',
        orderNumber: 'RUV-2026-2002',
        gateway: 'phonepe',
        merchantTransactionId: 'MTX_PHONEPE_12345',
        gatewayTransactionId: 'T26102600001',
        amount: 3499.0,
        outcome: 'CONFIRMED',
        origin: 'webhook',
      });

      expect(result.observed).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.persistedToEventLog).toBe(true);
      expect(result.event.eventType).toBe('PAYMENT_CONFIRMED');
      expect(result.event.source).toBe('webhook_phonepe');
      expect(result.event.idempotencyKey).toBe(
        'idemp_pay_phonepe_MTX_PHONEPE_12345_confirmed'
      );
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('reconciles browser redirect return and avoids double-counting already-processed webhook', async () => {
      // Existing event already logged by webhook
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [
          { id: 'evt_webhook_paid_001', created_at: new Date().toISOString() },
        ],
        error: null,
      });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'order_events') {
          return {
            select: mockSelect,
            eq: mockEq1,
            order: mockOrder,
            limit: mockLimit,
            insert: mockInsert,
          };
        }
        return {};
      });

      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const result = await observePaymentOutcome({
        orderId: '00000000-0000-0000-0000-000000000002',
        gateway: 'phonepe',
        merchantTransactionId: 'MTX_PHONEPE_12345',
        amount: 3499.0,
        outcome: 'CONFIRMED',
        origin: 'browser_return', // Browser redirect hitting order-success
      });

      expect(result.observed).toBe(true);
      expect(result.isDuplicate).toBe(true); // Reconciled as duplicate
      expect(result.persistedToEventLog).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('allows a subsequent payment attempt with a new transaction ID without suppressing it as a duplicate', async () => {
      // Existing first attempt logged in DB
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'evt_first_attempt',
            created_at: new Date().toISOString(),
            metadata: {
              merchantTransactionId: 'MTX_FIRST_FAIL_111',
              idempotency_key: 'idemp_pay_phonepe_MTX_FIRST_FAIL_111_failed',
              outcome: 'FAILED',
            },
          },
        ],
        error: null,
      });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'order_events') {
          return {
            select: mockSelect,
            eq: mockEq1,
            order: mockOrder,
            limit: mockLimit,
            insert: mockInsert,
          };
        }
        return {};
      });

      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      // Second attempt on the same order with different merchantTransactionId
      const result = await observePaymentOutcome({
        orderId: '00000000-0000-0000-0000-000000000002',
        gateway: 'phonepe',
        merchantTransactionId: 'MTX_SECOND_RETRY_222',
        amount: 3499.0,
        outcome: 'FAILED',
        failureReason: 'USER_CANCELLED',
      });

      expect(result.observed).toBe(true);
      expect(result.isDuplicate).toBe(false); // MUST NOT be suppressed
      expect(result.persistedToEventLog).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('observes payment failure outcome with failure reason', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
        order: mockOrder,
        limit: mockLimit,
        insert: mockInsert,
      });
      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const result = await observePaymentOutcome({
        orderId: '00000000-0000-0000-0000-000000000003',
        gateway: 'paytm',
        merchantTransactionId: 'MTX_PAYTM_FAIL_01',
        amount: 1999.0,
        outcome: 'FAILED',
        failureReason: 'INSUFFICIENT_FUNDS_OR_USER_DROPOFF',
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('PAYMENT_FAILED');
      expect(result.event.payload.failureReason).toBe(
        'INSUFFICIENT_FUNDS_OR_USER_DROPOFF'
      );
    });

    it('correctly captures Partial-COD pre-payment metadata', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
        order: mockOrder,
        limit: mockLimit,
        insert: mockInsert,
      });
      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const result = await observePaymentOutcome({
        orderId: '00000000-0000-0000-0000-000000000004',
        gateway: 'phonepe',
        merchantTransactionId: 'MTX_PARTIAL_COD_01',
        amount: 500.0, // 10% advance deposit
        outcome: 'CONFIRMED',
        isPartialCod: true,
        prepaidAmount: 500.0,
        codBalance: 4500.0,
      });

      expect(result.observed).toBe(true);
      expect(result.event.payload.isPartialCod).toBe(true);
      expect(result.event.payload.prepaidAmount).toBe(500.0);
      expect(result.event.payload.codBalance).toBe(4500.0);
    });
  });

  describe('fetchPaymentEvents', () => {
    it('fetches payment outcome records and normalizes to BusinessEvent array', async () => {
      const mockRows = [
        {
          id: 'pay_evt_001',
          order_id: 'ord_123',
          event_type: 'PAYMENT_ATTEMPTED',
          portal: 'webhook_phonepe',
          performed_by: null,
          metadata: { amount: 2500, merchantTransactionId: 'MTX_001' },
          created_at: '2026-10-26T12:00:00.000Z',
        },
        {
          id: 'pay_evt_002',
          order_id: 'ord_123',
          event_type: 'PAYMENT_CONFIRMED',
          portal: 'webhook_phonepe',
          performed_by: null,
          metadata: { amount: 2500, merchantTransactionId: 'MTX_001' },
          created_at: '2026-10-26T12:01:00.000Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockReturnThis();
      const mockOrder = jest
        .fn()
        .mockResolvedValue({ data: mockRows, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
      });

      const events = await fetchPaymentEvents('ord_123');

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('PAYMENT_ATTEMPTED');
      expect(events[1].eventType).toBe('PAYMENT_CONFIRMED');
    });
  });
});
