import 'server-only';

import {
  getCanonicalMetric,
  getIstTimeWindow,
  type CanonicalMetric,
  type DateRangePreset,
  type TimeWindow,
} from './metrics-service';
import {
  validateRecommendation,
  type BusinessRecommendation,
  type RecommendationCategory,
  type RecommendationPriority,
} from './recommendation-schema';

/**
 * ============================================================================
 * DETERMINISTIC RULE-BASED ANOMALY DETECTOR (TRACK C - PHASE 20)
 * ============================================================================
 * Purely deterministic business anomaly detection engine grounded in verified
 * canonical metrics and transactional data.
 *
 * Guarantees:
 * 1. Zero LLM Truth Hallucination: Anomaly evaluation is 100% deterministic
 *    math computed from verified Supabase transactional metrics.
 * 2. Strict Sample Size Guards: Suppresses false alarms during low-traffic
 *    or cold-start periods when sample sizes are below statistical relevance.
 * 3. Contract Conformance: Every emitted finding generates a fully valid,
 *    verifiable Phase 19 `BusinessRecommendation` object.
 * 4. Human Approval Safety: All recommendations generated require human
 *    approval (`requiresApproval: true`).
 * 5. Explicitly Documented Rule Catalog: Clearly categorizes enabled rules
 *    with documented rationales and catalogs unsupported/disabled rules.
 */

export interface AnomalyRuleDefinition {
  id: string;
  name: string;
  rationale: string;
  metric: CanonicalMetric;
  category: RecommendationCategory;
  condition: 'gt' | 'lt';
  warningThreshold: number;
  criticalThreshold: number;
  minSampleSize: number;
  source: string;
  deepLink: string;
  actionTitle: string;
  actionType: 'investigation' | 'manual_review' | 'inventory_restock';
}

// ─── Supported & Enabled Deterministic Rules ─────────────────────────────────
export const ENABLED_ANOMALY_RULES: Record<string, AnomalyRuleDefinition> = {
  payment_failure_spike: {
    id: 'rule_payment_failure_spike',
    name: 'Payment Gateway Failure Rate Spike',
    rationale:
      'Payment gateway failure rate exceeds operational safety limits, indicating gateway outages, expired auth keys, or payment webhook drops.',
    metric: 'payment_failure_rate',
    category: 'infrastructure',
    condition: 'gt',
    warningThreshold: 10.0,
    criticalThreshold: 20.0,
    minSampleSize: 10, // At least 10 payment attempts
    source: 'supabase:payment_transactions',
    deepLink: '/admin/payments',
    actionTitle: 'Inspect payment gateway logs and gateway provider status',
    actionType: 'investigation',
  },
  cancellation_rate_surge: {
    id: 'rule_cancellation_rate_surge',
    name: 'Elevated Order Cancellation Rate',
    rationale:
      'Sudden surge in order cancellations indicates buyer hesitation, pricing mismatch, delivery delay dissatisfaction, or fraud.',
    metric: 'cancellation_rate',
    category: 'operations',
    condition: 'gt',
    warningThreshold: 10.0,
    criticalThreshold: 15.0,
    minSampleSize: 10, // At least 10 order creation events
    source: 'supabase:orders',
    deepLink: '/admin/orders',
    actionTitle:
      'Review recent order cancellation reasons and customer tickets',
    actionType: 'manual_review',
  },
  rto_rate_surge: {
    id: 'rule_rto_rate_surge',
    name: 'Courier Return-to-Origin (RTO) Surge',
    rationale:
      'Disproportionate RTO rate causes severe logistics margin loss and points to fake COD orders or courier delivery failures.',
    metric: 'rto_rate',
    category: 'operations',
    condition: 'gt',
    warningThreshold: 10.0,
    criticalThreshold: 15.0,
    minSampleSize: 10, // At least 10 dispatched orders
    source: 'supabase:orders',
    deepLink: '/admin/orders',
    actionTitle:
      'Audit courier delivery scan logs and high-risk delivery pincodes',
    actionType: 'investigation',
  },
  stockout_rate_breach: {
    id: 'rule_stockout_rate_breach',
    name: 'Catalog Stock-Out Rate Breach',
    rationale:
      'Out-of-stock active catalog percentage exceeds safety buffer, reducing storefront conversion and active sales.',
    metric: 'stock_out_rate',
    category: 'inventory',
    condition: 'gt',
    warningThreshold: 10.0,
    criticalThreshold: 20.0,
    minSampleSize: 5, // At least 5 active products
    source: 'supabase:products',
    deepLink: '/admin/reports/inventory',
    actionTitle: 'Initiate vendor restock order and review lead times',
    actionType: 'inventory_restock',
  },
  return_rate_surge: {
    id: 'rule_return_rate_surge',
    name: 'Customer Return Rate Surge',
    rationale:
      'Elevated customer returns signal potential jewelry defect batches, inaccurate online product specifications, or sizing confusion.',
    metric: 'return_rate',
    category: 'operations',
    condition: 'gt',
    warningThreshold: 5.0,
    criticalThreshold: 10.0,
    minSampleSize: 10, // At least 10 delivered orders
    source: 'supabase:orders',
    deepLink: '/admin/refunds',
    actionTitle: 'Inspect customer return reasons and QA inspection reports',
    actionType: 'investigation',
  },
};

