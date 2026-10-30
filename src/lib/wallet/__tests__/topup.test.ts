import {
  calculateTopUpBonus,
  generateMerchantTransactionId,
  creditWalletTopUp,
} from '../topup';

// Mock Supabase admin client
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

jest.mock('@/lib/notifications/service', () => ({
  createAndSendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

describe('Wallet Top-Up Service & Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WALLET_INTERNAL_SECRET = 'secure_configured_wallet_secret';
  });

  describe('Bonus Calculation Rules', () => {
    it('awards correct bonus based on slab tiers', () => {
      expect(calculateTopUpBonus(10000)).toBe(600);
      expect(calculateTopUpBonus(15000)).toBe(600);
      expect(calculateTopUpBonus(5000)).toBe(250);
      expect(calculateTopUpBonus(7500)).toBe(250);
      expect(calculateTopUpBonus(2500)).toBe(100);
      expect(calculateTopUpBonus(4999)).toBe(100);
      expect(calculateTopUpBonus(2499)).toBe(0);
      expect(calculateTopUpBonus(500)).toBe(0);
    });
  });

  describe('Merchant Transaction ID Generation', () => {
    it('generates unique transaction IDs prefixed with WT_', () => {
      const id1 = generateMerchantTransactionId();
      const id2 = generateMerchantTransactionId();
      expect(id1.startsWith('WT_')).toBe(true);
      expect(id2.startsWith('WT_')).toBe(true);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Wallet Credit Invocation', () => {
    it('passes configured WALLET_INTERNAL_SECRET to the RPC call', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'topup_123',
            user_id: 'usr_abc',
            amount: 5000,
            bonus_amount: 250,
            merchant_transaction_id: 'WT_test_001',
            status: 'pending',
          },
          error: null,
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await creditWalletTopUp('WT_test_001', {
        phonepeTransactionId: 'PPT_123',
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'wallet_topup',
        expect.objectContaining({
          p_user_id: 'usr_abc',
          p_amount: 5000,
          p_type: 'credit',
          p_secret: 'secure_configured_wallet_secret',
        })
      );
      expect(result.status).toBe('paid');
    });
  });
});
