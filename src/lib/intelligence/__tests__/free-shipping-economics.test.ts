jest.mock('server-only', () => ({}));

import {
  modelFreeShippingThresholdEconomics,
  SIMULATION_SANDBOX_DISCLAIMER,
} from '../counterfactual-models';
import { executeAuthoritativeSimulation } from '../simulator-review-service';
import { POST } from '@/app/api/intelligence/simulator/route';
import { requireAdmin } from '@/lib/auth/require-admin';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

describe('Free Shipping Threshold Economics Model (Phase 30 - Track F)', () => {
  const mockedRequireAdmin = requireAdmin as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue({
      ok: true,
      role: 'admin',
      userId: 'test_admin_01',
    });
  });

  describe('1. Deterministic Calculation with Known Fixtures', () => {
    it('accurately models AOV expansion, conversion attrition, and net contribution delta', () => {
      const result = modelFreeShippingThresholdEconomics({
        baselineMonthlyOrders: 400,
        baselineAov: 30000,
        baselineGrossMarginPercent: 40,
        currentThreshold: 2000,
        proposedThreshold: 4000,
        averageFulfillmentShippingCost: 150,
        standardShippingFeeCharged: 100,
        cartExpansionLiftPercent: 4,
        conversionDropPercent: 2,
      });

      expect((result as any).decisionType).toBe(
        'free_shipping_threshold_economics'
      );
      expect(result.isSimulatedProjection).toBe(true);
      expect(result.confidenceScore).toBe(0.84);

      // Verify baseline vs projected merchandise revenue
      const revMetric = result.metrics.find(
        (m) => m.name === 'Monthly Merchandise Revenue'
      );
      expect(revMetric).toBeDefined();
      expect(revMetric?.baseline).toBe(12000000); // 400 * 30,000
      expect(revMetric?.projected).toBe(12230400); // 392 * 31,200

      // Verify AOV metric
      const aovMetric = result.metrics.find(
        (m) => m.name === 'Average Order Value (AOV)'
      );
      expect(aovMetric).toBeDefined();
      expect(aovMetric?.baseline).toBe(30000);
      expect(aovMetric?.projected).toBe(31200); // 30,000 * 1.04

      // Verify Order count metric
      const orderMetric = result.metrics.find(
        (m) => m.name === 'Monthly Order Volume'
      );
      expect(orderMetric).toBeDefined();
      expect(orderMetric?.baseline).toBe(400);
      expect(orderMetric?.projected).toBe(392); // 400 * 0.98

      // Net contribution metric
      const contribMetric = result.metrics.find(
        (m) => m.name === 'Net Operating Contribution'
      );
      expect(contribMetric).toBeDefined();
      expect(contribMetric?.projected).toBeGreaterThan(contribMetric!.baseline);
      expect(result.netBusinessRecommendation).toBe('STRONGLY_FAVORABLE');
    });

    it('reproduces expected high-risk recommendation when conversion drop causes profit decline', () => {
      const result = modelFreeShippingThresholdEconomics({
        baselineMonthlyOrders: 500,
        baselineAov: 5000, // lower AOV jewellery (more sensitive)
        baselineGrossMarginPercent: 30,
        currentThreshold: 1000,
        proposedThreshold: 4000, // 4x threshold hike
        averageFulfillmentShippingCost: 120,
        standardShippingFeeCharged: 80,
        cartExpansionLiftPercent: 1, // minimal cart top-up
        conversionDropPercent: 8, // severe drop from fee shock
      });

      expect(result.netBusinessRecommendation).toBe(
        'HIGH_RISK_NOT_RECOMMENDED'
      );
      const compressionSideEffect = result.sideEffects.find(
        (s) => s.title === 'Contribution Margin Compression'
      );
      expect(compressionSideEffect).toBeDefined();
      expect(compressionSideEffect?.severity).toBe('HIGH');
    });
  });

  describe('2. Side Effect & Sensitivity Disclosures', () => {
    it('surfaces cart abandonment risk when proposed threshold is more than 1.5x current', () => {
      const result = modelFreeShippingThresholdEconomics({
        baselineMonthlyOrders: 350,
        baselineAov: 38500,
        baselineGrossMarginPercent: 38,
        currentThreshold: 2000,
        proposedThreshold: 5000, // 2.5x current
        averageFulfillmentShippingCost: 150,
        standardShippingFeeCharged: 100,
      });

      const abandonmentWarning = result.sideEffects.find(
        (s) => s.title === 'Cart Abandonment Risk on Entry-Tier Jewellery'
      );
      expect(abandonmentWarning).toBeDefined();
      expect(abandonmentWarning?.severity).toBe('MEDIUM');
      expect(abandonmentWarning?.mitigationSuggestion).toContain(
        'dynamic cart drawer'
      );
    });
  });

  describe('3. Unified Authoritative Dispatcher Integration', () => {
    it('executes free shipping model via executeAuthoritativeSimulation dispatcher', () => {
      const result = executeAuthoritativeSimulation({
        mode: 'macro_counterfactual',
        macroDecisionType: 'free_shipping_threshold_economics',
        macroParams: {
          baselineMonthlyOrders: 300,
          baselineAov: 25000,
          baselineGrossMarginPercent: 35,
          currentThreshold: 2500,
          proposedThreshold: 3500,
          averageFulfillmentShippingCost: 140,
          standardShippingFeeCharged: 90,
        },
      });

      expect((result as any).decisionType).toBe(
        'free_shipping_threshold_economics'
      );
      expect((result as any).isSimulatedProjection).toBe(true);
      expect((result as any).metrics.length).toBeGreaterThan(0);
    });
  });

  describe('4. API Route Contract Verification', () => {
    it('handles POST /api/intelligence/simulator for free_shipping_threshold_economics', async () => {
      const req = new Request('http://localhost/api/intelligence/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType: 'free_shipping_threshold_economics',
          parameters: {
            baselineMonthlyOrders: 320,
            baselineAov: 35000,
            currentThreshold: 2000,
            proposedThreshold: 4000,
          },
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data.decisionType).toBe('free_shipping_threshold_economics');
      expect(json.data.disclaimer).toBe(SIMULATION_SANDBOX_DISCLAIMER);
      expect(json.data.isReadOnlySandbox).toBe(true);
      expect(json.data.executedBy).toBe('admin');
    });

    it('clamps numeric inputs to safe bounds preventing NaN propagation', async () => {
      const req = new Request('http://localhost/api/intelligence/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType: 'free_shipping_threshold_economics',
          parameters: {
            baselineMonthlyOrders: 'invalid_text',
            currentThreshold: -500,
            proposedThreshold: 9999999, // over max 100000
          },
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      // Fallback 350 used for invalid orders
      const orderMetric = json.data.metrics.find(
        (m: any) => m.name === 'Monthly Order Volume'
      );
      expect(orderMetric.baseline).toBe(350);
    });
  });
});
