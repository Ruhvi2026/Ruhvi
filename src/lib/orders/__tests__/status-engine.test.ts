import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  transitionOrder,
} from '../status-engine';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/notifications/service', () => ({
  createAndSendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

import { getServiceClient } from '@/lib/supabase/service';

describe('OrderStatusEngine', () => {
  describe('Transition Graph Structure', () => {
    it('defines all valid order statuses in ORDER_STATUSES', () => {
      expect(ORDER_STATUSES).toContain('pending');
      expect(ORDER_STATUSES).toContain('confirmed');
      expect(ORDER_STATUSES).toContain('processing');
      expect(ORDER_STATUSES).toContain('shipped');
      expect(ORDER_STATUSES).toContain('out_for_delivery');
      expect(ORDER_STATUSES).toContain('delivered');
      expect(ORDER_STATUSES).toContain('cancelled');
      expect(ORDER_STATUSES).toContain('refunded');
    });

    it('enforces terminal states for cancelled and refunded orders', () => {
      expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
      expect(ORDER_TRANSITIONS.refunded).toEqual([]);
    });

    it('allows valid progressive fulfillment lifecycle', () => {
      expect(ORDER_TRANSITIONS.pending).toContain('confirmed');
      expect(ORDER_TRANSITIONS.confirmed).toContain('processing');
      expect(ORDER_TRANSITIONS.processing).toContain('shipped');
      expect(ORDER_TRANSITIONS.shipped).toContain('out_for_delivery');
      expect(ORDER_TRANSITIONS.out_for_delivery).toContain('delivered');
    });
  });

  describe('transitionOrder', () => {
    let mockSupabase: Record<string, jest.Mock>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockSupabase = {
        from: jest.fn(),
      };
      (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    it('returns error when order is not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await transitionOrder({
        orderId: 'non-existent-order',
        newStatus: 'confirmed',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Order not found');
    });

    it('is idempotent when order is already in the requested status', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'ord-123',
                user_id: 'usr-1',
                status: 'confirmed',
                payment_method: 'phonepe',
                payment_status: 'paid',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await transitionOrder({
        orderId: 'ord-123',
        newStatus: 'confirmed',
      });

      expect(result.ok).toBe(true);
      expect(result.alreadyInState).toBe(true);
      expect(result.status).toBe('confirmed');
    });

    it('rejects disallowed transitions with error message', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'ord-123',
                user_id: 'usr-1',
                status: 'delivered',
                payment_method: 'phonepe',
                payment_status: 'paid',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await transitionOrder({
        orderId: 'ord-123',
        newStatus: 'pending',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid transition: delivered -> pending');
    });

    it('successfully transitions from pending to confirmed', async () => {
      const selectChain = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'ord-123',
              user_id: 'usr-1',
              status: 'pending',
              payment_method: 'phonepe',
              payment_status: 'pending',
            },
            error: null,
          }),
        }),
      };

      const updateChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'ord-123' }],
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue(selectChain),
            update: jest.fn().mockReturnValue(updateChain),
          };
        }
        if (table === 'order_events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest
                      .fn()
                      .mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await transitionOrder({
        orderId: 'ord-123',
        newStatus: 'confirmed',
        performedBy: 'admin-user',
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe('confirmed');
    });

    it('returns error when concurrent update changes order status in flight', async () => {
      const selectChain = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'ord-123',
              user_id: 'usr-1',
              status: 'pending',
              payment_method: 'phonepe',
              payment_status: 'pending',
            },
            error: null,
          }),
        }),
      };

      const updateChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [], // 0 rows updated because status changed concurrently
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue(selectChain),
            update: jest.fn().mockReturnValue(updateChain),
          };
        }
        if (table === 'order_events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest
                      .fn()
                      .mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await transitionOrder({
        orderId: 'ord-123',
        newStatus: 'confirmed',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Concurrent status change detected');
    });
  });
});
