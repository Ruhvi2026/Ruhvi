import 'server-only';

import {
  getCanonicalMetric,
  type DateRangePreset,
  type MetricValue,
  type TimeWindow,
} from './metrics-service';
import {
  modelPromotionalCampaignStructure,
  type CounterfactualEvaluationResult,
  type SimulatorSnapshotProvenance,
  type SnapshotObservedMetric,
} from './counterfactual-models';

/**
 * ============================================================================
 * SIMULATOR SNAPSHOT SERVICE (TRACK F - PHASE 29)
 * ============================================================================
 * Connects offline simulator scenarios to verified, durable business snapshots
 * instead of silently relying on hardcoded sample defaults.
 *
 * Guarantees:
 * 1. Truth in Modeling:
 *    - Strictly separates observed actuals, user assumptions, and model estimates.
 *    - Records snapshot timestamp and source time window.
 * 2. Honest Insufficient Data Handling:
 *    - If historical order velocity or AOV is empty or unavailable, returns
 *      an explicit 'insufficient_data' state rather than inventing fake data.
 * 3. Clear Tagging of Sample Fixtures:
 *    - When fallback defaults are explicitly enabled, tags them as
 *      'fallback_default' with prominent disclaimers, never presenting sample
 *      numbers as actual company performance.
 * 4. Deterministic Reproducibility:
 *    - Provides pure reproducible calculation guaranteeing that given the same
 *      named inputs, the model produces the exact same outputs.
 */

export const PROMOTION_SNAPSHOT_FALLBACK = {
  baselineMonthlyOrders: 350,
  baselineAov: 38500,
  baselineGrossMarginPercent: 38,
};

export interface SnapshotFetchOptions {
  preset?: DateRangePreset;
  callerRole?: string;
  allowFallback?: boolean;
}

export interface PromotionSnapshotData {
  snapshotSource:
    'verified_business_snapshot' | 'fallback_default' | 'insufficient_data';
  snapshotTimestamp: string;
  timeWindow: TimeWindow;
  observedValues: {
    baselineMonthlyOrders: SnapshotObservedMetric;
    baselineAov: SnapshotObservedMetric;
    baselineGrossSales?: SnapshotObservedMetric;
  };
  dataQualityNotice: string;
}

export interface PromotionalCampaignSnapshotParams {
  discountPercent: number;
  expectedConversionLiftPercent: number;
  baselineGrossMarginPercent?: number;
  preset?: DateRangePreset;
  callerRole?: string;
  allowFallback?: boolean;
}

/**
 * Fetches verified canonical business metrics for the promotional campaign scenario.
 * Gathers paid orders count, average order value, and gross sales.
 */
