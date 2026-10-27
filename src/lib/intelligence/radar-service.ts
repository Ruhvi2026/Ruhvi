import 'server-only';

import {
  getCanonicalMetric,
  getIstTimeWindow,
  verifyMetricsAuthorization,
  type CanonicalMetric,
  type DateRangePreset,
  type MetricValue,
  type TimeWindow,
} from './metrics-service';

export type { DateRangePreset };

/**
 * ============================================================================
 * BUSINESS RADAR AGGREGATION SERVICE (TRACK C - PHASE 17)
 * ============================================================================
 * Core aggregation engine powering the Business Radar. Evaluates canonical KPIs
 * across comparison windows, computes direction of change, determines operational
 * severity, and filters departmental sections strictly by caller RBAC.
 *
 * Guarantees:
 * 1. Single Source of Truth: Derived strictly from Phase 15 canonical metrics.
 * 2. Deterministic Severity: Documented thresholds for cancellation, RTO, stockout,
 *    and payment failure rates.
 * 3. Comparative Analysis: Current period vs Previous equivalent period without
 *    invent-on-the-fly math.
 * 4. Departmental RBAC: Staff roles cannot inspect financial sections (Gross/Net Sales, AOV).
 * 5. Robust Fallbacks: Returns explicit 'insufficient_data' states for empty windows.
 */

export type MetricSeverity =
  'healthy' | 'warning' | 'critical' | 'insufficient_data';
export type MetricDirection = 'up' | 'down' | 'neutral' | 'unknown';
export type TrendQuality =
  'improving' | 'deteriorating' | 'neutral' | 'unknown';

