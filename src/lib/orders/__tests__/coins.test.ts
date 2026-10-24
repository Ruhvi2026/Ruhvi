import {
  awardCoinsForDeliveredOrder,
  clawbackCoinsForCancelledOrReturnedOrder,
} from '../coins';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

import { getServiceClient } from '@/lib/supabase/service';

describe('Coins Engine', () => {
  let mockSupabase: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('awardCoinsForDeliveredOrder', () => {
    it('returns false when order does not exist or has no user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await awardCoinsForDeliveredOrder('non-existent');
      expect(result.awarded).toBe(false);
      expect(result.coins).toBe(0);
    });

    it('prevents duplicate awarding when coins were already granted', async () => {
      // 1. Order found
      const orderSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'ord-1',
              user_id: 'usr-1',
              order_number: 'RHV-1001',
              subtotal: 500,
            },
            error: null,
          }),
        }),
      };
      // 2. Existing grant found
      const ledgerSelect = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'grant-existing' },
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders')
          return { select: jest.fn().mockReturnValue(orderSelect) };
        if (table === 'reward_coin_ledger')
          return { select: jest.fn().mockReturnValue(ledgerSelect) };
        return {};
      });

      const result = await awardCoinsForDeliveredOrder('ord-1');
      expect(result.awarded).toBe(false);
      expect(result.coins).toBe(0);
    });

    it('awards standard 10x coins for non-VIP customers', async () => {
      const orderSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'ord-1',
              user_id: 'usr-1',
              order_number: 'RHV-1001',
              subtotal: 500,
            },
            error: null,
          }),
        }),
      };

      const ledgerSelect = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      const userSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'usr-1', is_vip: false, vip_expires_at: null },
            error: null,
          }),
        }),
      };

      const ledgerInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders')
          return { select: jest.fn().mockReturnValue(orderSelect) };
        if (table === 'reward_coin_ledger') {
          return {
            select: jest.fn().mockReturnValue(ledgerSelect),
            insert: ledgerInsert,
          };
        }
        if (table === 'users')
          return { select: jest.fn().mockReturnValue(userSelect) };
        return {};
      });

      // 500 subtotal * 10 multiplier = 5000 coins (₹500 value / 10% = ₹50 value in coins)
      const result = await awardCoinsForDeliveredOrder('ord-1');
      expect(result.awarded).toBe(true);
      expect(result.isVip).toBe(false);
      expect(result.coins).toBe(5000);
      expect(ledgerInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'usr-1',
          amount: 5000,
          type: 'earned',
        })
      );
    });

    it('awards 20x (2X) coins for active VIP customers', async () => {
      const orderSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'ord-vip',
              user_id: 'usr-vip',
              order_number: 'RHV-VIP1',
              subtotal: 1000,
            },
            error: null,
          }),
        }),
      };

      const ledgerSelect = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      const userSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'usr-vip',
              is_vip: true,
              vip_expires_at: new Date(Date.now() + 864000000).toISOString(),
            },
            error: null,
          }),
        }),
      };

      const ledgerInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders')
          return { select: jest.fn().mockReturnValue(orderSelect) };
        if (table === 'reward_coin_ledger') {
          return {
            select: jest.fn().mockReturnValue(ledgerSelect),
            insert: ledgerInsert,
          };
        }
        if (table === 'users')
          return { select: jest.fn().mockReturnValue(userSelect) };
        return {};
      });

      // 1000 subtotal * 20 multiplier = 20,000 coins (2X Privé bonus)
      const result = await awardCoinsForDeliveredOrder('ord-vip');
      expect(result.awarded).toBe(true);
      expect(result.isVip).toBe(true);
      expect(result.coins).toBe(20000);
      expect(ledgerInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'usr-vip',
          amount: 20000,
          type: 'earned',
          description: expect.stringContaining('2X Reward Coins (Ruhvi Privé)'),
        })
      );
    });
  });

  describe('clawbackCoinsForCancelledOrReturnedOrder', () => {
    it('returns false when no previous coins were earned for the order', async () => {
      const orderSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'ord-1', user_id: 'usr-1', order_number: 'RHV-1001' },
            error: null,
          }),
        }),
      };

      const ledgerSelect = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders')
          return { select: jest.fn().mockReturnValue(orderSelect) };
        if (table === 'reward_coin_ledger')
          return { select: jest.fn().mockReturnValue(ledgerSelect) };
        return {};
      });

      const result = await clawbackCoinsForCancelledOrReturnedOrder(
        'ord-1',
        'cancelled'
      );
      expect(result.reversed).toBe(false);
      expect(result.coins).toBe(0);
    });

    it('successfully reverses granted coins on return', async () => {
      const orderSelect = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'ord-1', user_id: 'usr-1', order_number: 'RHV-1001' },
            error: null,
          }),
        }),
      };

      // 1. Previously granted coins
      const grantsSelect = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({
          data: [{ id: 'grant-1', amount: 5000 }],
          error: null,
        }),
      };

      // 2. Existing reversal check
      const reversalCheckSelect = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      const ledgerInsert = jest.fn().mockResolvedValue({ error: null });

      let ledgerCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders')
          return { select: jest.fn().mockReturnValue(orderSelect) };
        if (table === 'reward_coin_ledger') {
          ledgerCallCount++;
          if (ledgerCallCount === 1) {
            return { select: jest.fn().mockReturnValue(grantsSelect) };
          }
          if (ledgerCallCount === 2) {
            return { select: jest.fn().mockReturnValue(reversalCheckSelect) };
          }
          return { insert: ledgerInsert };
        }
        return {};
      });

      const result = await clawbackCoinsForCancelledOrReturnedOrder(
        'ord-1',
        'returned'
      );
      expect(result.reversed).toBe(true);
      expect(result.coins).toBe(5000);
      expect(ledgerInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'usr-1',
          amount: 5000,
          type: 'redeemed',
          description: expect.stringContaining(
            'Reward Coins Clawback Reversal'
          ),
        })
      );
    });
  });
});
