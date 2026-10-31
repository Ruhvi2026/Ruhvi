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
  calculateRestockRecommendation,
  getSkuRestockRecommendation,
} from '../restock-recommendation-service';

describe('Restock Recommendation Engine (Track G - Phase 38)', () => {
  const evaluatedAt = '2026-10-27T00:00:00.000Z';
  const productId = 'prod_solitaire_studs_01';
  const sku = 'ST-DIA-001';

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
    grossRevenue: 600000,
    netRevenue: 600000,
    orderCount: 15,
    averageSellingPrice: 20000,
    rawDailySales: 1.0,
    inStockDays: 30,
    outOfStockDays: 0,
    inStockDailySales: 1.0,
    stockoutFraction: 0,
    classification: 'ACTIVE_DEMAND',
    classificationReason: 'Healthy steady demand',
    trend: 'STEADY',
    confidenceScore: 0.9,
    evaluatedAt,
    dataFreshness: 'Authoritative live ledger',
    ...overrides,
  });

  describe('Deterministic Reorder Point & Replenishment Logic', () => {
    it('recommends restock when sellable stock is at or below reorder point', () => {
      // dailyRate = 1.0, leadTime = 10, reviewPeriod = 30, safetyDays = 7
      // dynamicSafety = ceil(1.0 * 7) = 7 units
      // reorderPoint = ceil(1.0 * 10 + 7) = 17 units
      // targetLevel = ceil(1.0 * (10 + 30) + 7) = 47 units
      // sellableStock = 12 (<= 17) -> Restock deficit = 47 - 12 = 35 units
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 12,
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        reviewPeriodDays: 30,
        safetyStockDays: 7,
        demandMetrics: demand,
        unitCostPrice: 12000,
        evaluatedAt,
      });

      expect(res.status).toBe('RESTOCK_RECOMMENDED');
      expect(res.reorderPoint).toBe(17);
      expect(res.targetStockLevel).toBe(47);
      expect(res.rawDeficit).toBe(35);
      expect(res.suggestedQuantity).toBe(35);
      expect(res.urgency).toBe('MEDIUM');
      expect(res.estimatedProcurementCost).toBe(35 * 12000);
      expect(res.isDraftReviewOnly).toBe(true);
    });

    it('returns NO_RESTOCK_NEEDED when sellable stock exceeds reorder point', () => {
      // sellableStock = 25 (> 17)
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 25,
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        reviewPeriodDays: 30,
        safetyStockDays: 7,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.status).toBe('NO_RESTOCK_NEEDED');
      expect(res.urgency).toBe('NONE');
      expect(res.suggestedQuantity).toBe(0);
      expect(res.rationale).toContain(
        'Sellable stock (25) exceeds reorder point (17)'
      );
    });

    it('sets urgency to CRITICAL when sellable stock is zero or depleted', () => {
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 0,
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.status).toBe('RESTOCK_RECOMMENDED');
      expect(res.urgency).toBe('CRITICAL');
      expect(res.rawDeficit).toBe(47); // 47 - 0
    });

    it('sets urgency to HIGH when sellable stock breaches safety buffer', () => {
      // safetyStockUnits = 7. sellableStock = 5 (<= 7)
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 5,
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        safetyStockDays: 7,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.status).toBe('RESTOCK_RECOMMENDED');
      expect(res.urgency).toBe('HIGH');
    });
  });

  describe('Supplier Constraints: MOQ, Batch Multiples & Max Cap', () => {
    it('adjusts suggested quantity up to supplier MOQ when raw deficit is smaller', () => {
      // Deficit is 15, but MOQ is 25
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 32, // Target is 47, deficit = 15 <= ROP (17) -> wait, 32 > 17
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        safetyStockDays: 7,
        demandMetrics: demand,
        minimumOrderQuantity: 50,
      });

      // Let's set sellableStock to 16 (<= ROP 17), deficit = 47 - 16 = 31
      const resWithRestock = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 16,
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        safetyStockDays: 7,
        demandMetrics: demand,
        minimumOrderQuantity: 50, // MOQ is 50, raw deficit is 31
        evaluatedAt,
      });

      expect(resWithRestock.rawDeficit).toBe(31);
      expect(resWithRestock.suggestedQuantity).toBe(50);
      expect(resWithRestock.moqApplied).toBe(true);
      expect(resWithRestock.caveats).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Quantity adjusted from 31 to 50 to fulfill supplier MOQ'
          ),
        ])
      );
    });

    it('rounds quantity up to nearest batch size multiple', () => {
      // Deficit is 31, batch multiple is 10 -> rounded to 40
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 16,
        lowStockThreshold: 2,
        supplierLeadTimeDays: 10,
        safetyStockDays: 7,
        demandMetrics: demand,
        batchSizeMultiple: 10,
        evaluatedAt,
      });

      expect(res.rawDeficit).toBe(31);
      expect(res.suggestedQuantity).toBe(40);
      expect(res.batchRoundingApplied).toBe(true);
    });

    it('caps restock quantity at maximum stock cap', () => {
      const demand = createMockDemandMetrics({ inStockDailySales: 1.0 });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 10,
        lowStockThreshold: 2,
        demandMetrics: demand,
        maxStockCap: 25, // Deficit is 37, but cap is 25
        evaluatedAt,
      });

      expect(res.suggestedQuantity).toBe(25);
      expect(res.caveats).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Quantity capped at maximum inventory limit (25)'
          ),
        ])
      );
    });
  });

  describe('Edge Cases: Zero Demand & Insufficient Data', () => {
    it('returns NO_RESTOCK_NEEDED when product has ZERO_DEMAND', () => {
      const demand = createMockDemandMetrics({
        classification: 'ZERO_DEMAND',
        netUnitsSold: 0,
        rawDailySales: 0,
        inStockDailySales: 0,
      });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 2,
        lowStockThreshold: 2,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.status).toBe('NO_RESTOCK_NEEDED');
      expect(res.urgency).toBe('NONE');
      expect(res.suggestedQuantity).toBe(0);
      expect(res.rationale).toContain('Zero sales recorded');
    });

    it('returns INSUFFICIENT_DATA_FOR_RESTOCK when sales history is insufficient', () => {
      const demand = createMockDemandMetrics({
        classification: 'INSUFFICIENT_DATA',
        netUnitsSold: 0,
        rawDailySales: 0,
        inStockDailySales: 0,
      });

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 1,
        lowStockThreshold: 2,
        demandMetrics: demand,
        evaluatedAt,
      });

      expect(res.status).toBe('INSUFFICIENT_DATA_FOR_RESTOCK');
      expect(res.urgency).toBe('NONE');
      expect(res.suggestedQuantity).toBe(0);
      expect(res.caveats).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Insufficient sales history'),
        ])
      );
    });

    it('logs caveat when unconfigured fallback lead time is used', () => {
      const demand = createMockDemandMetrics();

      const res = calculateRestockRecommendation({
        productId,
        sku,
        sellableStock: 10,
        lowStockThreshold: 2,
        demandMetrics: demand,
        // supplierLeadTimeDays omitted
        evaluatedAt,
      });

      expect(res.caveats).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Standard fallback lead time (10 days) used'),
        ])
      );
    });
  });

  describe('Database Service Integration: getSkuRestockRecommendation()', () => {
    it('queries authoritative product and demand to produce review draft', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: productId,
              sku,
              name: 'Solitaire Diamond Studs',
              price: 45000,
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

      const res = await getSkuRestockRecommendation(productId, {
        supplierLeadTimeDays: 10,
        reviewPeriodDays: 30,
      });

      expect(res.productId).toBe(productId);
      expect(res.status).toBe('RESTOCK_RECOMMENDED');
      expect(res.sellableStock).toBe(8);
      expect(res.suggestedQuantity).toBe(39); // 47 - 8 = 39
      expect(res.isDraftReviewOnly).toBe(true);
      expect(res.advisoryNotice).toContain(
        'Review-only replenishment suggestion'
      );
    });

    it('utilizes verified cost_price from products table for estimated procurement cost', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: productId,
              sku,
              name: 'Solitaire Diamond Studs',
              price: 50000,
              cost_price: 32000,
              stock_quantity: 10,
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

      const res = await getSkuRestockRecommendation(productId, {
        supplierLeadTimeDays: 10,
        reviewPeriodDays: 30,
      });

      // targetStockLevel = 47. Deficit = 47 - 10 = 37.
      expect(res.suggestedQuantity).toBe(37);
      expect(res.estimatedProcurementCost).toBe(37 * 32000); // 1,184,000
    });
  });
});