export interface RadarMetricItem {
  metric: CanonicalMetric;
  label: string;
  category: 'financial' | 'operations' | 'inventory' | 'infrastructure';
  current: MetricValue;
  previous?: MetricValue;
  delta: number | null;
  pctChange: number | null;
  direction: MetricDirection;
  trendQuality: TrendQuality;
  severity: MetricSeverity;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

export interface BusinessRadarSummary {
  overallHealth: MetricSeverity;
  timeWindow: TimeWindow;
  comparisonWindow?: TimeWindow;
  callerRole: string;
  generatedAt: string;
  sections: {
    financial?: Record<string, RadarMetricItem>;
    operations?: Record<string, RadarMetricItem>;
    inventory?: Record<string, RadarMetricItem>;
    infrastructure?: Record<string, RadarMetricItem>;
  };
  anomaliesDetectedCount: number;
}

export interface RadarSummaryOptions {
  preset?: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  fresh?: boolean;
}

// Canonical Metric Labels & Categories
const METRIC_DEFINITIONS: Record<
  CanonicalMetric,
  {
    label: string;
    category: 'financial' | 'operations' | 'inventory' | 'infrastructure';
    lowerIsBetter?: boolean;
    thresholds?: { warning: number; critical: number };
  }
> = {
  gross_sales: { label: 'Gross Sales', category: 'financial' },
  net_sales: { label: 'Net Realized Revenue', category: 'financial' },
  average_order_value: {
    label: 'Average Order Value (AOV)',
    category: 'financial',
  },
  paid_orders_count: { label: 'Paid Orders Volume', category: 'operations' },
  cancellation_rate: {
    label: 'Cancellation Rate',
    category: 'operations',
    lowerIsBetter: true,
    thresholds: { warning: 10.0, critical: 15.0 },
  },
  rto_rate: {
    label: 'Return-to-Origin (RTO) Rate',
    category: 'operations',
    lowerIsBetter: true,
    thresholds: { warning: 10.0, critical: 15.0 },
  },
  return_rate: {
    label: 'Customer Return Rate',
    category: 'operations',
    lowerIsBetter: true,
    thresholds: { warning: 5.0, critical: 10.0 },
  },
  stock_out_rate: {
    label: 'Catalog Stock-Out Rate',
    category: 'inventory',
    lowerIsBetter: true,
    thresholds: { warning: 10.0, critical: 20.0 },
  },
  payment_failure_rate: {
    label: 'Payment Gateway Failure Rate',
    category: 'infrastructure',
    lowerIsBetter: true,
    thresholds: { warning: 10.0, critical: 20.0 },
  },
};

/**
 * Calculates deterministic severity based on canonical metric thresholds.
 */
export function calculateMetricSeverity(
  metric: CanonicalMetric,
  value: number | null,
  status: 'available' | 'insufficient_data' | 'unavailable'
): MetricSeverity {
  if (status !== 'available' || value === null) {
    return 'insufficient_data';
  }

  const def = METRIC_DEFINITIONS[metric];
  if (!def || !def.thresholds) {
    return 'healthy';
  }

  const { warning, critical } = def.thresholds;

  if (def.lowerIsBetter) {
    if (value >= critical) return 'critical';
    if (value >= warning) return 'warning';
    return 'healthy';
  } else {
    if (value <= critical) return 'critical';
    if (value <= warning) return 'warning';
    return 'healthy';
  }
}

/**
 * Calculates comparative trend metrics (delta, pctChange, direction, trendQuality).
 */
export function calculateComparisonTrend(
  metric: CanonicalMetric,
  currentVal: number | null,
  previousVal: number | null
): {
  delta: number | null;
  pctChange: number | null;
  direction: MetricDirection;
  trendQuality: TrendQuality;
} {
  if (currentVal === null || previousVal === null) {
    return {
      delta: null,
      pctChange: null,
      direction: 'unknown',
      trendQuality: 'unknown',
    };
  }

  const delta = Number((currentVal - previousVal).toFixed(2));
  let pctChange: number | null = null;

  if (previousVal !== 0) {
    pctChange = Number(((delta / previousVal) * 100).toFixed(2));
  }

  let direction: MetricDirection = 'neutral';
  if (delta > 0.001) direction = 'up';
  else if (delta < -0.001) direction = 'down';

  const def = METRIC_DEFINITIONS[metric];
  let trendQuality: TrendQuality = 'neutral';

  if (direction !== 'neutral') {
    if (def?.lowerIsBetter) {
      trendQuality = direction === 'down' ? 'improving' : 'deteriorating';
    } else {
      trendQuality = direction === 'up' ? 'improving' : 'deteriorating';
    }
  }

  return { delta, pctChange, direction, trendQuality };
}

/**
 * Computes previous equivalent time window for comparative trend calculations.
 */
export function getPreviousTimeWindow(currentWindow: TimeWindow): TimeWindow {
  const startMs = new Date(currentWindow.start).getTime();
  const endMs = new Date(currentWindow.end).getTime();
  const durationMs = endMs - startMs;

  const prevStart = new Date(startMs - durationMs).toISOString();
  const prevEnd = new Date(startMs - 1).toISOString();

  return {
    start: prevStart,
    end: prevEnd,
    timezone: 'Asia/Kolkata',
    preset: 'custom',
  };
}

/**
 * Aggregates verified metrics into a structured Business Radar summary.
 */
export async function getBusinessRadarSummary(
  callerRole: string,
  options: RadarSummaryOptions = {}
): Promise<BusinessRadarSummary> {
  const {
    preset = 'last_7_days',
    customStart,
    customEnd,
    fresh = false,
  } = options;

  const currentWindow = getIstTimeWindow(preset, customStart, customEnd);
  const previousWindow = getPreviousTimeWindow(currentWindow);
  const generatedAt = new Date().toISOString();

  const sections: BusinessRadarSummary['sections'] = {
    financial: {},
    operations: {},
    inventory: {},
    infrastructure: {},
  };

  let maxSeverity: MetricSeverity = 'healthy';
  let warningCount = 0;
  let criticalCount = 0;

  const allMetrics = Object.keys(METRIC_DEFINITIONS) as CanonicalMetric[];

  for (const metric of allMetrics) {
    const isAllowed = verifyMetricsAuthorization(callerRole, metric);
    if (!isAllowed) {
      // Strictly skip metrics caller is unauthorized to view
      continue;
    }

    const def = METRIC_DEFINITIONS[metric];

    // Fetch current metric value
    const currentVal = await getCanonicalMetric(metric, {
      callerRole,
      preset,
      customStart,
      customEnd,
      fresh,
    });

    // Fetch previous metric value for trend comparison
    let previousVal: MetricValue | undefined = undefined;
    try {
      previousVal = await getCanonicalMetric(metric, {
        callerRole,
        preset: 'custom',
        customStart: previousWindow.start,
        customEnd: previousWindow.end,
        fresh,
      });
    } catch {
      // Best-effort previous comparison
    }

    const trend = calculateComparisonTrend(
      metric,
      currentVal.value,
      previousVal?.value ?? null
    );

    const severity = calculateMetricSeverity(
      metric,
      currentVal.value,
      currentVal.status
    );

    if (severity === 'critical') criticalCount++;
    if (severity === 'warning') warningCount++;

    const item: RadarMetricItem = {
      metric,
      label: def.label,
      category: def.category,
      current: currentVal,
      previous: previousVal,
      delta: trend.delta,
      pctChange: trend.pctChange,
      direction: trend.direction,
      trendQuality: trend.trendQuality,
      severity,
      thresholds: def.thresholds,
    };

    if (!sections[def.category]) {
      sections[def.category] = {};
    }
    sections[def.category]![metric] = item;
  }

  // Derive overarching Business Radar health status
  if (criticalCount > 0) {
    maxSeverity = 'critical';
  } else if (warningCount > 0) {
    maxSeverity = 'warning';
  } else {
    maxSeverity = 'healthy';
  }

  // Prune empty sections (e.g. financial section for staff)
  if (Object.keys(sections.financial || {}).length === 0)
    delete sections.financial;
  if (Object.keys(sections.operations || {}).length === 0)
    delete sections.operations;
  if (Object.keys(sections.inventory || {}).length === 0)
    delete sections.inventory;
  if (Object.keys(sections.infrastructure || {}).length === 0)
    delete sections.infrastructure;

  return {
    overallHealth: maxSeverity,
    timeWindow: currentWindow,
    comparisonWindow: previousWindow,
    callerRole,
    generatedAt,
    sections,
    anomaliesDetectedCount: criticalCount + warningCount,
  };
}
