jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import { getServiceClient } from '@/lib/supabase/service';
import {
  calculateSkuDemandMetrics,
  getSkuDemandMetrics,
  type RawOrderItemRecord,
} from '../inventory-demand-service';

describe('Inventory Demand Metrics Service (Track G - Phase 35)', () => {
  const evaluatedAt = '2026-10-27T00:00:00.000Z';
  const sampleProductId = 'prod_necklace_001';
  const sampleSku = 'NK-GLD-001';

  describe('Sold-Unit Treatment & Status Exclusions', () => {
    it('accurately counts valid orders and excludes cancelled/failed orders', () => {
      const orderItems: RawOrderItemRecord[] = [
        {
          orderId: 'ord_01',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 2,
          priceAtPurchase: 50000,
          orderStatus: 'delivered',
          createdAt: '2026-10-15T10:00:00.000Z',
        },
        {
          orderId: 'ord_02',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 1,
          priceAtPurchase: 50000,
          orderStatus: 'shipped',
          createdAt: '2026-10-18T12:00:00.000Z',
        },
        // Cancelled order (should be omitted)
        {
          orderId: 'ord_03',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 3,
          priceAtPurchase: 50000,
          orderStatus: 'cancelled',
          createdAt: '2026-10-20T14:00:00.000Z',
        },
        // Failed payment order (should be omitted)
        {
          orderId: 'ord_04',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 1,
          priceAtPurchase: 50000,
          orderStatus: 'failed',
          createdAt: '2026-10-22T08:00:00.000Z',
        },
      ];

      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 15,
        lowStockThreshold: 3,
        windowDays: 30,
        orderItems,
        evaluatedAt,
      });

      expect(metrics.grossUnitsSold).toBe(3);
      expect(metrics.cancelledUnitsOmitted).toBe(4); // 3 cancelled + 1 failed
      expect(metrics.returnedUnitsSubtracted).toBe(0);
      expect(metrics.netUnitsSold).toBe(3);
      expect(metrics.grossRevenue).toBe(150000);
      expect(metrics.netRevenue).toBe(150000);
      expect(metrics.orderCount).toBe(2);
      expect(metrics.averageSellingPrice).toBe(50000);
      expect(metrics.classification).toBe('ACTIVE_DEMAND');
    });

    it('nets out returned and refunded items from netUnitsSold', () => {
      const orderItems: RawOrderItemRecord[] = [
        {
          orderId: 'ord_01',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 5,
          priceAtPurchase: 20000,
          orderStatus: 'delivered',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        // Return item
        {
          orderId: 'ord_02',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 2,
          priceAtPurchase: 20000,
          orderStatus: 'returned',
          createdAt: '2026-10-12T11:00:00.000Z',
          isReturned: true,
        },
      ];

      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 10,
        lowStockThreshold: 2,
        windowDays: 30,
        orderItems,
        evaluatedAt,
      });

      expect(metrics.grossUnitsSold).toBe(7);
      expect(metrics.returnedUnitsSubtracted).toBe(2);
      expect(metrics.netUnitsSold).toBe(5);
      expect(metrics.grossRevenue).toBe(140000);
      expect(metrics.netRevenue).toBe(100000);
      expect(metrics.averageSellingPrice).toBe(20000);
    });
  });

  describe('Stockout-Adjusted Sales Velocity', () => {
    it('computes both rawDailySales and unconstrained inStockDailySales', () => {
      // 10 units sold across 30 days, but product was out of stock for 10 days (20 in-stock days)
      const orderItems: RawOrderItemRecord[] = [
        {
          orderId: 'ord_01',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 10,
          priceAtPurchase: 10000,
          orderStatus: 'delivered',
          createdAt: '2026-10-15T10:00:00.000Z',
        },
      ];

      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 5,
        lowStockThreshold: 2,
        windowDays: 30,
        outOfStockDays: 10,
        orderItems,
        evaluatedAt,
      });

      expect(metrics.inStockDays).toBe(20);
      expect(metrics.outOfStockDays).toBe(10);
      expect(metrics.stockoutFraction).toBe(0.33);

      // Raw rate: 10 / 30 = 0.33
      expect(metrics.rawDailySales).toBe(0.33);
      // In-stock (unconstrained) rate: 10 / 20 = 0.50
      expect(metrics.inStockDailySales).toBe(0.5);
    });
  });

  describe('Minimum-Data Rule & Zero Demand Disambiguation', () => {
    it('classifies as ZERO_DEMAND when in stock for >= minActiveDays with 0 sales', () => {
      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 25,
        lowStockThreshold: 5,
        windowDays: 30,
        outOfStockDays: 0, // Available full 30 days
        orderItems: [], // No sales
        evaluatedAt,
      });

      expect(metrics.netUnitsSold).toBe(0);
      expect(metrics.classification).toBe('ZERO_DEMAND');
      expect(metrics.classificationReason).toContain(
        'Zero units sold despite 30 active in-stock days'
      );
      expect(metrics.rawDailySales).toBe(0);
      expect(metrics.inStockDailySales).toBe(0);
    });

    it('classifies as INSUFFICIENT_DATA when product was catalogued < minActiveDays ago', () => {
      // Catalogued 3 days before evaluation
      const recentCreatedAt = '2026-10-24T00:00:00.000Z';

      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: recentCreatedAt,
        currentStock: 10,
        lowStockThreshold: 2,
        windowDays: 30,
        minActiveDays: 7,
        orderItems: [],
        evaluatedAt,
      });

      expect(metrics.classification).toBe('INSUFFICIENT_DATA');
      expect(metrics.classificationReason).toContain(
        'minimum required: 7 days'
      );
      expect(metrics.trend).toBe('INSUFFICIENT_DATA');
      expect(metrics.confidenceScore).toBeLessThanOrEqual(0.2);
    });

    it('classifies as STOCKOUT_CONSTRAINED when zero sales occurred due to severe stockout', () => {
      // Out of stock for 26 out of 30 days (> 75% of window)
      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 0,
        lowStockThreshold: 2,
        windowDays: 30,
        outOfStockDays: 26,
        orderItems: [],
        evaluatedAt,
      });

      expect(metrics.classification).toBe('STOCKOUT_CONSTRAINED');
      expect(metrics.classificationReason).toContain(
        'out of stock for 26/30 days'
      );
      expect(metrics.confidenceScore).toBeLessThanOrEqual(0.4);
    });
  });

  describe('Trend Calculation', () => {
    it('detects ACCELERATING trend when second half has higher demand', () => {
      const orderItems: RawOrderItemRecord[] = [
        // Prior half (15-30 days ago): 2 units
        {
          orderId: 'ord_01',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 2,
          priceAtPurchase: 5000,
          orderStatus: 'delivered',
          createdAt: '2026-10-05T10:00:00.000Z',
        },
        // Recent half (last 15 days): 8 units (+300%)
        {
          orderId: 'ord_02',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 8,
          priceAtPurchase: 5000,
          orderStatus: 'delivered',
          createdAt: '2026-10-20T10:00:00.000Z',
        },
      ];

      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 20,
        lowStockThreshold: 5,
        windowDays: 30,
        orderItems,
        evaluatedAt,
      });

      expect(metrics.trend).toBe('ACCELERATING');
    });

    it('detects DECELERATING trend when second half has lower demand', () => {
      const orderItems: RawOrderItemRecord[] = [
        // Prior half: 10 units
        {
          orderId: 'ord_01',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 10,
          priceAtPurchase: 5000,
          orderStatus: 'delivered',
          createdAt: '2026-10-05T10:00:00.000Z',
        },
        // Recent half: 2 units (-80%)
        {
          orderId: 'ord_02',
          productId: sampleProductId,
          sku: sampleSku,
          quantity: 2,
          priceAtPurchase: 5000,
          orderStatus: 'delivered',
          createdAt: '2026-10-20T10:00:00.000Z',
        },
      ];

      const metrics = calculateSkuDemandMetrics({
        productId: sampleProductId,
        sku: sampleSku,
        productCreatedAt: '2025-01-01T00:00:00.000Z',
        currentStock: 20,
        lowStockThreshold: 5,
        windowDays: 30,
        orderItems,
        evaluatedAt,
      });

      expect(metrics.trend).toBe('DECELERATING');
    });
  });

  describe('Database Service Integration: getSkuDemandMetrics()', () => {
    it('fetches product and orders from Supabase service client and computes demand', async () => {
      const mockSupabase = {
        from: jest.fn((table: string) => {
          if (table === 'products') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: sampleProductId,
                  sku: sampleSku,
                  stock_quantity: 14,
                  low_stock_threshold: 3,
                  created_at: '2025-06-01T00:00:00.000Z',
                },
                error: null,
              }),
            };
          }
          if (table === 'order_items') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockResolvedValue({
                data: [
                  {
                    order_id: 'ord_live_01',
                    product_id: sampleProductId,
                    sku: sampleSku,
                    quantity: 4,
                    price_at_purchase: 12000,
                    created_at: new Date(
                      Date.now() - 5 * 24 * 60 * 60 * 1000
                    ).toISOString(),
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

      const res = await getSkuDemandMetrics(sampleProductId);

      expect(res.productId).toBe(sampleProductId);
      expect(res.sku).toBe(sampleSku);
      expect(res.netUnitsSold).toBe(4);
      expect(res.classification).toBe('ACTIVE_DEMAND');
      expect(res.dataFreshness).toBe('Authoritative live ledger');
    });

    it('throws error when product does not exist in Supabase', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };

      (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(getSkuDemandMetrics('non_existent_prod')).rejects.toThrow(
        'Product non_existent_prod not found'
      );
    });
  });
});
