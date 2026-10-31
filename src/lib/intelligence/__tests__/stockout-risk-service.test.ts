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
import {
  getSkuDemandMetrics,
  type SkuDemandMetrics,
} from '../inventory-demand-service';
import {
  calculateStockoutRisk,
  getSkuStockoutRisk,
} from '../stockout-risk-service';

describe('Stock-Out Risk Estimation Engine (Track G - Phase 36)', () => {
  const evaluatedAt = '2026-10-27T00:00:00.000Z';
  const productId = 'prod_diamond_bangle_01';
  const sku = 'BG-DIA-001';

  const createMockDemandMetrics = (
    overrides?: Partial<SkuDemandMetrics>
  ): SkuDemandMetrics => ({
    productId,
    sku,
    windowDays: 30,
    windowStart: '2026-09-27T00:00:00.000Z',
    windowEnd: evaluatedAt,
    grossUnitsSold: 30,
    cancelledUnitsOmitted: 0,
    returnedUnitsSubtracted: 0,
    netUnitsSold: 30,
    grossRevenue: 900000,
    netRevenue: 900000,
    orderCount: 15,
    averageSellingPrice: 30000,
    rawDailySales: 1.0,
    inStockDays: 30,
    outOfStockDays: 0,
    inStockDailySales: 1.0,
    stockoutFraction: 0,
    classification: 'ACTIVE_DEMAND',
    classificationReason: 'Active steady sales recorded',
    trend: 'STEADY',
    confidenceScore: 0.9,
    evaluatedAt,
    dataFreshness: 'Authoritative live ledger',
    ...overrides,
  });

  describe('Deterministic Risk Tiers Based on Lead Time', () => {
    it('classifies as CRITICAL_STOCKOUT when sellable stock is zero or negative', () => {
      const demand = createMockDemandMetrics();

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 0,
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.riskLevel).toBe('CRITICAL_STOCKOUT');
      expect(res.sellableStock).toBe(0);
      expect(res.estimatedRunoutDays).toBe(0);
      expect(res.confidence).toBe('HIGH');
      expect(res.confidenceScore).toBe(1.0);
    });

    it('classifies as IMMINENT_RISK when runout is within supplier lead time', () => {
      // 5 units sellable, 1.0 daily demand = 5 days runout <= 10 days lead time
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 5,
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.riskLevel).toBe('IMMINENT_RISK');
      expect(res.estimatedRunoutDays).toBe(5);
      expect(res.estimatedStockoutDate).toBe('2026-11-01T00:00:00.000Z');
    });

    it('classifies as ELEVATED_RISK when runout is within 2x lead time', () => {
      // 15 units sellable, 1.0 daily demand = 15 days runout (between 10 and 20 days)
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 15,
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.riskLevel).toBe('ELEVATED_RISK');
      expect(res.estimatedRunoutDays).toBe(15);
      expect(res.estimatedStockoutDate).toBe('2026-11-11T00:00:00.000Z');
    });

    it('classifies as STABLE when runout comfortably exceeds 2x lead time', () => {
      // 40 units sellable, 1.0 daily demand = 40 days runout > 20 days (2x lead time)
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 40,
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.riskLevel).toBe('STABLE');
      expect(res.estimatedRunoutDays).toBe(40);
    });
  });

  describe('Handling Stock Reservations & Safety Buffers', () => {
    it('deducts reserved stock from onHandStock to calculate sellableStock', () => {
      const demand = createMockDemandMetrics({ inStockDailySales: 2.0 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 10,
        reservedStock: 4, // 6 sellable units
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.sellableStock).toBe(6);
      expect(res.estimatedRunoutDays).toBe(3); // 6 / 2 = 3 days
      expect(res.confidenceLimitations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('4 unit(s) currently reserved'),
        ])
      );
    });

    it('flags warning when sellable stock is at or below the safety buffer', () => {
      const demand = createMockDemandMetrics();

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 2,
        lowStockThreshold: 3,
        supplierLeadTimeDays: 7,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.confidenceLimitations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at or below the safety threshold'),
        ])
      );
    });
  });

  describe('Handling Zero Demand & Insufficient Data', () => {
    it('classifies as LOW_DEMAND_STABLE when verified zero sales observed', () => {
      const demand = createMockDemandMetrics({
        classification: 'ZERO_DEMAND',
        netUnitsSold: 0,
        rawDailySales: 0,
        inStockDailySales: 0,
      });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 20,
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.riskLevel).toBe('LOW_DEMAND_STABLE');
      expect(res.estimatedRunoutDays).toBeNull();
      expect(res.estimatedStockoutDate).toBeNull();
    });

    it('classifies as INDETERMINATE with caveats when insufficient data exists', () => {
      const demand = createMockDemandMetrics({
        classification: 'INSUFFICIENT_DATA',
        netUnitsSold: 0,
        rawDailySales: 0,
        inStockDailySales: 0,
        confidenceScore: 0.1,
      });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 15,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.riskLevel).toBe('INDETERMINATE');
      expect(res.confidence).toBe('INDETERMINATE');
      expect(res.estimatedRunoutDays).toBeNull();
      expect(res.confidenceScore).toBeLessThanOrEqual(0.2);
    });
  });

  describe('Trend Acceleration & Sample Size Confidence Limitations', () => {
    it('applies trend acceleration factor (+25%) when trend is ACCELERATING', () => {
      // Base: 2.0 units/day. Accelerating -> 2.5 units/day.
      // Stock: 10 units. Runout: floor(10 / 2.5) = 4 days (instead of 5).
      const demand = createMockDemandMetrics({
        inStockDailySales: 2.0,
        trend: 'ACCELERATING',
      });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 10,
        supplierLeadTimeDays: 7,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.rateType).toBe('trend_accelerated');
      expect(res.dailyDemandRateUsed).toBe(2.5);
      expect(res.estimatedRunoutDays).toBe(4);
      expect(res.confidenceLimitations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Demand velocity is accelerating'),
        ])
      );
    });

    it('reduces confidence to LOW and logs warning for small sample sizes', () => {
      const demand = createMockDemandMetrics({
        orderCount: 1, // Only 1 order!
        inStockDays: 10, // Only 10 in-stock days
        confidenceScore: 0.8,
      });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 20,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.confidence).toBe('LOW');
      expect(res.confidenceScore).toBeLessThanOrEqual(0.4);
      expect(res.confidenceLimitations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Low order sample size (1 order(s))'),
          expect.stringContaining(
            'Limited in-stock observation period (10 days)'
          ),
        ])
      );
    });
  });

  describe('Sparse Data, Edge Cases & Review-Only Guardrails', () => {
    it('handles edge case when reserved stock equals or exceeds onHandStock', () => {
      const demand = createMockDemandMetrics({ inStockDailySales: 1.5 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 5,
        reservedStock: 7, // Exceeds on-hand!
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.sellableStock).toBe(0);
      expect(res.riskLevel).toBe('CRITICAL_STOCKOUT');
      expect(res.estimatedRunoutDays).toBe(0);
      expect(res.confidenceLimitations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('all 5 on-hand unit(s) are reserved'),
        ])
      );
    });

    it('defaults safely to 10-day supplier lead time when omitted', () => {
      // 8 sellable units, 1.0 daily demand = 8 days runout <= 10 days default lead time
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 8,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.supplierLeadTimeDays).toBe(10);
      expect(res.riskLevel).toBe('IMMINENT_RISK');
      expect(res.assumptions.leadTimeDays).toBe(10);
    });

    it('clamps negative or invalid stock inputs safely to zero', () => {
      const demand = createMockDemandMetrics();

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: -5 as any,
        reservedStock: -2 as any,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.onHandStock).toBe(0);
      expect(res.reservedStock).toBe(0);
      expect(res.sellableStock).toBe(0);
      expect(res.riskLevel).toBe('CRITICAL_STOCKOUT');
    });

    it('strictly outputs review-only advisory notices without side effects', () => {
      const demand = createMockDemandMetrics({ inStockDailySales: 2.0 });

      const res = calculateStockoutRisk({
        productId,
        sku,
        onHandStock: 12,
        supplierLeadTimeDays: 7,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.assumptions.advisoryNotice).toContain(
        'Review-only advisory estimate'
      );
      expect(res.assumptions.advisoryNotice).toContain(
        'Zero automatic stock updates are performed'
      );
    });
  });

  describe('Database Service Integration: getSkuStockoutRisk()', () => {
    it('queries authoritative product and demand metrics to estimate stockout risk', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: productId,
              sku,
              stock_quantity: 8,
              low_stock_threshold: 2,
            },
            error: null,
          }),
        }),
      };

      (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
      (getSkuDemandMetrics as jest.Mock).mockResolvedValue(
        createMockDemandMetrics({ inStockDailySales: 1.0 })
      );

      const res = await getSkuStockoutRisk(productId, {
        supplierLeadTimeDays: 10,
      });

      expect(res.productId).toBe(productId);
      expect(res.sellableStock).toBe(8);
      expect(res.estimatedRunoutDays).toBe(8);
      expect(res.riskLevel).toBe('IMMINENT_RISK'); // 8 days <= 10 days lead time
    });
  });
});
