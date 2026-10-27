jest.mock('server-only', () => ({}));
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import {
  ORDER_STATUS_TO_EVENT,
  observeOrderLifecycleTransition,
  fetchOrderLifecycleEvents,
} from '../order-lifecycle';
import { getServiceClient } from '@/lib/supabase/service';

describe('Order Lifecycle Intelligence Pipeline (Phase 08)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Status to Event Mapping', () => {
    it('maps all standard lifecycle statuses to valid canonical event types', () => {
      expect(ORDER_STATUS_TO_EVENT.pending).toBe('ORDER_CREATED');
      expect(ORDER_STATUS_TO_EVENT.confirmed).toBe('ORDER_CONFIRMED');
      expect(ORDER_STATUS_TO_EVENT.processing).toBe('PACKING_STARTED');
      expect(ORDER_STATUS_TO_EVENT.shipped).toBe('SHIPPED');
      expect(ORDER_STATUS_TO_EVENT.out_for_delivery).toBe('OUT_FOR_DELIVERY');
      expect(ORDER_STATUS_TO_EVENT.delivered).toBe('DELIVERED');
      expect(ORDER_STATUS_TO_EVENT.cancelled).toBe('CANCELLED');
      expect(ORDER_STATUS_TO_EVENT.rto_initiated).toBe('RTO_INITIATED');
      expect(ORDER_STATUS_TO_EVENT.rto_received).toBe('RTO_RECEIVED');
      expect(ORDER_STATUS_TO_EVENT.return_requested).toBe('RETURN_REQUESTED');
      expect(ORDER_STATUS_TO_EVENT.return_approved).toBe('RETURN_APPROVED');
      expect(ORDER_STATUS_TO_EVENT.returned).toBe('RETURN_PICKED');
      expect(ORDER_STATUS_TO_EVENT.refunded).toBe('REFUND_INITIATED');
    });
  });

  describe('observeOrderLifecycleTransition', () => {
    it('observes and records a fresh order transition', async () => {
      // Mock deduplication check: no existing event found
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

      mockEq1.mockReturnValue({
        eq: mockEq2,
      });
      mockEq2.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await observeOrderLifecycleTransition({
        orderId: '00000000-0000-0000-0000-000000000001',
        orderNumber: 'RUV-2026-1001',
        fromStatus: 'pending',
        toStatus: 'confirmed',
        actor: { type: 'staff', id: 'staff_123', name: 'Ops Staff' },
        source: 'orders_portal',
        notes: 'Verified via customer phone confirmation',
      });

      expect(result.observed).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.persistedToEventLog).toBe(true);
      expect(result.event.eventType).toBe('ORDER_CONFIRMED');
      expect(result.event.idempotencyKey).toBe(
        'idemp_order_00000000-0000-0000-0000-000000000001_confirmed'
      );
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('detects duplicate transition and avoids double-inserting to order_events', async () => {
      // Mock deduplication check: existing event already in DB
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [
          { id: 'evt_existing_001', created_at: new Date().toISOString() },
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

      const result = await observeOrderLifecycleTransition({
        orderId: '00000000-0000-0000-0000-000000000001',
        toStatus: 'shipped',
        actor: { type: 'webhook', id: 'shiprocket' },
        source: 'webhook_shiprocket',
        metadata: { awb_code: 'AWB987654321', courier_name: 'BlueDart' },
      });

      expect(result.observed).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(result.persistedToEventLog).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('fetchOrderLifecycleEvents', () => {
    it('fetches and normalizes database rows into canonical BusinessEvent objects', async () => {
      const mockRows = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          order_id: 'ord_abc',
          event_type: 'ORDER_CREATED',
          portal: 'storefront',
          performed_by: null,
          metadata: { total: 2999 },
          created_at: '2026-10-26T10:00:00.000Z',
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          order_id: 'ord_abc',
          event_type: 'ORDER_CONFIRMED',
          portal: 'orders_portal',
          performed_by: 'staff_1',
          metadata: { notes: 'Confirmed' },
          created_at: '2026-10-26T10:30:00.000Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest
        .fn()
        .mockResolvedValue({ data: mockRows, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const events = await fetchOrderLifecycleEvents('ord_abc');

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('ORDER_CREATED');
      expect(events[0].id).toBe('evt_db_11111111-1111-1111-1111-111111111111');
      expect(events[0].actor.type).toBe('system');
      expect(events[1].eventType).toBe('ORDER_CONFIRMED');
      expect(events[1].actor.type).toBe('staff');
    });
  });
});
