import 'server-only';

/**
 * ============================================================================
 * OFFLINE AI DECISION SIMULATOR HARNESS (TRACK I - PHASE 43)
 * ============================================================================
 * Sandboxed, in-memory counterfactual simulation harness that replays proposals
 * and business scenarios against historical catalog/sales context.
 *
 * Guarantees:
 * 1. Strictly Sandboxed & Read-Only:
 *    - Executes entirely in-memory against snapshot fixtures.
 *    - NEVER mutates production database rows, charges payment gateways,
 *      or sends outbound network calls.
 * 2. Multi-Scenario Modeling:
 *    - Inventory safety buffer adjustments (capital vs stockout risk).
 *    - Price elasticity modifications (revenue vs volume vs margin).
 *    - Promotional discount campaigns (conversion lift vs margin erosion).
 *    - Supplier lead time delays (stockout exposure & revenue at risk).
 * 3. Transparent Comparative Metrics:
 *    - Emits baseline vs simulated comparative deltas (absolute and %).
 *    - Quantifies projected profit delta, working capital impact, and tradeoffs.
 *    - Expresses confidence scores (0.0 to 1.0) and model assumptions.
 */

export type SimulationScenarioType =
  | 'inventory_safety_buffer_adjustment'
  | 'price_elasticity_change'
  | 'promotional_discount_campaign'
  | 'supplier_lead_time_delay';

export interface HistoricalProductSnapshot {
  id: string;
  sku: string;
  name: string;
  currentPrice: number;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  historical30DaySalesUnits: number;
  supplierLeadTimeDays?: number;
}

export interface SimulationFixture {
  id: string;
  name: string;
  periodDays: number;
  products: HistoricalProductSnapshot[];
  totalHistoricalOrders: number;
  historicalAov: number;
}

export interface SimulationScenarioConfig {
  type: SimulationScenarioType;
  title: string;
  description: string;
  parameters: {
    // Inventory buffer
    thresholdAdjustmentDelta?: number; // e.g. +3 or -2 units
    targetProductIds?: string[];
    // Price elasticity
    priceChangePercent?: number; // e.g. +10 or -10%
    elasticityCoefficient?: number; // default: -1.2 for luxury jewellery
    // Promotional discount
    discountPercent?: number; // e.g. 10%
    projectedConversionLiftPercent?: number; // e.g. +15%
    // Lead time delay
    leadTimeIncreaseDays?: number; // e.g. +14 days
  };
}

