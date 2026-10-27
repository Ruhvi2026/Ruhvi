jest.mock('server-only', () => ({}));

import {
  modelInventoryBufferOptimization,
  modelTieredPricingElasticity,
  modelPromotionalCampaignStructure,
  modelExpeditedDeliveryPromise,
} from '../counterfactual-models';

describe('Counterfactual Scenario Models (Track I - Phase 44)', () => {
  describe('1. Inventory Buffer Optimization Model', () => {
    it('calculates capital lockup, stockout revenue saved, and net business benefit with uncertainty bounds', () => {
      const res = modelInventoryBufferOptimization({
        skuCount: 50,
        averageUnitCost: 20000,
        bufferDeltaUnitsPerSku: 2, // 50 * 2 = 100 units * 20k = ₹2,000,000 capital
        baselineStockoutLossMonthly: 250000,
        costOfCapitalAnnualPercent: 12, // 1% per month = ₹20,000/mo
      });

      expect(res.isSimulatedProjection).toBe(true);
      expect(res.decisionType).toBe('inventory_buffer_optimization');
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0.8);

      const capMetric = res.metrics.find(
        (m) => m.name === 'Working Capital in Buffers'
      );
      expect(capMetric).toBeDefined();
      expect(capMetric?.projected).toBe(2000000);
      expect(capMetric?.projectedLowerBound).toBeLessThan(capMetric!.projected);
      expect(capMetric?.projectedUpperBound).toBeGreaterThan(
        capMetric!.projected
      );

      const benefitMetric = res.metrics.find(
        (m) => m.name === 'Net Monthly Business Benefit'
      );
      expect(benefitMetric).toBeDefined();
      expect(benefitMetric?.projected).toBeGreaterThan(0);

      // Verify side effect disclosure
      expect(res.sideEffects.length).toBeGreaterThan(0);
      expect(res.sideEffects[0].title).toBe('Working Capital Lockup');
      expect(res.sideEffects[0].severity).toBe('HIGH');
    });
  });

  describe('2. Tiered Pricing Elasticity Model', () => {
    it('differentiates elastic entry-level jewellery from inelastic luxury high-ticket items', () => {
      const baselineRevenue = 1000000;

      // Case A: Entry level (+10% price, PED = -1.6 -> -16% volume)
      const entryRes = modelTieredPricingElasticity({
        baselineRevenueMonthly: baselineRevenue,
        baselineGrossMarginPercent: 35,
        priceAdjustmentPercent: 10,
        priceTier: 'entry_level',
      });

      // Case B: Luxury high ticket (+10% price, PED = -0.65 -> -6.5% volume)
      const luxuryRes = modelTieredPricingElasticity({
        baselineRevenueMonthly: baselineRevenue,
        baselineGrossMarginPercent: 45,
        priceAdjustmentPercent: 10,
        priceTier: 'luxury_high_ticket',
      });

      const entryVol = entryRes.metrics.find(
        (m) => m.name === 'Unit Sales Volume Index'
      )!;
      const luxuryVol = luxuryRes.metrics.find(
        (m) => m.name === 'Unit Sales Volume Index'
      )!;

      // Luxury retains higher volume than entry-level
      expect(luxuryVol.projected).toBeGreaterThan(entryVol.projected);

      // Luxury profit expands more favorably
      const luxuryProfit = luxuryRes.metrics.find(
        (m) => m.name === 'Monthly Gross Profit'
      )!;
      expect(luxuryProfit.absoluteDelta).toBeGreaterThan(0);
      expect(luxuryRes.netBusinessRecommendation).toBe('STRONGLY_FAVORABLE');
    });
  });

  describe('3. Promotional Campaign Structure Model', () => {
    it('models discount margin dilution and highlights high-risk recommendations when dilution exceeds lift', () => {
      // 20% discount with weak 5% conversion lift
      const res = modelPromotionalCampaignStructure({
        baselineMonthlyOrders: 500,
        baselineAov: 20000,
        baselineGrossMarginPercent: 30,
        discountPercent: 20,
        expectedConversionLiftPercent: 5,
      });

      expect(res.decisionType).toBe('promotional_campaign_structure');
      const profitMetric = res.metrics.find(
        (m) => m.name === 'Net Gross Profit'
      )!;
      expect(profitMetric.absoluteDelta).toBeLessThan(0); // Profit drops
      expect(res.netBusinessRecommendation).toBe('HIGH_RISK_NOT_RECOMMENDED');

      const sideEffect = res.sideEffects.find(
        (s) => s.title === 'Discount Margin Erosion'
      );
      expect(sideEffect).toBeDefined();
      expect(sideEffect?.severity).toBe('HIGH');
    });
  });

  describe('4. Expedited Delivery Promise Model', () => {
    it('models conversion lift against express courier surcharges and RTO risk', () => {
      const res = modelExpeditedDeliveryPromise({
        monthlyShipmentVolume: 800,
        baselineCheckoutConversionRate: 2.8,
        expressCourierSurchargePerShipment: 150,
        averageOrderGrossProfit: 5500,
      });

      expect(res.decisionType).toBe('expedited_delivery_promise');
      const orderMetric = res.metrics.find(
        (m) => m.name === 'Monthly Order Volume'
      )!;
      expect(orderMetric.projected).toBeGreaterThan(800);

      const netBenefit = res.metrics.find(
        (m) => m.name === 'Net Monthly Shipping Benefit'
      )!;
      expect(netBenefit.projected).toBeGreaterThan(0);

      expect(res.sideEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Warehouse Dispatch SLA Pressure' }),
          expect.objectContaining({
            title: 'Carrier Delivery Failure Vulnerability',
          }),
        ])
      );
    });
  });

  describe('Invariants & Transparency Safeguards', () => {
    it('guarantees isSimulatedProjection flag and complete uncertainty intervals on all metrics', () => {
      const res = modelInventoryBufferOptimization({
        skuCount: 10,
        averageUnitCost: 15000,
        bufferDeltaUnitsPerSku: 1,
        baselineStockoutLossMonthly: 50000,
      });

      expect(res.isSimulatedProjection).toBe(true);
      for (const m of res.metrics) {
        expect(typeof m.baseline).toBe('number');
        expect(typeof m.projected).toBe('number');
        expect(typeof m.projectedLowerBound).toBe('number');
        expect(typeof m.projectedUpperBound).toBe('number');
        expect(m.projectedLowerBound).toBeLessThanOrEqual(
          m.projectedUpperBound
        );
      }
    });
  });
});
