jest.mock('server-only', () => ({}));

import {
  generateSimulationForProposal,
  SIMULATION_DISCLAIMER,
  type ProposalSimulationReview,
} from '../simulator-review-service';
import { createActionProposal } from '../approval-policy';
import type { SimulationFixture } from '../decision-simulator';

describe('Simulator Proposal Review Service (Track I - Phase 45)', () => {
  const mockInventoryProposal = createActionProposal({
    recommendationId: 'rec_inv_buffer_001',
    title: 'Increase Safety Buffer for High-Demand Diamond Ring',
    category: 'inventory',
    impactTier: 'inventory_operational',
    actionType: 'update_inventory_safety_buffer',
    targetEntity: {
      type: 'product',
      id: 'prod_ring_01',
    },
    parameters: {
      productId: 'prod_ring_01',
      previousThreshold: 2,
      newThreshold: 5,
    },
  });

  const mockPriceProposal = createActionProposal({
    recommendationId: 'rec_price_adjust_002',
    title: 'Adjust Luxury High-Ticket Gold Price Tier',
    category: 'financial',
    impactTier: 'financial_commercial',
    actionType: 'adjust_price_tier',
    targetEntity: {
      type: 'pricing_tier',
      id: 'tier_luxury_01',
    },
    parameters: {
      priceChangePercent: 4.5,
    },
  });

  const mockGenericProposal = createActionProposal({
    recommendationId: 'rec_generic_003',
    title: 'Routine Catalog Health Re-alignment',
    category: 'operations',
    impactTier: 'low_risk_triage',
    actionType: 'system_routine_sync',
    targetEntity: {
      type: 'system',
      id: 'sys_core',
    },
    parameters: {},
  });

  describe('Simulation Review Generation', () => {
    it('generates simulation review for inventory buffer increase with non-misleading guarantees', () => {
      const review: ProposalSimulationReview = generateSimulationForProposal(
        mockInventoryProposal
      );

      expect(review.proposalId).toBe(mockInventoryProposal.id);
      expect(review.proposalTitle).toBe(
        'Increase Safety Buffer for High-Demand Diamond Ring'
      );
      expect(review.actionType).toBe('update_inventory_safety_buffer');
      expect(review.targetEntity).toEqual({
        type: 'product',
        id: 'prod_ring_01',
      });

      // Non-misleading projection invariants
      expect(review.isSimulatedProjection).toBe(true);
      expect(review.disclaimer).toBe(SIMULATION_DISCLAIMER);
      expect(review.disclaimer).toContain(
        'SIMULATED COUNTERFACTUAL PROJECTION ONLY'
      );
      expect(review.disclaimer).toContain('NOT actual production results');

      // Simulation metrics
      expect('scenarioType' in review.simulation).toBe(true);
      if ('scenarioType' in review.simulation) {
        expect(review.simulation.scenarioType).toBe(
          'inventory_safety_buffer_adjustment'
        );
        expect(review.simulation.comparisons.length).toBeGreaterThan(0);
        expect(review.simulation.projectedWorkingCapitalDelta).toBeDefined();
      }

      // Review readiness & guidance
      expect(['READY_FOR_APPROVAL', 'NEEDS_REVISION', 'HIGH_RISK']).toContain(
        review.reviewReadiness
      );
      expect(review.reviewGuidance.length).toBeGreaterThan(0);
      expect(
        review.reviewGuidance.some((g) => g.includes('safety buffer'))
      ).toBe(true);

      // Timestamp validity
      expect(new Date(review.reviewedAt).getTime()).toBeGreaterThan(0);
    });

    it('generates simulation review for negative inventory buffer adjustment', () => {
      const negativeProposal = createActionProposal({
        recommendationId: 'rec_inv_decrease_001',
        title: 'Decrease Safety Buffer for Slow Stock',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: 'update_inventory_safety_buffer',
        targetEntity: {
          type: 'product',
          id: 'prod_ring_01',
        },
        parameters: {
          productId: 'prod_ring_01',
          previousThreshold: 5,
          newThreshold: 2,
        },
      });

      const review = generateSimulationForProposal(negativeProposal);
      expect(
        review.reviewGuidance.some((g) =>
          g.includes('decreases inventory buffer')
        )
      ).toBe(true);
      expect(review.reviewReadiness).toBe('NEEDS_REVISION');
    });

    it('generates elasticity counterfactual simulation for price tier adjustments', () => {
      const review = generateSimulationForProposal(mockPriceProposal);

      expect(review.actionType).toBe('adjust_price_tier');
      expect(review.isSimulatedProjection).toBe(true);
      expect(review.disclaimer).toBe(SIMULATION_DISCLAIMER);

      // Elasticity evaluation
      expect('decisionType' in review.simulation).toBe(true);
      if ('decisionType' in review.simulation) {
        expect(review.simulation.decisionType).toBe(
          'tiered_pricing_elasticity'
        );
        expect(review.simulation.metrics.length).toBeGreaterThan(0);
        expect(review.simulation.confidenceScore).toBeDefined();
      }

      expect(['READY_FOR_APPROVAL', 'NEEDS_REVISION', 'HIGH_RISK']).toContain(
        review.reviewReadiness
      );
      expect(review.reviewGuidance.some((g) => g.includes('elasticity'))).toBe(
        true
      );
    });

    it('falls back to safe catalog baseline simulation for generic proposals', () => {
      const review = generateSimulationForProposal(mockGenericProposal);

      expect(review.proposalId).toBe(mockGenericProposal.id);
      expect(review.isSimulatedProjection).toBe(true);
      expect(review.reviewReadiness).toBeDefined();
      expect(review.reviewGuidance.length).toBeGreaterThan(0);
    });

    it('accepts custom simulation fixtures', () => {
      const customFixture: SimulationFixture = {
        id: 'fix_custom_test',
        name: 'Custom Test Fixture',
        periodDays: 14,
        totalHistoricalOrders: 50,
        historicalAov: 25000,
        products: [
          {
            id: 'prod_custom_01',
            sku: 'CUST-001',
            name: 'Custom Solitaire Pendant',
            currentPrice: 30000,
            costPrice: 18000,
            stockQuantity: 8,
            lowStockThreshold: 2,
            historical30DaySalesUnits: 12,
            supplierLeadTimeDays: 7,
          },
        ],
      };

      const review = generateSimulationForProposal(
        mockInventoryProposal,
        customFixture
      );
      expect(review.isSimulatedProjection).toBe(true);
      if ('fixtureId' in review.simulation) {
        expect(review.simulation.fixtureId).toBe('fix_custom_test');
      }
    });

    it('determines HIGH_RISK readiness when simulation recommendation is UNFAVORABLE or HIGH_RISK_NOT_RECOMMENDED', () => {
      const riskyPriceProposal = createActionProposal({
        recommendationId: 'rec_price_risky_003',
        title: 'Deep Price Cut on Inelastic Luxury Jewelry',
        category: 'financial',
        impactTier: 'financial_commercial',
        actionType: 'adjust_price_tier',
        targetEntity: {
          type: 'pricing_tier',
          id: 'tier_luxury_01',
        },
        parameters: {
          priceChangePercent: -25, // deep price cut on inelastic luxury jewelry causes profit contraction
        },
      });

      const review = generateSimulationForProposal(riskyPriceProposal);
      expect(review.reviewReadiness).toBe('HIGH_RISK');
    });
  });
});
