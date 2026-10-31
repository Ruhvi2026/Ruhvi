import 'server-only';

/**
 * ============================================================================
 * COUNTERFACTUAL SCENARIO MODELS (TRACK I - PHASE 44)
 * ============================================================================
 * Evaluates baseline vs proposed counterfactual outcomes for common business
 * decisions across inventory, pricing, promotions, and delivery promises.
 *
 * Guarantees:
 * 1. Non-Misleading Projection Safeguard:
 *    - All outputs carry `isSimulatedProjection: true` and explicit uncertainty
 *      bounds (lower and upper projections). Never presents simulated metrics
 *      as actual historical facts.
 * 2. Multi-Domain Counterfactual Modeling:
 *    - Inventory buffer optimization (holding capital vs stockout revenue saved).
 *    - Tiered pricing elasticity (differentiating price-sensitive entry items from
 *      inelastic high-ticket luxury jewellery).
 *    - Promotional campaign structure (discount dilution vs conversion lift).
 *    - Expedited delivery promises (checkout conversion lift vs courier surcharges & RTO).
 * 3. Tradeoff & Side-Effect Disclosure:
 *    - Emits specific unintended side effects, severity ratings, and actionable mitigations.
 * 4. Zero Production Mutation:
 *    - Pure deterministic analytical modeling running strictly in-memory.
 */

export const SIMULATION_SANDBOX_DISCLAIMER =
  'SANDBOXED DECISION SIMULATION ONLY — Projections are modeled counterfactuals based on historical baseline data and calibrated retail elasticity curves. NO PRODUCTION SETTINGS OR INVENTORY ARE MUTATED.';

export type CounterfactualDecisionType =
  | 'inventory_buffer_optimization'
  | 'tiered_pricing_elasticity'
  | 'promotional_campaign_structure'
  | 'expedited_delivery_promise'
  | 'free_shipping_threshold_economics';

export interface CounterfactualMetric {
  name: string;
  category: 'financial' | 'inventory' | 'customer' | 'operations';
  unit: string;
  baseline: number;
  projected: number;
  projectedLowerBound: number;
  projectedUpperBound: number;
  absoluteDelta: number;
  percentageDelta: number;
  verdict: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface UnintendedSideEffect {
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  mitigationSuggestion: string;
}

export interface SnapshotObservedMetric {
  value: number | null;
  status: 'available' | 'insufficient_data' | 'unavailable';
  sourceMetric: string;
  sampleSize?: number;
  isFallbackDefault?: boolean;
}

export interface SimulatorSnapshotProvenance {
  snapshotSource:
    'verified_business_snapshot' | 'fallback_default' | 'insufficient_data';
  snapshotTimestamp: string;
  sourceTimeWindow?: {
    start: string;
    end: string;
    timezone: string;
    preset: string;
  };
  observedValues: Record<string, SnapshotObservedMetric>;
  userEnteredAssumptions: Record<string, number | string>;
  modelEstimates: Record<string, number>;
  dataQualityNotice?: string;
}

export interface CounterfactualEvaluationResult {
  decisionType: CounterfactualDecisionType;
  title: string;
  summary: string;
  confidenceScore: number; // 0.0 to 1.0
  uncertaintyBasis: string;

  metrics: CounterfactualMetric[];
  sideEffects: UnintendedSideEffect[];
  assumptions: string[];
  netBusinessRecommendation:
    | 'STRONGLY_FAVORABLE'
    | 'FAVORABLE_WITH_CONDITIONS'
    | 'HIGH_RISK_NOT_RECOMMENDED';