export async function fetchVerifiedPromotionSnapshot(
  options: SnapshotFetchOptions = {}
): Promise<PromotionSnapshotData> {
  const {
    preset = 'last_30_days',
    callerRole = 'admin',
    allowFallback = true,
  } = options;

  const snapshotTimestamp = new Date().toISOString();

  // Fetch canonical metrics across the specified window
  const [ordersMetric, aovMetric, grossSalesMetric] = await Promise.all([
    getCanonicalMetric('paid_orders_count', { callerRole, preset }),
    getCanonicalMetric('average_order_value', { callerRole, preset }),
    getCanonicalMetric('gross_sales', { callerRole, preset }).catch(() => null),
  ]);

  const hasOrders =
    ordersMetric.status === 'available' &&
    ordersMetric.value !== null &&
    ordersMetric.value > 0;
  const hasAov =
    aovMetric.status === 'available' &&
    aovMetric.value !== null &&
    aovMetric.value > 0;

  // Case 1: Verified snapshot with real historical orders
  if (hasOrders && hasAov) {
    return {
      snapshotSource: 'verified_business_snapshot',
      snapshotTimestamp,
      timeWindow: ordersMetric.timeWindow,
      observedValues: {
        baselineMonthlyOrders: {
          value: ordersMetric.value,
          status: 'available',
          sourceMetric: 'paid_orders_count',
          sampleSize: ordersMetric.sampleSize,
          isFallbackDefault: false,
        },
        baselineAov: {
          value: aovMetric.value,
          status: 'available',
          sourceMetric: 'average_order_value',
          sampleSize: aovMetric.sampleSize,
          isFallbackDefault: false,
        },
        ...(grossSalesMetric && {
          baselineGrossSales: {
            value: grossSalesMetric.value,
            status: grossSalesMetric.status,
            sourceMetric: 'gross_sales',
            sampleSize: grossSalesMetric.sampleSize,
            isFallbackDefault: false,
          },
        }),
      },
      dataQualityNotice: `Baseline metrics verified against ${ordersMetric.sampleSize ?? ordersMetric.value} orders in ${preset.replace(/_/g, ' ')} window.`,
    };
  }

  // Case 2: Insufficient historical data & fallback NOT permitted
  if (!allowFallback) {
    return {
      snapshotSource: 'insufficient_data',
      snapshotTimestamp,
      timeWindow: ordersMetric.timeWindow,
      observedValues: {
        baselineMonthlyOrders: {
          value: null,
          status: 'insufficient_data',
          sourceMetric: 'paid_orders_count',
          sampleSize: ordersMetric.sampleSize ?? 0,
          isFallbackDefault: false,
        },
        baselineAov: {
          value: null,
          status: 'insufficient_data',
          sourceMetric: 'average_order_value',
          sampleSize: aovMetric.sampleSize ?? 0,
          isFallbackDefault: false,
        },
        ...(grossSalesMetric && {
          baselineGrossSales: {
            value: null,
            status: 'insufficient_data',
            sourceMetric: 'gross_sales',
            sampleSize: grossSalesMetric.sampleSize ?? 0,
            isFallbackDefault: false,
          },
        }),
      },
      dataQualityNotice:
        'Insufficient verified order history in the selected window. At least 1 verified paid order is required to run simulation without fallback fixtures.',
    };
  }

  // Case 3: Fallback permitted — explicitly tagged sample defaults
  return {
    snapshotSource: 'fallback_default',
    snapshotTimestamp,
    timeWindow: ordersMetric.timeWindow,
    observedValues: {
      baselineMonthlyOrders: {
        value: PROMOTION_SNAPSHOT_FALLBACK.baselineMonthlyOrders,
        status: 'available',
        sourceMetric: 'paid_orders_count',
        isFallbackDefault: true,
      },
      baselineAov: {
        value: PROMOTION_SNAPSHOT_FALLBACK.baselineAov,
        status: 'available',
        sourceMetric: 'average_order_value',
        isFallbackDefault: true,
      },
    },
    dataQualityNotice:
      'CAUTION: Live order data is insufficient or empty in the selected window. Using calibrated default retail fixtures (350 orders, ₹38,500 AOV). Do NOT present these figures as verified business actuals.',
  };
}

/**
 * Runs the Promotional Campaign Scenario backed by verified business snapshots.
 * Strictly separates observed values, user assumptions, and model estimates.
 */
