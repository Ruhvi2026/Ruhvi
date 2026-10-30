import 'server-only';

import {
  simulateDecisionScenario,
  type SimulationFixture,
  type SimulationResult,
} from './decision-simulator';
import {
  modelInventoryBufferOptimization,
  modelTieredPricingElasticity,
  type CounterfactualEvaluationResult,
} from './counterfactual-models';
import type { ProposedCoFounderAction } from './approval-policy';

/**
 * ============================================================================
 * SIMULATOR PROPOSAL REVIEW SERVICE (TRACK I - PHASE 45)
 * ============================================================================
 * Connects offline counterfactual simulator outcomes to Action Center proposals
 * and Co-Founder review interfaces.
 *
 * Guarantees:
 * 1. Non-Misleading Distinction:
 *    - Explicitly marks all review projections with `isSimulatedProjection: true`.
 *    - Displays mandatory disclaimer: "SIMULATED PROJECTION ONLY — Not actual live results".
 * 2. Before/After Metric Deltas:
 *    - Renders comparative table comparing baseline historical metrics against
 *      simulated counterfactual outcomes with absolute and percentage deltas.
 * 3. Confidence & Tradeoff Transparency:
 *    - Highlights uncertainty intervals, confidence scores, and potential side effects.
 * 4. Zero Production Impact:
 *    - Runs purely in-memory using snapshot fixtures.
 */

export const SIMULATION_DISCLAIMER =
  'SIMULATED COUNTERFACTUAL PROJECTION ONLY — These figures are modeled estimates based on historical elasticity and inventory fixtures, NOT actual production results. They reflect simulation before live approval.';

export interface ProposalSimulationReview {
  proposalId: string;
  proposalTitle: string;
  actionType: string;
  targetEntity: { type: string; id: string };
  isSimulatedProjection: true;
  disclaimer: string;
  simulation: SimulationResult | CounterfactualEvaluationResult;
  reviewReadiness: 'READY_FOR_APPROVAL' | 'NEEDS_REVISION' | 'HIGH_RISK';
  reviewGuidance: string[];
  reviewedAt: string;
}

export const DEFAULT_CATALOG_FIXTURE: SimulationFixture = {
  id: 'fix_default_baseline_2026',
  name: 'Authoritative Catalog Historical Baseline',
  periodDays: 30,
  totalHistoricalOrders: 350,
  historicalAov: 38500,
  products: [
    {
      id: 'prod_necklace_01',
      sku: 'NK-GLD-001',
      name: '22K Royal Temple Gold Necklace',
      currentPrice: 85000,
      costPrice: 51000,
      stockQuantity: 12,
      lowStockThreshold: 2,
      historical30DaySalesUnits: 15,
      supplierLeadTimeDays: 14,
    },
    {
      id: 'prod_ring_01',
      sku: 'RG-DIA-001',
      name: 'Solitaire Diamond Engagement Ring',
      currentPrice: 45000,
      costPrice: 27000,
      stockQuantity: 6,
      lowStockThreshold: 2,
      historical30DaySalesUnits: 20,
      supplierLeadTimeDays: 10,
    },
    {
      id: 'prod_earrings_01',
      sku: 'ER-POL-001',
      name: 'Polki Chandbali Earrings',
      currentPrice: 32000,
      costPrice: 19200,
      stockQuantity: 10,
      lowStockThreshold: 3,
      historical30DaySalesUnits: 18,
      supplierLeadTimeDays: 12,
    },
    {
      id: 'prod_bangles_01',
      sku: 'BG-GLD-001',
      name: 'Traditional Filigree Gold Kada',
      currentPrice: 65000,
      costPrice: 39000,
      stockQuantity: 4,
      lowStockThreshold: 2,
      historical30DaySalesUnits: 8,
      supplierLeadTimeDays: 15,
    },
  ],
};

/**
 * Connects an action proposal to its counterfactual simulation review.
 */