export interface MetricComparison {
  metric: string;
  label: string;
  unit: string;
  baseline: number;
  simulated: number;
  absoluteDelta: number;
  percentDelta: number;
  verdict: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface SimulationResult {
  simulationId: string;
  scenarioType: SimulationScenarioType;
  scenarioTitle: string;
  fixtureId: string;
  fixtureName: string;
  durationDays: number;

  comparisons: MetricComparison[];
  projectedWorkingCapitalDelta: number;
  projectedProfitDelta: number;

  confidenceScore: number;
  assumptions: string[];
  keyTradeoffs: string[];
  recommendation: 'FAVORABLE' | 'MODERATE_RISK' | 'UNFAVORABLE';

  isSandboxedReadOnly: true;
  executedAt: string;
}

/**
 * Creates a standard comparative metric item.
 */
function createComparison(
  metric: string,
  label: string,
  unit: string,
  baseline: number,
  simulated: number,
  isHigherBetter = true
): MetricComparison {
  const b = Math.round(baseline * 100) / 100;
  const s = Math.round(simulated * 100) / 100;
  const absoluteDelta = Math.round((s - b) * 100) / 100;
  const percentDelta = b !== 0 ? Math.round(((s - b) / b) * 100 * 10) / 10 : 0;

  let verdict: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (absoluteDelta > 0) {
    verdict = isHigherBetter ? 'POSITIVE' : 'NEGATIVE';
  } else if (absoluteDelta < 0) {
    verdict = isHigherBetter ? 'NEGATIVE' : 'POSITIVE';
  }

  return {
    metric,
    label,
    unit,
    baseline: b,
    simulated: s,
    absoluteDelta,
    percentDelta,
    verdict,
  };
}

/**
 * Executes a deterministic offline simulation against a snapshot fixture.
 */
export function simulateDecisionScenario(
  scenario: SimulationScenarioConfig,
  fixture: SimulationFixture
): SimulationResult {
  const executedAt = new Date().toISOString();
  const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const comparisons: MetricComparison[] = [];
  const assumptions: string[] = [];
  const keyTradeoffs: string[] = [];

  let projectedWorkingCapitalDelta = 0;
  let projectedProfitDelta = 0;
  const confidenceScore = 0.8;
  let recommendation: 'FAVORABLE' | 'MODERATE_RISK' | 'UNFAVORABLE' =
    'FAVORABLE';

  const totalBaselineUnits = fixture.products.reduce(
    (acc, p) => acc + p.historical30DaySalesUnits,
    0
  );
  const totalBaselineRevenue = fixture.products.reduce(
    (acc, p) => acc + p.historical30DaySalesUnits * p.currentPrice,
    0
  );
  const totalBaselineCogs = fixture.products.reduce(
    (acc, p) => acc + p.historical30DaySalesUnits * p.costPrice,
    0
  );
  const totalBaselineGrossProfit = totalBaselineRevenue - totalBaselineCogs;
  const totalBaselineWorkingCapital = fixture.products.reduce(
    (acc, p) => acc + p.stockQuantity * p.costPrice,
    0
  );

  // ─── Scenario 1: Inventory Safety Buffer Adjustment ────────────────────────
  if (scenario.type === 'inventory_safety_buffer_adjustment') {
    const delta = scenario.parameters.thresholdAdjustmentDelta ?? 3;
    const targetSet = scenario.parameters.targetProductIds
      ? new Set(scenario.parameters.targetProductIds)
      : null;

    let baselineBufferCapital = 0;
    let simulatedBufferCapital = 0;
    let baselineStockoutRiskCount = 0;
    let simulatedStockoutRiskCount = 0;

    for (const p of fixture.products) {
      if (targetSet && !targetSet.has(p.id)) continue;

      const baseBuffer = p.lowStockThreshold;
      const simBuffer = Math.max(1, baseBuffer + delta);

      baselineBufferCapital += baseBuffer * p.costPrice;
      simulatedBufferCapital += simBuffer * p.costPrice;

      if (p.stockQuantity <= baseBuffer) baselineStockoutRiskCount++;
      if (p.stockQuantity <= simBuffer) simulatedStockoutRiskCount++;
    }

    projectedWorkingCapitalDelta =
      simulatedBufferCapital - baselineBufferCapital;
    // Buffer changes lock/release working capital; immediate profit delta is neutral
    projectedProfitDelta = 0;

    comparisons.push(
      createComparison(
        'buffer_capital',
        'Working Capital Tied in Buffers',
        '₹',
        baselineBufferCapital,
        simulatedBufferCapital,
        false
      ),
      createComparison(
        'stockout_alert_skus',
        'SKUs at or below Threshold',
        'SKUs',
        baselineStockoutRiskCount,
        simulatedStockoutRiskCount,
        false
      ),
      createComparison(
        'total_working_capital',
        'Total Inventory Asset Value',
        '₹',
        totalBaselineWorkingCapital,
        totalBaselineWorkingCapital + projectedWorkingCapitalDelta,
        false
      )
    );

    assumptions.push(
      `Safety stock buffer adjusted by ${delta > 0 ? '+' : ''}${delta} units across target SKUs.`
    );
    assumptions.push(
      'Stock replenishment cycle assumes regular vendor order adherence.'
    );

    if (delta > 0) {
      keyTradeoffs.push(
        `Increasing safety buffers ties up an additional ₹${Math.abs(projectedWorkingCapitalDelta).toLocaleString('en-IN')} in working capital.`
      );
      keyTradeoffs.push(
        'Provides a wider buffer against sudden sales surges, reducing stockout likelihood.'
      );
      recommendation =
        projectedWorkingCapitalDelta > 500000 ? 'MODERATE_RISK' : 'FAVORABLE';
    } else {
      keyTradeoffs.push(
        `Decreasing safety buffers releases ₹${Math.abs(projectedWorkingCapitalDelta).toLocaleString('en-IN')} in working capital.`
      );
      keyTradeoffs.push(
        'Increases risk of stockouts if sales velocity spikes.'
      );
      recommendation = 'MODERATE_RISK';
    }
  }

  // ─── Scenario 2: Price Elasticity Change ───────────────────────────────────
  else if (scenario.type === 'price_elasticity_change') {
    const priceChangePct = scenario.parameters.priceChangePercent ?? 5; // e.g. +5%
    const elasticity = scenario.parameters.elasticityCoefficient ?? -1.2; // Luxury jewellery benchmark

    // % Change in Volume = % Change in Price * Elasticity
    const volumeChangePct = priceChangePct * elasticity;
    const volumeMultiplier = Math.max(0, 1 + volumeChangePct / 100);
    const priceMultiplier = Math.max(0.1, 1 + priceChangePct / 100);

    let simulatedRevenue = 0;
    let simulatedCogs = 0;
    let simulatedUnits = 0;

    for (const p of fixture.products) {
      const simPrice = p.currentPrice * priceMultiplier;
      const simUnits = Math.round(
        p.historical30DaySalesUnits * volumeMultiplier
      );
      simulatedUnits += simUnits;
      simulatedRevenue += simUnits * simPrice;
      simulatedCogs += simUnits * p.costPrice;
    }

    const simulatedGrossProfit = simulatedRevenue - simulatedCogs;
    projectedProfitDelta = simulatedGrossProfit - totalBaselineGrossProfit;

    comparisons.push(
      createComparison(
        'gross_revenue',
        'Gross Revenue',
        '₹',
        totalBaselineRevenue,
        simulatedRevenue,
        true
      ),
      createComparison(
        'gross_profit',
        'Gross Profit',
        '₹',
        totalBaselineGrossProfit,
        simulatedGrossProfit,
        true
      ),
      createComparison(
        'unit_sales',
        'Units Sold',
        'units',
        totalBaselineUnits,
        simulatedUnits,
        true
      )
    );

    assumptions.push(
      `Price adjustment of ${priceChangePct > 0 ? '+' : ''}${priceChangePct}% evaluated across catalogue.`
    );
    assumptions.push(
      `Price elasticity of demand (PED) assumed at ${elasticity}.`
    );

    if (projectedProfitDelta > 0) {
      keyTradeoffs.push(
        `Gross profit expands by ₹${Math.abs(projectedProfitDelta).toLocaleString('en-IN')} despite a ${Math.abs(Math.round(volumeChangePct))}% shift in unit volume.`
      );
      recommendation = 'FAVORABLE';
    } else {
      keyTradeoffs.push(
        `Price elasticity causes demand drop that outstrips margin gains (profit drops by ₹${Math.abs(projectedProfitDelta).toLocaleString('en-IN')}).`
      );
      recommendation = 'UNFAVORABLE';
    }
  }

  // ─── Scenario 3: Promotional Discount Campaign ─────────────────────────────
  else if (scenario.type === 'promotional_discount_campaign') {
    const discountPct = scenario.parameters.discountPercent ?? 10; // e.g. 10% off
    const liftPct = scenario.parameters.projectedConversionLiftPercent ?? 20; // +20% order volume

    const orderMultiplier = 1 + liftPct / 100;
    const simulatedOrders = Math.round(
      fixture.totalHistoricalOrders * orderMultiplier
    );
    const simulatedAov = fixture.historicalAov * (1 - discountPct / 100);
    const simulatedRevenue = simulatedOrders * simulatedAov;
    const _simulatedUnits = Math.round(totalBaselineUnits * orderMultiplier);
    const simulatedCogs = totalBaselineCogs * orderMultiplier;
    const simulatedGrossProfit = simulatedRevenue - simulatedCogs;

    projectedProfitDelta = simulatedGrossProfit - totalBaselineGrossProfit;

    comparisons.push(
      createComparison(
        'total_orders',
        'Total Orders',
        'orders',
        fixture.totalHistoricalOrders,
        simulatedOrders,
        true
      ),
      createComparison(
        'average_order_value',
        'Average Order Value (AOV)',
        '₹',
        fixture.historicalAov,
        simulatedAov,
        true
      ),
      createComparison(
        'gross_revenue',
        'Gross Sales Revenue',
        '₹',
        totalBaselineRevenue,
        simulatedRevenue,
        true
      ),
      createComparison(
        'gross_profit',
        'Gross Profit',
        '₹',
        totalBaselineGrossProfit,
        simulatedGrossProfit,
        true
      )
    );

    assumptions.push(
      `Coupon discount of ${discountPct}% with a projected ${liftPct}% order conversion lift.`
    );
    assumptions.push('Assumes COGS scales proportionally with unit volume.');

    if (projectedProfitDelta > 0) {
      keyTradeoffs.push(
        `Volume lift (+${liftPct}%) overcomes discount dilution (+₹${Math.abs(projectedProfitDelta).toLocaleString('en-IN')} gross profit).`
      );
      recommendation = 'FAVORABLE';
    } else {
      keyTradeoffs.push(
        `Discount compression erodes margin; volume lift does not offset discount (-₹${Math.abs(projectedProfitDelta).toLocaleString('en-IN')} gross profit).`
      );
      recommendation = 'MODERATE_RISK';
    }
  }

  // ─── Scenario 4: Supplier Lead Time Delay ──────────────────────────────────
  else if (scenario.type === 'supplier_lead_time_delay') {
    const delayDays = scenario.parameters.leadTimeIncreaseDays ?? 14;
    let baselineStockoutRiskRevenue = 0;
    let simulatedStockoutRiskRevenue = 0;

    for (const p of fixture.products) {
      const baseLead = p.supplierLeadTimeDays || 10;
      const simLead = baseLead + delayDays;
      const dailyRate = p.historical30DaySalesUnits / 30;

      const baseRop = Math.ceil(dailyRate * baseLead + p.lowStockThreshold);
      const simRop = Math.ceil(dailyRate * simLead + p.lowStockThreshold);

      if (p.stockQuantity <= baseRop) {
        baselineStockoutRiskRevenue +=
          (baseRop - p.stockQuantity) * p.currentPrice;
      }
      if (p.stockQuantity <= simRop) {
        simulatedStockoutRiskRevenue +=
          (simRop - p.stockQuantity) * p.currentPrice;
      }
    }

    const revenueAtRiskDelta =
      simulatedStockoutRiskRevenue - baselineStockoutRiskRevenue;
    projectedProfitDelta = -Math.round(revenueAtRiskDelta * 0.4); // Estimated gross margin at risk

    comparisons.push(
      createComparison(
        'revenue_at_risk',
        'Revenue at Risk of Stockout',
        '₹',
        baselineStockoutRiskRevenue,
        simulatedStockoutRiskRevenue,
        false
      ),
      createComparison(
        'margin_at_risk',
        'Estimated Gross Margin at Risk',
        '₹',
        baselineStockoutRiskRevenue * 0.4,
        simulatedStockoutRiskRevenue * 0.4,
        false
      )
    );

    assumptions.push(
      `Supplier replenishment lead time increases by +${delayDays} calendar days.`
    );
    assumptions.push(
      'Stockout exposure calculated from current on-hand stock and sales velocity.'
    );

    keyTradeoffs.push(
      `Supply chain delay increases potential revenue at risk by ₹${revenueAtRiskDelta.toLocaleString('en-IN')}.`
    );
    keyTradeoffs.push(
      'Requires earlier purchase order placement or temporary vendor diversification.'
    );
    recommendation =
      revenueAtRiskDelta > 200000 ? 'UNFAVORABLE' : 'MODERATE_RISK';
  }

  return {
    simulationId,
    scenarioType: scenario.type,
    scenarioTitle: scenario.title,
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    durationDays: fixture.periodDays,
    comparisons,
    projectedWorkingCapitalDelta,
    projectedProfitDelta,
    confidenceScore,
    assumptions,
    keyTradeoffs,
    recommendation,
    isSandboxedReadOnly: true,
    executedAt,
  };
}