// ─── Documented Unsupported / Disabled Rules ─────────────────────────────────
export const DISABLED_ANOMALY_RULES: Array<{
  id: string;
  name: string;
  reason: string;
}> = [
  {
    id: 'rule_conversion_drop',
    name: 'Storefront Checkout Conversion Drop',
    reason:
      'Disabled: Storefront session funnel analytics from PostHog/GA4 are not yet unified in the authoritative transactional database ledger.',
  },
  {
    id: 'rule_api_latency_spike',
    name: 'AI Model / Route Latency Anomaly',
    reason:
      'Disabled: Distributed APM latency metrics are collected via OpenTelemetry/Sentry and not indexed as canonical database KPIs.',
  },
  {
    id: 'rule_customer_cac_spike',
    name: 'Customer Acquisition Cost (CAC) Surge',
    reason:
      'Disabled: Paid advertising spend ingestion (Meta CAPI / Google Ads) is not connected to transactional net margin tables.',
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BusinessAnomalyFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  severity: 'warning' | 'critical';
  metric: CanonicalMetric;
  condition: 'gt' | 'lt';
  actualValue: number;
  thresholdValue: number;
  sampleSize: { numerator?: number; denominator?: number; count?: number };
  minSampleRequired: number;
  observationWindow: TimeWindow;
  explanation: string;
  recommendation: BusinessRecommendation;
  detectedAt: string;
}

export interface AnomalySuppressedFinding {
  ruleId: string;
  metric: CanonicalMetric;
  actualValue: number | null;
  observedSampleSize: number;
  minSampleRequired: number;
  reason: string;
}

export interface AnomalyDetectionReport {
  evaluatedAt: string;
  timeWindow: TimeWindow;
  totalRulesEvaluated: number;
  anomaliesDetectedCount: number;
  anomalies: BusinessAnomalyFinding[];
  suppressedCount: number;
  suppressed: AnomalySuppressedFinding[];
  disabledRulesCount: number;
  disabledRules: typeof DISABLED_ANOMALY_RULES;
}

export interface AnomalyDetectionOptions {
  callerRole?: string;
  preset?: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  fresh?: boolean;
}

// ─── Anomaly Detection Engine ────────────────────────────────────────────────
/**
 * Executes deterministic anomaly detection against canonical metrics.
 */
export async function detectBusinessAnomalies(
  options?: AnomalyDetectionOptions
): Promise<AnomalyDetectionReport> {
  const callerRole = options?.callerRole || 'admin';
  const preset = options?.preset || 'last_7_days';
  const timeWindow = getIstTimeWindow(
    preset,
    options?.customStart,
    options?.customEnd
  );
  const now = new Date();
  const evaluatedAt = now.toISOString();

  // 7 days expiration for generated recommendations
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = expiryDate.toISOString();

  const anomalies: BusinessAnomalyFinding[] = [];
  const suppressed: AnomalySuppressedFinding[] = [];

  const ruleEntries = Object.entries(ENABLED_ANOMALY_RULES);

  for (const [key, rule] of ruleEntries) {
    try {
      // 1. Fetch verified canonical metric
      const metricResult = await getCanonicalMetric(rule.metric, {
        callerRole,
        preset,
        customStart: options?.customStart,
        customEnd: options?.customEnd,
        fresh: options?.fresh,
      });

      // 2. Handle unavailable or null states
      if (metricResult.status !== 'available' || metricResult.value === null) {
        suppressed.push({
          ruleId: rule.id,
          metric: rule.metric,
          actualValue: null,
          observedSampleSize: 0,
          minSampleRequired: rule.minSampleSize,
          reason: `Metric data status '${metricResult.status}' in evaluation window.`,
        });
        continue;
      }

      const actualValue = metricResult.value;
      const metadata = metricResult.metadata || {};
      const observedSampleSize = metadata.denominator ?? metadata.count ?? 0;

      // 3. Minimum Sample Size Guard (Prevents cold-start & low traffic false alarms)
      if (observedSampleSize < rule.minSampleSize) {
        suppressed.push({
          ruleId: rule.id,
          metric: rule.metric,
          actualValue,
          observedSampleSize,
          minSampleRequired: rule.minSampleSize,
          reason: `Sample size ${observedSampleSize} is below statistical minimum guard of ${rule.minSampleSize}.`,
        });
        continue;
      }

      // 4. Deterministic Threshold Evaluation
      let isBreached = false;
      let severity: 'warning' | 'critical' = 'warning';
      let thresholdValue = rule.warningThreshold;
      let priority: RecommendationPriority = 'medium';

      if (rule.condition === 'gt') {
        if (actualValue > rule.criticalThreshold) {
          isBreached = true;
          severity = 'critical';
          priority = 'critical';
          thresholdValue = rule.criticalThreshold;
        } else if (actualValue > rule.warningThreshold) {
          isBreached = true;
          severity = 'warning';
          priority = 'high';
          thresholdValue = rule.warningThreshold;
        }
      } else if (rule.condition === 'lt') {
        if (actualValue < rule.criticalThreshold) {
          isBreached = true;
          severity = 'critical';
          priority = 'critical';
          thresholdValue = rule.criticalThreshold;
        } else if (actualValue < rule.warningThreshold) {
          isBreached = true;
          severity = 'warning';
          priority = 'high';
          thresholdValue = rule.warningThreshold;
        }
      }

      // 5. Construct Finding and Valid Recommendation
      if (isBreached) {
        const anomalyId = `anom_${rule.id}_${timeWindow.preset}_${now.getTime()}`;
        const recId = `rec_${rule.id}_${timeWindow.preset}_${now.getTime()}`;

        const explanation =
          `${rule.name}: Observed ${rule.metric} of ${actualValue.toFixed(1)}% ` +
          `breached ${severity} threshold of ${thresholdValue.toFixed(1)}% ` +
          `across ${observedSampleSize} observed events. ${rule.rationale}`;

        const sampleSize = {
          numerator: metadata.numerator,
          denominator: metadata.denominator,
          count: metadata.count,
        };

        // Construct fully-formed Phase 19 recommendation
        const recommendation: BusinessRecommendation = {
          id: recId,
          title: `[${severity.toUpperCase()}] ${rule.name}`,
          category: rule.category,
          priority,
          evidenceType: 'deterministic_rule',
          supportingMetrics: [
            {
              metric: rule.metric,
              value: actualValue,
              source: rule.source,
              timeWindow: {
                start: timeWindow.start,
                end: timeWindow.end,
                timeZone: timeWindow.timezone,
              },
              sampleSize,
            },
          ],
          observationWindow: {
            start: timeWindow.start,
            end: timeWindow.end,
            timeZone: timeWindow.timezone,
          },
          thresholdRule: {
            ruleId: rule.id,
            metric: rule.metric,
            condition: rule.condition,
            actualValue,
            thresholdValue,
          },
          explanation,
          uncertaintyBasis: {
            confidence: severity === 'critical' ? 0.95 : 0.85,
            confidenceReason: `Deterministically calculated from ${observedSampleSize} source events in ${rule.source}.`,
            assumptions: [
              'Underlying source records are authoritative and fully reconciled.',
            ],
            riskFactors: [
              'Sudden external courier delays or regional bank outages may temporarily inflate metrics.',
            ],
          },
          suggestedNextStep: {
            actionTitle: rule.actionTitle,
            actionType: rule.actionType,
            safeDeepLink: rule.deepLink,
            requiresApproval: true,
          },
          reviewState: 'pending_review',
          createdAt: evaluatedAt,
          expiresAt,
        };

        // Schema verification assertion
        const validation = validateRecommendation(recommendation);
        if (!validation.success) {
          console.error(
            `[AnomalyDetector] Generated recommendation failed schema validation:`,
            validation.errors
          );
          continue;
        }

        anomalies.push({
          id: anomalyId,
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          priority,
          severity,
          metric: rule.metric,
          condition: rule.condition,
          actualValue,
          thresholdValue,
          sampleSize,
          minSampleRequired: rule.minSampleSize,
          observationWindow: timeWindow,
          explanation,
          recommendation: validation.data,
          detectedAt: evaluatedAt,
        });
      }
    } catch (err: any) {
      console.error(
        `[AnomalyDetector] Error evaluating rule '${rule.id}':`,
        err
      );
    }
  }

  return {
    evaluatedAt,
    timeWindow,
    totalRulesEvaluated: ruleEntries.length,
    anomaliesDetectedCount: anomalies.length,
    anomalies,
    suppressedCount: suppressed.length,
    suppressed,
    disabledRulesCount: DISABLED_ANOMALY_RULES.length,
    disabledRules: DISABLED_ANOMALY_RULES,
  };
}