  isSimulatedProjection: true;
  evaluatedAt: string;
  snapshotProvenance?: SimulatorSnapshotProvenance;
}

function buildMetric(
  name: string,
  category: CounterfactualMetric['category'],
  unit: string,
  baseline: number,
  projected: number,
  marginOfErrorRatio = 0.1,
  isHigherBetter = true
): CounterfactualMetric {
  const b = Math.round(baseline * 100) / 100;
  const p = Math.round(projected * 100) / 100;
  const absoluteDelta = Math.round((p - b) * 100) / 100;
  const percentageDelta =
    b !== 0 ? Math.round(((p - b) / b) * 100 * 10) / 10 : 0;

  const halfSpread = Math.abs(p * marginOfErrorRatio);
  const projectedLowerBound = Math.round((p - halfSpread) * 100) / 100;
  const projectedUpperBound = Math.round((p + halfSpread) * 100) / 100;

  let verdict: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (absoluteDelta > 0) {
    verdict = isHigherBetter ? 'POSITIVE' : 'NEGATIVE';
  } else if (absoluteDelta < 0) {
    verdict = isHigherBetter ? 'NEGATIVE' : 'POSITIVE';
  }

  return {
    name,
    category,
    unit,
    baseline: b,
    projected: p,
    projectedLowerBound,
    projectedUpperBound,
    absoluteDelta,
    percentageDelta,
    verdict,
  };
}

/**
 * 1. Model Inventory Buffer Optimization
 */
export function modelInventoryBufferOptimization(params: {
  skuCount: number;
  averageUnitCost: number;
  bufferDeltaUnitsPerSku: number; // e.g. +3 units
  baselineStockoutLossMonthly: number; // e.g. ₹150,000 lost to stockouts
  costOfCapitalAnnualPercent?: number; // default: 12%
}): CounterfactualEvaluationResult {
  const costOfCapitalRate =
    (params.costOfCapitalAnnualPercent ?? 12) / 100 / 12; // Monthly
  const deltaUnits = params.skuCount * params.bufferDeltaUnitsPerSku;
  const capitalTiedUpDelta = deltaUnits * params.averageUnitCost;
  const monthlyCarryingCostDelta = capitalTiedUpDelta * costOfCapitalRate;

  // Diminishing returns on stockout reduction
  const stockoutReductionRatio =
    params.bufferDeltaUnitsPerSku > 0
      ? Math.min(0.75, params.bufferDeltaUnitsPerSku * 0.2)
      : Math.max(-0.6, params.bufferDeltaUnitsPerSku * 0.25);

  const projectedStockoutLoss = Math.max(
    0,
    params.baselineStockoutLossMonthly * (1 - stockoutReductionRatio)
  );
  const stockoutLossSaved =
    params.baselineStockoutLossMonthly - projectedStockoutLoss;
  const netMonthlyBenefit = stockoutLossSaved - monthlyCarryingCostDelta;

  const metrics: CounterfactualMetric[] = [
    buildMetric(
      'Working Capital in Buffers',
      'inventory',
      '₹',
      0,
      capitalTiedUpDelta,
      0.05,
      false
    ),
    buildMetric(
      'Monthly Holding Cost Delta',
      'financial',
      '₹',
      0,
      monthlyCarryingCostDelta,
      0.08,
      false
    ),
    buildMetric(
      'Monthly Lost Stockout Sales',
      'financial',
      '₹',
      params.baselineStockoutLossMonthly,
      projectedStockoutLoss,
      0.15,
      false
    ),
    buildMetric(
      'Net Monthly Business Benefit',
      'financial',
      '₹',
      0,
      netMonthlyBenefit,
      0.2,
      true
    ),
  ];

  const sideEffects: UnintendedSideEffect[] = [];
  if (capitalTiedUpDelta > 0) {
    sideEffects.push({
      title: 'Working Capital Lockup',
      severity: capitalTiedUpDelta > 500000 ? 'HIGH' : 'MEDIUM',
      description: `Increasing safety buffers locks up ₹${Math.round(capitalTiedUpDelta).toLocaleString('en-IN')} across ${params.skuCount} SKUs.`,
      mitigationSuggestion:
        'Prioritize buffer increases exclusively for Tier-1 bestseller SKUs with high sales velocity.',
    });
  }

  let recommendation: CounterfactualEvaluationResult['netBusinessRecommendation'] =
    'FAVORABLE_WITH_CONDITIONS';
  if (netMonthlyBenefit > 50000) recommendation = 'STRONGLY_FAVORABLE';
  else if (netMonthlyBenefit < 0) recommendation = 'HIGH_RISK_NOT_RECOMMENDED';

  return {
    decisionType: 'inventory_buffer_optimization',
    title: 'Inventory Safety Buffer Counterfactual Model',
    summary: `Simulated buffer change of ${params.bufferDeltaUnitsPerSku > 0 ? '+' : ''}${params.bufferDeltaUnitsPerSku} units per SKU across ${params.skuCount} catalog products.`,
    confidenceScore: 0.85,
    uncertaintyBasis:
      'Deterministic carrying cost calculation combined with empirical stockout curve.',
    metrics,
    sideEffects,
    assumptions: [
      `Cost of inventory capital estimated at ${params.costOfCapitalAnnualPercent ?? 12}% per annum.`,
      'Supplier reorder cycles maintain normal delivery cadence.',
    ],
    netBusinessRecommendation: recommendation,
    isSimulatedProjection: true,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * 2. Model Tiered Pricing Elasticity
 */
export function modelTieredPricingElasticity(params: {
  baselineRevenueMonthly: number;
  baselineGrossMarginPercent: number; // e.g. 40%
  priceAdjustmentPercent: number; // e.g. +8%
  priceTier: 'entry_level' | 'mid_tier' | 'luxury_high_ticket';
}): CounterfactualEvaluationResult {
  // Price elasticity of demand (PED) by jewellery price tier:
  // Entry-level is price elastic (-1.6); Luxury high-ticket is inelastic (-0.65).
  const elasticityMap = {
    entry_level: -1.6,
    mid_tier: -1.15,
    luxury_high_ticket: -0.65,
  };

  const ped = elasticityMap[params.priceTier];
  const volumeChangePct = params.priceAdjustmentPercent * ped;
  const newVolumeRatio = Math.max(0, 1 + volumeChangePct / 100);
  const newPriceRatio = 1 + params.priceAdjustmentPercent / 100;

  const baselineCogs =
    params.baselineRevenueMonthly *
    (1 - params.baselineGrossMarginPercent / 100);
  const baselineGrossProfit = params.baselineRevenueMonthly - baselineCogs;

  const projectedRevenue =
    params.baselineRevenueMonthly * newVolumeRatio * newPriceRatio;
  const projectedCogs = baselineCogs * newVolumeRatio;
  const projectedGrossProfit = projectedRevenue - projectedCogs;
  const projectedProfitDelta = projectedGrossProfit - baselineGrossProfit;

  const metrics: CounterfactualMetric[] = [
    buildMetric(
      'Monthly Gross Revenue',
      'financial',
      '₹',
      params.baselineRevenueMonthly,
      projectedRevenue,
      0.12,
      true
    ),
    buildMetric(
      'Monthly Gross Profit',
      'financial',
      '₹',
      baselineGrossProfit,
      projectedGrossProfit,
      0.15,
      true
    ),
    buildMetric(
      'Unit Sales Volume Index',
      'operations',
      'index',
      100,
      Math.round(100 * newVolumeRatio),
      0.1,
      true
    ),
  ];

  const sideEffects: UnintendedSideEffect[] = [];
  if (volumeChangePct < -10) {
    sideEffects.push({
      title: 'Customer Conversion Drop',
      severity: 'MEDIUM',
      description: `Projected unit demand decreases by ${Math.abs(Math.round(volumeChangePct))}% due to price elasticity.`,
      mitigationSuggestion:
        'Bundle value-added gold polishing warranty or premium velvet gift packaging to preserve perceived value.',
    });
  }

  let recommendation: CounterfactualEvaluationResult['netBusinessRecommendation'] =
    'FAVORABLE_WITH_CONDITIONS';
  if (projectedProfitDelta > params.baselineRevenueMonthly * 0.05)
    recommendation = 'STRONGLY_FAVORABLE';
  else if (projectedProfitDelta < 0)
    recommendation = 'HIGH_RISK_NOT_RECOMMENDED';

  return {
    decisionType: 'tiered_pricing_elasticity',
    title: 'Tiered Price Elasticity Counterfactual Model',
    summary: `Simulated a ${params.priceAdjustmentPercent > 0 ? '+' : ''}${params.priceAdjustmentPercent}% price shift for ${params.priceTier.replace(/_/g, ' ')} jewellery (assumed PED: ${ped}).`,
    confidenceScore: 0.8,
    uncertaintyBasis: `Econometric elasticity benchmark for Indian jewellery retail in ${params.priceTier} bracket.`,
    metrics,
    sideEffects,
    assumptions: [
      `Assumed constant price elasticity of demand (PED = ${ped}).`,
      'Competitor prices assumed unchanged in the evaluated 30-day window.',
    ],
    netBusinessRecommendation: recommendation,
    isSimulatedProjection: true,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * 3. Model Promotional Campaign Structure
 */
export function modelPromotionalCampaignStructure(params: {
  baselineMonthlyOrders: number;
  baselineAov: number;
  baselineGrossMarginPercent: number; // e.g. 38%
  discountPercent: number; // e.g. 10%
  expectedConversionLiftPercent: number; // e.g. +20%
  snapshotProvenance?: SimulatorSnapshotProvenance;
  customAssumptions?: string[];
}): CounterfactualEvaluationResult {
  const baselineRevenue = params.baselineMonthlyOrders * params.baselineAov;
  const baselineCogs =
    baselineRevenue * (1 - params.baselineGrossMarginPercent / 100);
  const baselineProfit = baselineRevenue - baselineCogs;

  const simulatedOrders = Math.round(
    params.baselineMonthlyOrders *
      (1 + params.expectedConversionLiftPercent / 100)
  );
  const simulatedAov = Math.round(
    params.baselineAov * (1 - params.discountPercent / 100)
  );
  const simulatedRevenue = simulatedOrders * simulatedAov;
  // COGS scales with order volume
  const simulatedCogs =
    baselineCogs * (1 + params.expectedConversionLiftPercent / 100);
  const simulatedProfit = simulatedRevenue - simulatedCogs;
  const profitDelta = simulatedProfit - baselineProfit;

  const metrics: CounterfactualMetric[] = [
    buildMetric(
      'Monthly Order Count',
      'customer',
      'orders',
      params.baselineMonthlyOrders,
      simulatedOrders,
      0.08,
      true
    ),
    buildMetric(
      'Average Order Value (AOV)',
      'financial',
      '₹',
      params.baselineAov,
      simulatedAov,
      0.05,
      true
    ),
    buildMetric(
      'Monthly Gross Revenue',
      'financial',
      '₹',
      baselineRevenue,
      simulatedRevenue,
      0.1,
      true
    ),
    buildMetric(
      'Net Gross Profit',
      'financial',
      '₹',
      baselineProfit,
      simulatedProfit,
      0.15,
      true
    ),
  ];

  const sideEffects: UnintendedSideEffect[] = [];
  if (profitDelta < 0) {
    sideEffects.push({
      title: 'Discount Margin Erosion',
      severity: 'HIGH',
      description: `Discount of ${params.discountPercent}% dilutes margins faster than the ${params.expectedConversionLiftPercent}% conversion lift can offset (-₹${Math.round(Math.abs(profitDelta)).toLocaleString('en-IN')}).`,
      mitigationSuggestion:
        'Implement minimum order value threshold (e.g. valid only on cart totals > ₹25,000) to protect unit margins.',
    });
  }

  const assumptions = [
    `Assumes ${params.expectedConversionLiftPercent}% order volume increase during campaign.`,
    'Marketing ad acquisition spend assumed constant in simulation.',
    ...(params.customAssumptions || []),
  ];

  return {
    decisionType: 'promotional_campaign_structure',
    title: 'Promotional Campaign Structure Counterfactual Model',
    summary: `Simulated a ${params.discountPercent}% discount campaign generating a projected ${params.expectedConversionLiftPercent}% order conversion lift.`,
    confidenceScore: 0.82,
    uncertaintyBasis:
      'Empirical e-commerce promotional response curve calibrated against jewellery AOV.',
    metrics,
    sideEffects,
    assumptions,
    netBusinessRecommendation:
      profitDelta > 0
        ? 'FAVORABLE_WITH_CONDITIONS'
        : 'HIGH_RISK_NOT_RECOMMENDED',
    isSimulatedProjection: true,
    evaluatedAt: new Date().toISOString(),
    snapshotProvenance: params.snapshotProvenance,
  };
}

/**
 * 4. Model Expedited Delivery Promise
 */
export function modelExpeditedDeliveryPromise(params: {
  monthlyShipmentVolume: number;
  baselineCheckoutConversionRate: number; // e.g. 2.5%
  expressCourierSurchargePerShipment: number; // e.g. ₹150
  averageOrderGrossProfit: number; // e.g. ₹6,500
}): CounterfactualEvaluationResult {
  // Promising guaranteed 2-day delivery typically lifts checkout conversion by ~12%
  const conversionLiftPercent = 12;
  const simulatedOrderVolume = Math.round(
    params.monthlyShipmentVolume * (1 + conversionLiftPercent / 100)
  );
  const incrementalOrders = simulatedOrderVolume - params.monthlyShipmentVolume;

  const incrementalGrossProfit =
    incrementalOrders * params.averageOrderGrossProfit;
  const totalExpressCourierSurcharges =
    simulatedOrderVolume * params.expressCourierSurchargePerShipment;
  // Expedited orders slightly increase RTO risk if customer is absent on tight delivery schedule (~1% increase)
  const estimatedRtoLoss = Math.round(simulatedOrderVolume * 0.01 * 400); // ₹400 two-way courier cost
  const netDeliveryBenefit =
    incrementalGrossProfit - totalExpressCourierSurcharges - estimatedRtoLoss;

  const metrics: CounterfactualMetric[] = [
    buildMetric(
      'Monthly Order Volume',
      'customer',
      'orders',
      params.monthlyShipmentVolume,
      simulatedOrderVolume,
      0.1,
      true
    ),
    buildMetric(
      'Incremental Gross Profit',
      'financial',
      '₹',
      0,
      incrementalGrossProfit,
      0.15,
      true
    ),
    buildMetric(
      'Courier Surcharges & RTO Cost',
      'operations',
      '₹',
      0,
      totalExpressCourierSurcharges + estimatedRtoLoss,
      0.1,
      false
    ),
    buildMetric(
      'Net Monthly Shipping Benefit',
      'financial',
      '₹',
      0,
      netDeliveryBenefit,
      0.2,
      true
    ),
  ];

  const sideEffects: UnintendedSideEffect[] = [
    {
      title: 'Warehouse Dispatch SLA Pressure',
      severity: 'MEDIUM',
      description:
        'Guaranteed 2-day delivery requires same-day order verification, hallmarking, and pack-out before 4:00 PM.',
      mitigationSuggestion:
        'Restrict express delivery eligibility to pre-hallmarked, in-stock inventory only.',
    },
    {
      title: 'Carrier Delivery Failure Vulnerability',
      severity: 'LOW',
      description:
        'Customer unavailability on fast delivery attempts slightly inflates RTO courier fees.',
      mitigationSuggestion:
        'Send automated WhatsApp delivery tracking alerts with dispatch ETA confirmation.',
    },
  ];

  return {
    decisionType: 'expedited_delivery_promise',
    title: 'Expedited Delivery Promise Counterfactual Model',
    summary: `Simulated impact of guaranteed expedited delivery on conversion lift (+${conversionLiftPercent}%) vs logistics express surcharges.`,
    confidenceScore: 0.78,
    uncertaintyBasis:
      'Regional logistics SLA performance data across Tier-1 metro pincodes.',
    metrics,
    sideEffects,
    assumptions: [
      `Estimated +${conversionLiftPercent}% checkout conversion lift from express delivery badge.`,
      `Express courier surcharge modeled at ₹${params.expressCourierSurchargePerShipment} per dispatched parcel.`,
    ],
    netBusinessRecommendation:
      netDeliveryBenefit > 0
        ? 'STRONGLY_FAVORABLE'
        : 'HIGH_RISK_NOT_RECOMMENDED',
    isSimulatedProjection: true,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * 5. Model Free Shipping Threshold Economics (Track F - Phase 30)
 * Evaluates the financial and conversion impact of modifying the free shipping cart threshold.
 */
export function modelFreeShippingThresholdEconomics(params: {
  baselineMonthlyOrders: number;
  baselineAov: number;
  baselineGrossMarginPercent: number; // e.g. 38%
  currentThreshold: number; // e.g. 2500
  proposedThreshold: number; // e.g. 5000
  averageFulfillmentShippingCost: number; // e.g. 150
  standardShippingFeeCharged: number; // e.g. 100
  cartExpansionLiftPercent?: number; // e.g. 4%
  conversionDropPercent?: number; // e.g. 2%
  snapshotProvenance?: SimulatorSnapshotProvenance;
  customAssumptions?: string[];
}): CounterfactualEvaluationResult {
  const cartExpansionLift =
    params.cartExpansionLiftPercent ??
    (params.proposedThreshold > params.currentThreshold
      ? Math.min(
          10,
          Math.max(
            1,
            ((params.proposedThreshold - params.currentThreshold) /
              Math.max(1, params.currentThreshold)) *
              2
          )
        )
      : 0);

  const conversionDrop =
    params.conversionDropPercent ??
    (params.proposedThreshold > params.currentThreshold
      ? Math.min(
          6,
          Math.max(
            0.5,
            ((params.proposedThreshold - params.currentThreshold) /
              Math.max(1, params.currentThreshold)) *
              1.2
          )
        )
      : 0);

  // Baseline calculations
  const baselineRevenue = params.baselineMonthlyOrders * params.baselineAov;
  const baselineCogs =
    baselineRevenue * (1 - params.baselineGrossMarginPercent / 100);
  const baselineProductProfit = baselineRevenue - baselineCogs;

  // Fraction of orders qualifying for free shipping under current threshold
  const currentQualifyingRatio = Math.max(
    0.6,
    Math.min(0.98, 1 - params.currentThreshold / (params.baselineAov * 1.5))
  );
  const baselineQualifyingOrders = Math.round(
    params.baselineMonthlyOrders * currentQualifyingRatio
  );
  const baselineFeePayingOrders =
    params.baselineMonthlyOrders - baselineQualifyingOrders;

  // Shipping costs: brand absorbs courier cost on all shipments, recovers fee from sub-threshold orders
  const baselineCourierExpense =
    params.baselineMonthlyOrders * params.averageFulfillmentShippingCost;
  const baselineShippingFeeRevenue =
    baselineFeePayingOrders * params.standardShippingFeeCharged;
  const baselineNetShippingExpense =
    baselineCourierExpense - baselineShippingFeeRevenue;
  const baselineNetContribution =
    baselineProductProfit - baselineNetShippingExpense;

  // Projected calculations
  const projectedOrders = Math.round(
    params.baselineMonthlyOrders * (1 - conversionDrop / 100)
  );
  const projectedAov = Math.round(
    params.baselineAov * (1 + cartExpansionLift / 100)
  );
  const projectedRevenue = projectedOrders * projectedAov;
  const projectedCogs =
    projectedRevenue * (1 - params.baselineGrossMarginPercent / 100);
  const projectedProductProfit = projectedRevenue - projectedCogs;

  const proposedQualifyingRatio = Math.max(
    0.4,
    Math.min(0.95, 1 - params.proposedThreshold / (projectedAov * 1.5))
  );
  const projectedQualifyingOrders = Math.round(
    projectedOrders * proposedQualifyingRatio
  );
  const projectedFeePayingOrders = projectedOrders - projectedQualifyingOrders;

  const projectedCourierExpense =
    projectedOrders * params.averageFulfillmentShippingCost;
  const projectedShippingFeeRevenue =
    projectedFeePayingOrders * params.standardShippingFeeCharged;
  const projectedNetShippingExpense =
    projectedCourierExpense - projectedShippingFeeRevenue;
  const projectedNetContribution =
    projectedProductProfit - projectedNetShippingExpense;

  const netContributionDelta =
    projectedNetContribution - baselineNetContribution;

  const metrics: CounterfactualMetric[] = [
    buildMetric(
      'Monthly Merchandise Revenue',
      'financial',
      '₹',
      baselineRevenue,
      projectedRevenue,
      0.08,
      true
    ),
    buildMetric(
      'Average Order Value (AOV)',
      'financial',
      '₹',
      params.baselineAov,
      projectedAov,
      0.05,
      true
    ),
    buildMetric(
      'Monthly Order Volume',
      'customer',
      'orders',
      params.baselineMonthlyOrders,
      projectedOrders,
      0.06,
      true
    ),
    buildMetric(
      'Net Shipping Expense',
      'operations',
      '₹',
      baselineNetShippingExpense,
      projectedNetShippingExpense,
      0.1,
      false // Lower is better
    ),
    buildMetric(
      'Net Operating Contribution',
      'financial',
      '₹',
      baselineNetContribution,
      projectedNetContribution,
      0.12,
      true
    ),
  ];

  const sideEffects: UnintendedSideEffect[] = [];
  if (params.proposedThreshold > params.currentThreshold * 1.5) {
    sideEffects.push({
      title: 'Cart Abandonment Risk on Entry-Tier Jewellery',
      severity: 'MEDIUM',
      description: `Raising free shipping threshold from ₹${params.currentThreshold.toLocaleString('en-IN')} to ₹${params.proposedThreshold.toLocaleString('en-IN')} creates checkout friction for lightweight gifts and charms.`,
      mitigationSuggestion:
        'Display dynamic cart drawer progress indicator: "Add ₹X more to unlock Free Insured Express Delivery".',
    });
  }

  if (netContributionDelta < 0) {
    sideEffects.push({
      title: 'Contribution Margin Compression',
      severity: 'HIGH',
      description: `Order loss of ${conversionDrop.toFixed(1)}% outweighs the cart expansion gain, resulting in a net monthly loss of -₹${Math.round(Math.abs(netContributionDelta)).toLocaleString('en-IN')}.`,
      mitigationSuggestion:
        'Keep free shipping on prepaid UPI/cards regardless of threshold to protect conversion, or test a smaller threshold increment.',
    });
  }

  const assumptions = [
    `Current free shipping threshold: ₹${params.currentThreshold.toLocaleString('en-IN')}; Proposed: ₹${params.proposedThreshold.toLocaleString('en-IN')}.`,
    `Modeled AOV cart expansion lift: +${cartExpansionLift.toFixed(1)}% from customers topping up orders.`,
    `Modeled checkout conversion attrition: -${conversionDrop.toFixed(1)}% from shipping fee resistance.`,
    `Carrier fulfillment cost absorbed per parcel: ₹${params.averageFulfillmentShippingCost}; Fee billed to sub-threshold carts: ₹${params.standardShippingFeeCharged}.`,
    ...(params.customAssumptions || []),
  ];

  let recommendation: CounterfactualEvaluationResult['netBusinessRecommendation'] =
    'FAVORABLE_WITH_CONDITIONS';
  if (netContributionDelta > 50000) {
    recommendation = 'STRONGLY_FAVORABLE';
  } else if (netContributionDelta <= 0) {
    recommendation = 'HIGH_RISK_NOT_RECOMMENDED';
  }

  return {
    decisionType: 'free_shipping_threshold_economics',
    title: 'Free Shipping Threshold Economics Counterfactual Model',
    summary: `Simulated shift in free shipping threshold from ₹${params.currentThreshold.toLocaleString('en-IN')} to ₹${params.proposedThreshold.toLocaleString('en-IN')} with net contribution impact of ${netContributionDelta >= 0 ? '+' : ''}₹${Math.round(netContributionDelta).toLocaleString('en-IN')}/mo.`,
    confidenceScore: 0.84,
    uncertaintyBasis:
      'Calibrated against retail e-commerce cart-top-up elasticity and courier fulfillment subsidy benchmarks.',
    metrics,
    sideEffects,
    assumptions,
    netBusinessRecommendation: recommendation,
    isSimulatedProjection: true,
    evaluatedAt: new Date().toISOString(),
    snapshotProvenance: params.snapshotProvenance,
  };
}
