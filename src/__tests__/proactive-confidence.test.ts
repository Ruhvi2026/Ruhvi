jest.mock('server-only', () => ({}));

import {
  detectCompetitorPriceSignals,
  detectCheckoutAbandonmentSignals,
} from '@/lib/ai/co-founder/proactive';
import type { CompetitorRecord } from '@/lib/ai/co-founder/competitors';

describe('Proactive Signals Confidence Calibration (Finding D3)', () => {
  const dateBucket = '2026-10-31';

  describe('detectCompetitorPriceSignals', () => {
    it('calibrates confidence to "possible" for competitor with discount notes without recent analysis', async () => {
      const mockCompetitors: CompetitorRecord[] = [
        {
          id: 'comp-1',
          name: 'CaratSpark',
          website_url: 'https://caratspark.com',
          category: 'earrings',
          notes:
            'Customer mentioned they are offering 15% discount on diamond studs',
          last_analyzed_at: null,
          latest_insights: null,
          created_at: '2026-10-01T00:00:00Z',
        },
      ];

      const signals = await detectCompetitorPriceSignals(
        dateBucket,
        mockCompetitors
      );
      expect(signals).toHaveLength(1);

      const signal = signals[0];
      expect(signal.signalType).toBe('competitor_discount_alert');
      expect(signal.confidence).toBe('possible');
      expect(signal.requiresApproval).toBe(true);
      expect(signal.title).toContain(
        'Potential Competitor Promotion: CaratSpark'
      );
      expect(signal.summary).toContain(
        'Stored competitor intelligence for CaratSpark indicates potential promotional discount activity'
      );
      expect(signal.metrics).toMatchObject({
        competitorId: 'comp-1',
        competitorName: 'CaratSpark',
        discountPercent: 15,
        sourceTable: 'co_founder_competitors',
        evidenceType: 'stored_notes',
      });
    });

    it('calibrates confidence to "strong" when competitor was analyzed recently (< 7 days) with high discount', async () => {
      const recentDate = new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000
      ).toISOString();
      const mockCompetitors: CompetitorRecord[] = [
        {
          id: 'comp-2',
          name: 'LuxeGems',
          website_url: 'https://luxegems.com',
          category: 'necklaces',
          notes: null,
          last_analyzed_at: recentDate,
          latest_insights: {
            promotions: 'Diwali Flash Sale: 25% off gold chains',
            strategicCounterMove: 'Highlight 100% BIS hallmarked purity',
          },
          created_at: '2026-10-01T00:00:00Z',
        },
      ];

      const signals = await detectCompetitorPriceSignals(
        dateBucket,
        mockCompetitors
      );
      expect(signals).toHaveLength(1);

      const signal = signals[0];
      expect(signal.confidence).toBe('strong');
      expect(signal.severity).toBe('high');
      expect(signal.metrics?.evidenceType).toBe('competitor_intel_scan');
      expect(signal.metrics?.lastAnalyzedAt).toBe(recentDate);
    });

    it('calibrates confidence to "insufficient_evidence" when analysis is stale (> 30 days)', async () => {
      const staleDate = new Date(
        Date.now() - 40 * 24 * 60 * 60 * 1000
      ).toISOString();
      const mockCompetitors: CompetitorRecord[] = [
        {
          id: 'comp-3',
          name: 'OldJewels',
          website_url: 'https://oldjewels.com',
          category: 'rings',
          notes: 'Old summer discount 20% off',
          last_analyzed_at: staleDate,
          latest_insights: null,
          created_at: '2026-08-01T00:00:00Z',
        },
      ];

      const signals = await detectCompetitorPriceSignals(
        dateBucket,
        mockCompetitors
      );
      expect(signals).toHaveLength(1);
      expect(signals[0].confidence).toBe('insufficient_evidence');
    });

    it('ignores competitors without promotional keywords or discount percentages', async () => {
      const mockCompetitors: CompetitorRecord[] = [
        {
          id: 'comp-4',
          name: 'NeutralJewels',
          website_url: 'https://neutral.com',
          category: 'pendants',
          notes: 'Standard catalog, no active promotions observed',
          last_analyzed_at: new Date().toISOString(),
          latest_insights: null,
          created_at: '2026-10-01T00:00:00Z',
        },
      ];

      const signals = await detectCompetitorPriceSignals(
        dateBucket,
        mockCompetitors
      );
      expect(signals).toHaveLength(0);
    });
  });

  describe('detectCheckoutAbandonmentSignals', () => {
    it('returns no signals when fewer than 3 unconverted carts are detected', async () => {
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'cart_items') {
            return {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'item-1',
                    cart_id: 'cart-1',
                    quantity: 1,
                    product: { name: 'Gold Ring', price: 5000 },
                    carts: { user_id: 'user-1' },
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      };

      const signals = await detectCheckoutAbandonmentSignals(
        dateBucket,
        mockSupabase as any
      );
      expect(signals).toHaveLength(0);
    });

    it('groups multiple items in the same cart and does not falsely inflate cart count', async () => {
      // 4 items, but all in the same cart (cart-1) -> distinct carts = 1 -> should NOT trigger
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'cart_items') {
            return {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'item-1',
                    cart_id: 'cart-1',
                    quantity: 1,
                    product: { price: 2000 },
                    carts: { user_id: 'user-1' },
                  },
                  {
                    id: 'item-2',
                    cart_id: 'cart-1',
                    quantity: 2,
                    product: { price: 3000 },
                    carts: { user_id: 'user-1' },
                  },
                  {
                    id: 'item-3',
                    cart_id: 'cart-1',
                    quantity: 1,
                    product: { price: 1500 },
                    carts: { user_id: 'user-1' },
                  },
                  {
                    id: 'item-4',
                    cart_id: 'cart-1',
                    quantity: 1,
                    product: { price: 4000 },
                    carts: { user_id: 'user-1' },
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      };

      const signals = await detectCheckoutAbandonmentSignals(
        dateBucket,
        mockSupabase as any
      );
      expect(signals).toHaveLength(0);
    });

    it('filters out users who completed an order and triggers with calibrated confidence for true unconverted carts', async () => {
      // 4 carts: user-1, user-2, user-3, user-4
      // user-1 converted to an order!
      // remaining unconverted: user-2, user-3, user-4 (3 carts >= threshold)
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'cart_items') {
            return {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'i1',
                    cart_id: 'c1',
                    quantity: 1,
                    product: { price: 3000 },
                    carts: { user_id: 'user-1' },
                  },
                  {
                    id: 'i2',
                    cart_id: 'c2',
                    quantity: 1,
                    product: { price: 4000 },
                    carts: { user_id: 'user-2' },
                  },
                  {
                    id: 'i3',
                    cart_id: 'c3',
                    quantity: 2,
                    product: { price: 2500 },
                    carts: { user_id: 'user-3' },
                  },
                  {
                    id: 'i4',
                    cart_id: 'c4',
                    quantity: 1,
                    product: { price: 6000 },
                    carts: { user_id: 'user-4' },
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({
                data: [{ user_id: 'user-1' }], // user-1 converted!
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      const signals = await detectCheckoutAbandonmentSignals(
        dateBucket,
        mockSupabase as any
      );
      expect(signals).toHaveLength(1);

      const signal = signals[0];
      // Confidence is 'possible' (or 'strong' if high GMV/cart count), never 'confirmed'
      expect(['possible', 'strong']).toContain(signal.confidence);
      expect(signal.confidence).not.toBe('confirmed');
      expect(signal.title).toContain('Potential Cart Drop-off Spike Detected');
      expect(signal.requiresApproval).toBe(true);
      expect(signal.metrics).toMatchObject({
        abandonedCartsCount: 3,
        totalCartItems: 3,
        totalUnits: 4, // 1 + 2 + 1
        estimatedUnrealizedGmv: 15000, // 4000 + 5000 + 6000
        sourceTable: 'cart_items, carts, orders',
        evidenceType: 'unconverted_cart_session_check',
      });
    });
  });
});
