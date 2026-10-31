import {
  executeAuthoritativeSimulation,
  generateSimulationForProposal,
  DEFAULT_CATALOG_FIXTURE,
} from '../simulator-review-service';
import { simulateDecisionScenario } from '../decision-simulator';
import { modelTieredPricingElasticity } from '../counterfactual-models';

jest.mock('server-only', () => ({}));

describe('Authoritative Decision Simulator Engine Reconciliation (Phase 28)', () => {
  describe('1. Unified Dispatcher Contract', () => {
    it('dispatches to micro_sku_catalog engine when mode is micro_sku_catalog', () => {
      const result: any = executeAuthoritativeSimulation({
        mode: 'micro_sku_catalog',
        microScenario: {
          type: 'inventory_safety_buffer_adjustment',
          title: 'Add 2 units safety buffer',
          description: 'Test inventory buffer adjustment',
          parameters: { thresholdAdjustmentDelta: 2 },
        },
      });

      expect(result.simulationId).toMatch(/^sim_/);
      expect(result.scenarioType).toBe('inventory_safety_buffer_adjustment');
      expect(result.isSandboxedReadOnly).toBe(true);
      expect(result.comparisons.length).toBeGreaterThan(0);
      expect(result.projectedWorkingCapitalDelta).toBeGreaterThan(0);
    });

    it('dispatches to macro_counterfactual engine for tiered pricing elasticity', () => {
      const result: any = executeAuthoritativeSimulation({
        mode: 'macro_counterfactual',
        macroDecisionType: 'tiered_pricing_elasticity',
        macroParams: {
          baselineRevenueMonthly: 2000000,
          baselineGrossMarginPercent: 45,
          priceAdjustmentPercent: 12,
          priceTier: 'entry_level', // PED = -1.6, triggers side effect
        },
      });

      expect(result.decisionType).toBe('tiered_pricing_elasticity');
      expect(result.confidenceScore).toBe(0.8);
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.sideEffects.length).toBeGreaterThan(0);
    });
  });

  describe('2. Economic Cross-Engine Parity', () => {
    it('both engines agree that price increases reduce unit volume via negative elasticity', () => {
      // 1. Micro Catalog Engine (decision-simulator.ts)
      const microResult = simulateDecisionScenario(
        {
          type: 'price_elasticity_change',
          title: 'Price +10%',
          description: 'Price hike',
          parameters: { priceChangePercent: 10, elasticityCoefficient: -1.2 },
        },
        DEFAULT_CATALOG_FIXTURE
      );

      const microVolumeComparison = microResult.comparisons.find(
        (c) => c.metric === 'unit_sales'
      );
      expect(microVolumeComparison).toBeDefined();
      expect(microVolumeComparison?.absoluteDelta).toBeLessThan(0);

      // 2. Macro Counterfactual Engine (counterfactual-models.ts)
      const macroResult = modelTieredPricingElasticity({
        baselineRevenueMonthly: 1000000,
        baselineGrossMarginPercent: 40,
        priceAdjustmentPercent: 10,
        priceTier: 'entry_level',
      });

      const macroVolumeMetric = macroResult.metrics.find(
        (m) => m.name === 'Unit Sales Volume Index'
      );
      expect(macroVolumeMetric).toBeDefined();
      expect(macroVolumeMetric?.absoluteDelta).toBeLessThan(0);
    });
  });

  describe('3. Action Center Proposal Integration', () => {
    it('generates compliant simulation review with mandatory simulation disclaimer', () => {
      const mockProposal: any = {
        id: 'prop_test_01',
        title: 'Adjust Royal Necklace Threshold',
        payload: {
          actionType: 'update_inventory_safety_buffer',
          targetEntity: { type: 'product', id: 'prod_necklace_01' },
          parameters: { lowStockThreshold: 4, previousThreshold: 2 },
        },
      };

      const review = generateSimulationForProposal(mockProposal);

      expect(review.proposalId).toBe('prop_test_01');
      expect(review.isSimulatedProjection).toBe(true);
      expect(review.disclaimer).toMatch(
        /SIMULATED COUNTERFACTUAL PROJECTION ONLY/
      );
      expect(review.reviewReadiness).toBe('READY_FOR_APPROVAL');
      expect(review.reviewGuidance.length).toBeGreaterThan(0);
    });
  });
});
