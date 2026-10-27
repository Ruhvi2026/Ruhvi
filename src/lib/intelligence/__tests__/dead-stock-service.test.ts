jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('../inventory-demand-service', () => {
  const actual = jest.requireActual('../inventory-demand-service');
  return {
    ...actual,
    getSkuDemandMetrics: jest.fn(),
  };
});

import { getServiceClient } from '@/lib/supabase/service';
import { getSkuDemandMetrics } from '../inventory-demand-service';
import {
  evaluateStockAgingAndMovement,
  getSkuAgingAnalysis,
  type SkuAgingInput,
} from '../dead-stock-service';

describe('Dead & Slow-Moving Stock Detection Engine (Track G - Phase 37)', () => {
  const evaluatedAt = '2026-10-27T00:00:00.000Z';
  const productId = 'prod_emerald_choker_01';
  const sku = 'CK-EMR-001';

  describe('Core Business Rules & Classification', () => {
    it('classifies as NOT_APPLICABLE when on-hand stock is zero', () => {
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        onHandStock: 0,
        price: 85000,
        lastSaleDate: '2025-02-01T00:00:00.000Z',
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('NOT_APPLICABLE');
      expect(res.severity).toBe('NONE');
      expect(res.capitalTiedUp).toBe(0);
      expect(res.rulesTriggered).toContain(
        'Product currently has zero on-hand stock (not holding dead inventory).'
      );
    });

    it('classifies as NEW_LAUNCH_MONITORING when catalogued < 30 days ago (anti-false-positive)', () => {
      // Catalogued 15 days ago
      const recentCreatedAt = '2026-10-12T00:00:00.000Z';

      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: recentCreatedAt,
        onHandStock: 8,
        price: 85000,
        lastSaleDate: null, // Never sold yet
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('NEW_LAUNCH_MONITORING');
      expect(res.severity).toBe('NONE');
      expect(res.rulesTriggered[0]).toContain(
        '< 30 days minimum observation window'
      );
      expect(res.recommendedReviewActions).toContain(
        'Continue launch monitoring; verify campaign traffic and conversion funnel.'
      );
    });

    it('classifies as DEAD_STOCK with CRITICAL severity when never sold and >= 90 days old', () => {
      // Catalogued 100 days ago (2026-07-19)
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2026-07-19T00:00:00.000Z',
        onHandStock: 5,
        price: 50000,
        costPrice: 30000,
        lastSaleDate: null,
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('DEAD_STOCK');
      expect(res.severity).toBe('CRITICAL');
      expect(res.neverSold).toBe(true);
      expect(res.capitalTiedUp).toBe(150000); // 5 units * 30000 cost
      expect(res.rulesTriggered[0]).toContain(
        'Zero lifetime sales recorded since cataloguing'
      );
      expect(res.recommendedReviewActions.length).toBeGreaterThan(0);
    });

    it('classifies as SLOW_MOVING when never sold and 45-89 days old', () => {
      // Catalogued 60 days ago
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2026-08-28T00:00:00.000Z',
        onHandStock: 4,
        price: 50000,
        lastSaleDate: null,
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('SLOW_MOVING');
      expect(res.severity).toBe('HIGH');
      expect(res.neverSold).toBe(true);
    });

    it('classifies as AT_RISK when never sold and 30-44 days old', () => {
      // Catalogued 35 days ago
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2026-09-22T00:00:00.000Z',
        onHandStock: 4,
        price: 50000,
        lastSaleDate: null,
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('AT_RISK');
      expect(res.severity).toBe('MEDIUM');
    });
  });

  describe('Products With Previous Sales History', () => {
    it('classifies as DEAD_STOCK when last sale was >= 90 days ago', () => {
      // Last sale 100 days ago
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        onHandStock: 6,
        price: 60000,
        lastSaleDate: '2026-07-19T00:00:00.000Z',
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('DEAD_STOCK');
      expect(res.severity).toBe('CRITICAL');
      expect(res.neverSold).toBe(false);
      expect(res.daysSinceLastSale).toBe(100);
      expect(res.rulesTriggered[0]).toContain('No sales recorded in 100 days');
    });

    it('classifies as SLOW_MOVING when last sale was between 45 and 89 days ago', () => {
      // Last sale 55 days ago
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        onHandStock: 3,
        price: 40000,
        lastSaleDate: '2026-09-02T00:00:00.000Z',
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('SLOW_MOVING');
      expect(res.severity).toBe('HIGH');
      expect(res.daysSinceLastSale).toBe(55);
    });

    it('classifies as AT_RISK when last sale was between 30 and 44 days ago', () => {
      // Last sale 35 days ago
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        onHandStock: 3,
        price: 40000,
        lastSaleDate: '2026-09-22T00:00:00.000Z',
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('AT_RISK');
      expect(res.severity).toBe('MEDIUM');
      expect(res.daysSinceLastSale).toBe(35);
    });

    it('classifies as HEALTHY when last sale was within 30 days and velocity is balanced', () => {
      // Last sale 5 days ago
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        onHandStock: 10,
        price: 40000,
        lastSaleDate: '2026-10-22T00:00:00.000Z',
        demandMetrics: {
          productId,
          sku,
          windowDays: 30,
          windowStart: '2026-09-27T00:00:00.000Z',
          windowEnd: evaluatedAt,
          grossUnitsSold: 15,
          cancelledUnitsOmitted: 0,
          returnedUnitsSubtracted: 0,
          netUnitsSold: 15,
          grossRevenue: 600000,
          netRevenue: 600000,
          orderCount: 8,
          averageSellingPrice: 40000,
          rawDailySales: 0.5,
          inStockDays: 30,
          outOfStockDays: 0,
          inStockDailySales: 0.5,
          stockoutFraction: 0,
          classification: 'ACTIVE_DEMAND',
          classificationReason: 'Healthy demand',
          trend: 'STEADY',
          confidenceScore: 0.9,
          evaluatedAt,
          dataFreshness: 'Authoritative live ledger',
        },
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('HEALTHY');
      expect(res.severity).toBe('NONE');
      expect(res.evidence.projectedMonthsToClear).toBe(0.7); // 10 / 0.5 = 20 days = ~0.7 months
    });

    it('classifies as SLOW_MOVING when sales occurred in 30 days but supply exceeds 6 months', () => {
      // Last sale 10 days ago, but 30 units on hand and velocity is only 0.05 units/day (600 days = 20 months)
      const input: SkuAgingInput = {
        productId,
        sku,
        productName: 'Royal Emerald Choker',
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        onHandStock: 30,
        price: 40000,
        lastSaleDate: '2026-10-17T00:00:00.000Z',
        demandMetrics: {
          productId,
          sku,
          windowDays: 30,
          windowStart: '2026-09-27T00:00:00.000Z',
          windowEnd: evaluatedAt,
          grossUnitsSold: 1,
          cancelledUnitsOmitted: 0,
          returnedUnitsSubtracted: 0,
          netUnitsSold: 1,
          grossRevenue: 40000,
          netRevenue: 40000,
          orderCount: 1,
          averageSellingPrice: 40000,
          rawDailySales: 0.03,
          inStockDays: 30,
          outOfStockDays: 0,
          inStockDailySales: 0.05,
          stockoutFraction: 0,
          classification: 'ACTIVE_DEMAND',
          classificationReason: 'Sluggish demand',
          trend: 'STEADY',
          confidenceScore: 0.6,
          evaluatedAt,
          dataFreshness: 'Authoritative live ledger',
        },
        evaluatedAt,
      };

      const res = evaluateStockAgingAndMovement(input);

      expect(res.classification).toBe('SLOW_MOVING');
      expect(res.severity).toBe('MEDIUM');
      expect(res.evidence.projectedMonthsToClear).toBeGreaterThan(6);
      expect(res.rulesTriggered[0]).toContain(
        'inventory clearing rate is sluggish'
      );
    });
  });

  describe('Database Service Integration: getSkuAgingAnalysis()', () => {
    it('queries authoritative product and orders from Supabase and produces finding', async () => {
      const mockSupabase = {
        from: jest.fn((table: string) => {
          if (table === 'products') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: productId,
                  sku,
                  name: 'Royal Emerald Choker',
                  category_id: 'cat_necklaces',
                  price: 75000,
                  stock_quantity: 6,
                  created_at: '2025-01-01T00:00:00.000Z',
                  categories: { name: 'Necklaces' },
                },
                error: null,
              }),
            };
          }
          if (table === 'order_items') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    created_at: '2026-07-01T10:00:00.000Z',
                    orders: { status: 'delivered' },
                  },
                ],
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
      (getSkuDemandMetrics as jest.Mock).mockResolvedValue(null);

      const res = await getSkuAgingAnalysis(productId);

      expect(res.productId).toBe(productId);
      expect(res.categoryName).toBe('Necklaces');
      expect(res.onHandStock).toBe(6);
      expect(res.classification).toBe('DEAD_STOCK');
    });
  });
});