export async function simulatePromotionalCampaignWithSnapshot(
  params: PromotionalCampaignSnapshotParams
): Promise<CounterfactualEvaluationResult> {
  const {
    discountPercent,
    expectedConversionLiftPercent,
    baselineGrossMarginPercent = PROMOTION_SNAPSHOT_FALLBACK.baselineGrossMarginPercent,
    preset = 'last_30_days',
    callerRole = 'admin',
    allowFallback = true,
  } = params;

  // 1. Fetch snapshot
  const snapshot = await fetchVerifiedPromotionSnapshot({
    preset,
    callerRole,
    allowFallback,
  });

  // 2. Handle insufficient data without fabricating values
  if (snapshot.snapshotSource === 'insufficient_data') {
    const provenance: SimulatorSnapshotProvenance = {
      snapshotSource: 'insufficient_data',
      snapshotTimestamp: snapshot.snapshotTimestamp,
      sourceTimeWindow: snapshot.timeWindow,
      observedValues: snapshot.observedValues,
      userEnteredAssumptions: {
        discountPercent,
        expectedConversionLiftPercent,
        baselineGrossMarginPercent,
      },
      modelEstimates: {},
      dataQualityNotice: snapshot.dataQualityNotice,
    };

    return {
      decisionType: 'promotional_campaign_structure',
      title: 'Promotional Campaign Model (Insufficient Data)',
      summary:
        'Unable to evaluate promotional campaign against real business snapshot because verified order history is empty in the selected window.',
      confidenceScore: 0,
      uncertaintyBasis:
        'Simulation halted: Zero live orders available to establish baseline AOV and demand velocity.',
      metrics: [],
      sideEffects: [
        {
          title: 'Insufficient Historical Orders',
          severity: 'HIGH',
          description:
            'No confirmed paid orders exist in the database for the selected comparison window.',
          mitigationSuggestion:
            'Acknowledge real transaction volume or set allowFallback: true to explore hypothetical scenarios with sample retail fixtures.',
        },
      ],
      assumptions: [
        'Simulation requires verified historical order data.',
        'No hypothetical numbers were invented to replace missing business data.',
      ],
      netBusinessRecommendation: 'HIGH_RISK_NOT_RECOMMENDED',
      isSimulatedProjection: true,
      evaluatedAt: new Date().toISOString(),
      snapshotProvenance: provenance,
    };
  }

  // 3. Extract baseline metrics from snapshot
  const baselineMonthlyOrders =
    snapshot.observedValues.baselineMonthlyOrders.value ??
    PROMOTION_SNAPSHOT_FALLBACK.baselineMonthlyOrders;
  const baselineAov =
    snapshot.observedValues.baselineAov.value ??
    PROMOTION_SNAPSHOT_FALLBACK.baselineAov;

  // 4. Calculate deterministic model estimates
  const baselineRevenue = baselineMonthlyOrders * baselineAov;
  const baselineCogs = baselineRevenue * (1 - baselineGrossMarginPercent / 100);
  const baselineProfit = baselineRevenue - baselineCogs;

  const simulatedOrders = Math.round(
    baselineMonthlyOrders * (1 + expectedConversionLiftPercent / 100)
  );
  const simulatedAov = Math.round(baselineAov * (1 - discountPercent / 100));
  const simulatedRevenue = simulatedOrders * simulatedAov;
  const simulatedCogs =
    baselineCogs * (1 + expectedConversionLiftPercent / 100);
  const simulatedProfit = simulatedRevenue - simulatedCogs;
  const profitDelta = simulatedProfit - baselineProfit;

  // 5. Build provenance separating inputs cleanly
  const provenance: SimulatorSnapshotProvenance = {
    snapshotSource: snapshot.snapshotSource,
    snapshotTimestamp: snapshot.snapshotTimestamp,
    sourceTimeWindow: snapshot.timeWindow,
    observedValues: snapshot.observedValues,
    userEnteredAssumptions: {
      discountPercent,
      expectedConversionLiftPercent,
      baselineGrossMarginPercent,
    },
    modelEstimates: {
      simulatedOrders,
      simulatedAov,
      simulatedRevenue,
      simulatedProfit,
      profitDelta,
    },
    dataQualityNotice: snapshot.dataQualityNotice,
  };

  const customAssumptions = [
    snapshot.snapshotSource === 'verified_business_snapshot'
      ? `Baseline orders (${baselineMonthlyOrders}) and AOV (₹${baselineAov.toLocaleString('en-IN')}) sourced from verified transactional snapshot.`
      : `Baseline figures are calibrated sample defaults (NOT verified company data): ${baselineMonthlyOrders} orders, ₹${baselineAov.toLocaleString('en-IN')} AOV.`,
  ];

  // 6. Execute deterministic model
  return modelPromotionalCampaignStructure({
    baselineMonthlyOrders,
    baselineAov,
    baselineGrossMarginPercent,
    discountPercent,
    expectedConversionLiftPercent,
    snapshotProvenance: provenance,
    customAssumptions,
  });
}

/**
 * Pure reproduction utility ensuring all model outputs are exactly reproducible
 * from named inputs without stochastic variation or hidden state.
 */
export function reproducePromotionalCampaignOutputs(inputs: {
  baselineMonthlyOrders: number;
  baselineAov: number;
  baselineGrossMarginPercent: number;
  discountPercent: number;
  expectedConversionLiftPercent: number;
}) {
  const {
    baselineMonthlyOrders,
    baselineAov,
    baselineGrossMarginPercent,
    discountPercent,
    expectedConversionLiftPercent,
  } = inputs;

  const baselineRevenue = baselineMonthlyOrders * baselineAov;
  const baselineCogs = baselineRevenue * (1 - baselineGrossMarginPercent / 100);
  const baselineProfit = baselineRevenue - baselineCogs;

  const simulatedOrders = Math.round(
    baselineMonthlyOrders * (1 + expectedConversionLiftPercent / 100)
  );
  const simulatedAov = Math.round(baselineAov * (1 - discountPercent / 100));
  const simulatedRevenue = simulatedOrders * simulatedAov;
  const simulatedCogs =
    baselineCogs * (1 + expectedConversionLiftPercent / 100);
  const simulatedProfit = simulatedRevenue - simulatedCogs;
  const profitDelta = simulatedProfit - baselineProfit;

  return {
    baselineRevenue,
    baselineProfit,
    simulatedOrders,
    simulatedAov,
    simulatedRevenue,
    simulatedProfit,
    profitDelta,
  };
}