export function generateSimulationForProposal(
  proposal: ProposedCoFounderAction,
  fixture: SimulationFixture = DEFAULT_CATALOG_FIXTURE
): ProposalSimulationReview {
  const reviewedAt = new Date().toISOString();
  const actionType = proposal.payload.actionType;
  const params = proposal.payload.parameters || {};

  let simulation: SimulationResult | CounterfactualEvaluationResult;
  const reviewGuidance: string[] = [];

  // ─── Case 1: Inventory Safety Buffer Adjustment ───────────────────────────
  if (actionType === 'update_inventory_safety_buffer') {
    const newThreshold =
      Number(params.lowStockThreshold ?? params.newThreshold) || 5;
    const previousThreshold = Number(params.previousThreshold) || 2;
    const delta = newThreshold - previousThreshold;

    simulation = simulateDecisionScenario(
      {
        type: 'inventory_safety_buffer_adjustment',
        title: `Simulated Safety Buffer Adjustment (${delta > 0 ? '+' : ''}${delta} units)`,
        description: `Counterfactual analysis of altering threshold from ${previousThreshold} to ${newThreshold}.`,
        parameters: {
          thresholdAdjustmentDelta: delta,
          targetProductIds: params.productId ? [params.productId] : undefined,
        },
      },
      fixture
    );

    if (delta > 0) {
      reviewGuidance.push(
        `Action increases inventory safety buffer by ${delta} unit(s). Working capital impact: ₹${Math.abs(simulation.projectedWorkingCapitalDelta).toLocaleString('en-IN')}.`
      );
      reviewGuidance.push(
        'Reduces stockout exposure risk during demand spikes.'
      );
    } else {
      reviewGuidance.push(
        `Action decreases inventory buffer by ${Math.abs(delta)} unit(s), releasing working capital but slightly elevating stockout risk.`
      );
    }
  }
  // ─── Case 2: Pricing / Commercial Adjustment ──────────────────────────────
  else if (actionType === 'adjust_price_tier' || actionType.includes('price')) {
    const priceChangePct = Number(params.priceChangePercent) || 5;
    simulation = modelTieredPricingElasticity({
      baselineRevenueMonthly: 1500000,
      baselineGrossMarginPercent: 40,
      priceAdjustmentPercent: priceChangePct,
      priceTier: 'luxury_high_ticket',
    });
    reviewGuidance.push(
      `Price elasticity model projects ${simulation.netBusinessRecommendation} outcome for luxury category.`
    );
  }
  // ─── Case 3: General Proposal Simulation Fallback ─────────────────────────
  else {
    simulation = simulateDecisionScenario(
      {
        type: 'inventory_safety_buffer_adjustment',
        title: `Generic Operational Simulation for ${proposal.title}`,
        description:
          'Simulated counterfactual impact against catalog baseline.',
        parameters: {
          thresholdAdjustmentDelta: 1,
        },
      },
      fixture
    );
    reviewGuidance.push(
      'Operational proposal simulation completed against catalog snapshot baseline.'
    );
  }

  // Determine review readiness based on recommendation
  let reviewReadiness: ProposalSimulationReview['reviewReadiness'] =
    'READY_FOR_APPROVAL';
  if ('recommendation' in simulation) {
    if (simulation.recommendation === 'UNFAVORABLE')
      reviewReadiness = 'HIGH_RISK';
    else if (simulation.recommendation === 'MODERATE_RISK')
      reviewReadiness = 'NEEDS_REVISION';
  } else if ('netBusinessRecommendation' in simulation) {
    if (simulation.netBusinessRecommendation === 'HIGH_RISK_NOT_RECOMMENDED')
      reviewReadiness = 'HIGH_RISK';
    else if (
      simulation.netBusinessRecommendation === 'FAVORABLE_WITH_CONDITIONS'
    )
      reviewReadiness = 'NEEDS_REVISION';
  }

  return {
    proposalId: proposal.id,
    proposalTitle: proposal.title,
    actionType,
    targetEntity: proposal.payload.targetEntity,
    isSimulatedProjection: true,
    disclaimer: SIMULATION_DISCLAIMER,
    simulation,
    reviewReadiness,
    reviewGuidance,
    reviewedAt,
  };
}
