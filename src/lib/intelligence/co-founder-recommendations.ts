import 'server-only';

import {
  type BusinessRecommendation,
  type SupportingMetric,
  type ObservationWindow,
  type UncertaintyBasis,
  type SuggestedNextStep,
  type RecommendationCategory,
  type RecommendationPriority,
  type EvidenceType,
  BusinessRecommendationSchema,
  validateRecommendation,
} from './recommendation-schema';
import type {
  CoFounderBusinessContext,
  FormattedMetricSignal,
} from './co-founder-context';

/**
 * ============================================================================
 * EVIDENCE-BOUND CO-FOUNDER RECOMMENDATIONS ENGINE (TRACK E - PHASE 27)
 * ============================================================================
 * Generates structured, traceable, evidence-bound business recommendations
 * for leadership and internal staff from verified business context.
 *
 * Guarantees:
 * 1. Strict Evidence Binding: Recommendations cannot be marked as measured facts
 *    or deterministic rules without verified supporting metrics from the context.
 * 2. Partitioned Reasoning Structure: Explicitly separates:
 *    - Observations (verified transactional facts)
 *    - Likely Explanations (causal rationales / rule triggers)
 *    - Suggested Investigations (safe human-in-the-loop deep-links)
 *    - Predictions (scenario simulations capped at <= 0.85 confidence)
 * 3. Missing Data Disclosure: Explicitly discloses any unavailable, degraded,
 *    or low-sample data sources.
 * 4. Claim Qualification & Rejection: Rejects or qualifies numerical claims
 *    that lack supporting evidence in the verified context.
 * 5. Zero Autonomous Write Actions: All suggested next steps strictly mandate
 *    `requiresApproval: true`. Zero write tools enabled.
 */

export interface ObservationItem {
  metric: string;
  observedValue: number | string;
  source: string;
  observationSummary: string;
}

export interface ExplanationItem {
  hypothesis: string;
  causality: string;
  confidence: number;
}

export interface InvestigationItem {
  actionTitle: string;
  actionType:
    | 'manual_review'
    | 'investigation'
    | 'inventory_restock'
    | 'pricing_adjustment'
    | 'config_update';
  safeDeepLink: string;
  requiresApproval: true;
}

export interface PredictionItem {
  scenario: string;
  potentialImpact: string;
  confidence: number; // strictly <= 0.85
  assumptions: string[];
}

export interface MissingDataDisclosure {
  unmeasuredArea: string;
  reason: string;
  impactOnConfidence: string;
}

export interface StructuredCoFounderRecommendation extends BusinessRecommendation {
  partitions: {
    observations: ObservationItem[];
    likelyExplanations: ExplanationItem[];
    suggestedInvestigations: InvestigationItem[];
    predictions: PredictionItem[];
    missingDataDisclosures: MissingDataDisclosure[];
  };
}

export interface RecommendationVerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  qualifiedClaims: string[];
}

/**
 * Verifies that a candidate recommendation is grounded in the active business context.
 * Rejects unsupported numerical claims or unbacked measured facts.
 */
export function verifyRecommendationEvidence(
  rec: BusinessRecommendation,
  context: CoFounderBusinessContext
): RecommendationVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const qualifiedClaims: string[] = [];

  // 1. Evidence Requirement for Measured Facts & Deterministic Rules
  if (
    rec.evidenceType === 'measured_fact' ||
    rec.evidenceType === 'deterministic_rule'
  ) {
    if (!rec.supportingMetrics || rec.supportingMetrics.length === 0) {
      errors.push(
        `Recommendation '${rec.id}' marked as '${rec.evidenceType}' must include at least one verified supporting metric.`
      );
    }
  }

  // 2. Simulation Confidence Cap (Must be <= 0.85)
  if (
    rec.evidenceType === 'simulation' &&
    rec.uncertaintyBasis.confidence > 0.85
  ) {
    errors.push(
      `Simulation projection in '${rec.id}' exceeds the maximum allowed confidence cap of 0.85 (observed: ${rec.uncertaintyBasis.confidence}).`
    );
  }

  // 3. Mandatory Human Approval Requirement
  if (!rec.suggestedNextStep.requiresApproval) {
    errors.push(
      `Autonomous execution prohibited: suggestedNextStep in '${rec.id}' must specify requiresApproval: true.`
    );
  }

  // 4. Safe Internal Portal Deep Link Verification
  if (rec.suggestedNextStep.safeDeepLink) {
    const isSafe =
      rec.suggestedNextStep.safeDeepLink.startsWith('/admin/') ||
      rec.suggestedNextStep.safeDeepLink.startsWith('/support/') ||
      rec.suggestedNextStep.safeDeepLink.startsWith('/operations/');
    if (!isSafe) {
      errors.push(
        `safeDeepLink '${rec.suggestedNextStep.safeDeepLink}' must route to an authorized internal admin portal.`
      );
    }
  }

  // 5. Cross-reference supporting metrics against context
  const allContextMetrics: FormattedMetricSignal[] = [
    ...context.financialMetrics,
    ...context.operationalMetrics,
  ];

  for (const sm of rec.supportingMetrics) {
    const match = allContextMetrics.find((m) => m.metric === sm.metric);
    if (!match) {
      warnings.push(
        `Supporting metric '${sm.metric}' cited in '${rec.id}' is not in the active context signals list.`
      );
    } else if (match.status === 'unavailable' || match.value === null) {
      errors.push(
        `Supporting metric '${sm.metric}' is marked unavailable in the context; cannot be used as factual evidence.`
      );
    } else if (
      match.value !== null &&
      Math.abs(match.value - sm.value) > 0.05
    ) {
      qualifiedClaims.push(
        `Cited value for '${sm.metric}' (${sm.value}) differs from context ledger value (${match.value}). Claim marked as estimated/qualified.`
      );
    }
  }

  // 6. Check if recommendation relies on degraded or unavailable sources
  if (context.unavailableSources.length > 0) {
    warnings.push(
      `Active context contains unavailable upstream sources: ${context.unavailableSources.join(', ')}. Findings in affected areas must be qualified.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualifiedClaims,
  };
}

/**
 * Builds a deterministic recommendation ID.
 */
function generateRecId(prefix: string): string {
  const nonce = Math.random().toString(36).substring(2, 7);
  return `rec_${prefix}_${nonce}`;
}

/**
 * Generates structured, evidence-bound recommendations from verified context.
 */
export function generateCoFounderRecommendations(
  context: CoFounderBusinessContext
): StructuredCoFounderRecommendation[] {
  const recommendations: StructuredCoFounderRecommendation[] = [];
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48-hour shelf-life

  const observationWindow: ObservationWindow = {
    start: context.timeWindow.start,
    end: context.timeWindow.end,
    timeZone: 'Asia/Kolkata',
  };

  // ─── 1. Payment Gateway Health Recommendation ─────────────────────────────
  if (
    context.systemHealth.paymentFailureRate !== null &&
    context.systemHealth.paymentFailureRate > 10.0
  ) {
    const isCritical = context.systemHealth.paymentFailureRate > 20.0;
    const rate = context.systemHealth.paymentFailureRate;

    const supportingMetrics: SupportingMetric[] = [
      {
        metric: 'payment_failure_rate',
        value: rate,
        source: 'supabase:payment_transactions',
        timeWindow: observationWindow,
      },
    ];

    const observations: ObservationItem[] = [
      {
        metric: 'payment_failure_rate',
        observedValue: `${rate.toFixed(1)}%`,
        source: 'supabase:payment_transactions',
        observationSummary: `Payment gateway transaction failure rate reached ${rate.toFixed(1)}% during the observation period.`,
      },
    ];

    const likelyExplanations: ExplanationItem[] = [
      {
        hypothesis:
          'Primary payment gateway (PhonePe/Paytm) network timeout or bank switch outage.',
        causality:
          'Transaction drop-offs correlate with gateway bank switch response latency.',
        confidence: 0.9,
      },
      {
        hypothesis: 'Buyer OTP authentication drop-off on mobile checkout.',
        causality:
          'Customer bank OTP delivery SMS lag causing session expirations.',
        confidence: 0.75,
      },
    ];

    const suggestedInvestigations: InvestigationItem[] = [
      {
        actionTitle:
          'Audit Payment Gateway Switch Logs and Gateway Provider Status',
        actionType: 'investigation',
        safeDeepLink: '/admin/payments',
        requiresApproval: true,
      },
    ];

    const predictions: PredictionItem[] = [
      {
        scenario: 'Prolonged payment gateway failure rate over 24 hours',
        potentialImpact:
          'Estimated 15-25% drop in confirmed net order capture and buyer churn.',
        confidence: 0.8,
        assumptions: [
          'Storefront checkout traffic remains steady',
          'No fallback gateway auto-switched',
        ],
      },
    ];

    const missingDataDisclosures: MissingDataDisclosure[] = [];
    if (context.unavailableSources.includes('ai_failure_diagnostics')) {
      missingDataDisclosures.push({
        unmeasuredArea: 'AI Provider Health Logs',
        reason:
          'ai_failure_diagnostics table query timed out during context assembly.',
        impactOnConfidence: 'AI fallback correlation is unverified.',
      });
    }

    const rec: StructuredCoFounderRecommendation = {
      id: generateRecId('pay_spike'),
      title: isCritical
        ? 'Critical Payment Gateway Failure Rate Spike'
        : 'Elevated Payment Gateway Failure Rate Warning',
      category: 'infrastructure',
      priority: isCritical ? 'critical' : 'high',
      evidenceType: 'deterministic_rule',
      supportingMetrics,
      observationWindow,
      thresholdRule: {
        ruleId: 'rule_payment_failure_spike',
        metric: 'payment_failure_rate',
        condition: 'gt',
        actualValue: rate,
        thresholdValue: isCritical ? 20.0 : 10.0,
      },
      explanation: `Payment gateway failure rate reached ${rate.toFixed(1)}%, breaching operational safety threshold of ${isCritical ? '20.0%' : '10.0%'}. Immediate inspection of payment gateway provider logs is recommended to safeguard order completion.`,
      uncertaintyBasis: {
        confidence: 0.95,
        confidenceReason:
          'Calculated directly from verified transactional payment attempts in Supabase.',
        assumptions: [
          'Payment callback webhooks are synchronized with gateway status.',
        ],
        riskFactors: ['Bank upstream outage outside Ruhvi control.'],
      },
      suggestedNextStep: {
        actionTitle:
          'Audit Payment Gateway Switch Logs and Gateway Provider Status',
        actionType: 'investigation',
        safeDeepLink: '/admin/payments',
        requiresApproval: true,
      },
      reviewState: 'pending_review',
      createdAt,
      expiresAt,
      partitions: {
        observations,
        likelyExplanations,
        suggestedInvestigations,
        predictions,
        missingDataDisclosures,
      },
    };

    recommendations.push(rec);
  }

  // ─── 2. Inventory Buffer & Stockout Recommendation ────────────────────────
  if (
    context.inventorySignals.status === 'available' &&
    ((context.inventorySignals.stockOutRate !== null &&
      context.inventorySignals.stockOutRate > 10.0) ||
      context.inventorySignals.lowStockSkuCount > 0)
  ) {
    const stockOutRate = context.inventorySignals.stockOutRate ?? 0;
    const isCritical = stockOutRate > 20.0;

    const supportingMetrics: SupportingMetric[] = [
      {
        metric: 'stock_out_rate',
        value: stockOutRate,
        source: 'supabase:products',
        timeWindow: observationWindow,
        sampleSize: { count: context.inventorySignals.activeSkuCount },
      },
    ];

    const observations: ObservationItem[] = [
      {
        metric: 'stock_out_rate',
        observedValue: `${stockOutRate.toFixed(1)}%`,
        source: 'supabase:products',
        observationSummary: `Active catalog stockout rate is ${stockOutRate.toFixed(1)}% with ${context.inventorySignals.outOfStockSkuCount} out-of-stock SKUs and ${context.inventorySignals.lowStockSkuCount} low-stock buffer items.`,
      },
    ];

    const likelyExplanations: ExplanationItem[] = [
      {
        hypothesis:
          'Surge in gold and diamond jewelry purchases depleted available safety stock.',
        causality:
          'Recent promotional sales or festive demand exhausted ready-to-ship inventory.',
        confidence: 0.85,
      },
    ];

    const suggestedInvestigations: InvestigationItem[] = [
      {
        actionTitle:
          'Initiate Vendor Restock Order and Inventory Replenishment',
        actionType: 'inventory_restock',
        safeDeepLink: '/admin/reports/inventory',
        requiresApproval: true,
      },
    ];

    const predictions: PredictionItem[] = [
      {
        scenario: 'Unreplenished stock over the next 7 business days',
        potentialImpact:
          'Lost storefront order conversions and delayed delivery dispatch times.',
        confidence: 0.85, // strictly <= 0.85
        assumptions: [
          'Manufacturing lead time is 5-7 business days',
          'Product demand remains steady',
        ],
      },
    ];

    const missingDataDisclosures: MissingDataDisclosure[] = [];

    const rec: StructuredCoFounderRecommendation = {
      id: generateRecId('stock_deplete'),
      title: isCritical
        ? 'Critical Catalog Stock-Out Rate Breach'
        : 'Catalog Inventory Buffer Depletion Warning',
      category: 'inventory',
      priority: isCritical ? 'critical' : 'high',
      evidenceType: 'deterministic_rule',
      supportingMetrics,
      observationWindow,
      thresholdRule: {
        ruleId: 'rule_stockout_rate_breach',
        metric: 'stock_out_rate',
        condition: 'gt',
        actualValue: stockOutRate,
        thresholdValue: isCritical ? 20.0 : 10.0,
      },
      explanation: `Catalog stockout rate stands at ${stockOutRate.toFixed(1)}% with ${context.inventorySignals.lowStockSkuCount} SKUs below safety stock buffer (<=3 units). Replenishment order should be placed to prevent product discovery drops.`,
      uncertaintyBasis: {
        confidence: 0.9,
        confidenceReason:
          'Calculated directly from authoritative product stock inventory records.',
        assumptions: [
          'Active catalog SKU status reflects live storefront listings.',
        ],
        riskFactors: ['Artisan workshop manufacturing delays.'],
      },
      suggestedNextStep: {
        actionTitle:
          'Initiate Vendor Restock Order and Inventory Replenishment',
        actionType: 'inventory_restock',
        safeDeepLink: '/admin/reports/inventory',
        requiresApproval: true,
      },
      reviewState: 'pending_review',
      createdAt,
      expiresAt,
      partitions: {
        observations,
        likelyExplanations,
        suggestedInvestigations,
        predictions,
        missingDataDisclosures,
      },
    };

    recommendations.push(rec);
  }

  // ─── 3. Missing Data & Upstream Degradation Disclosure ─────────────────────
  if (context.unavailableSources.length > 0) {
    const degradedList = context.unavailableSources.join(', ');

    const rec: StructuredCoFounderRecommendation = {
      id: generateRecId('data_hygiene'),
      title: 'Data Hygiene Notice: Upstream Data Source Unavailability',
      category: 'infrastructure',
      priority: 'medium',
      evidenceType: 'statistical_hypothesis',
      supportingMetrics: [],
      observationWindow,
      explanation: `The following upstream operational data source(s) were temporarily unreachable during context assembly: [${degradedList}]. Co-Founder automated analyses in these areas are withheld to prevent hallucinated conclusions.`,
      uncertaintyBasis: {
        confidence: 0.7,
        confidenceReason:
          'Inferred from network/database status responses during context compilation.',
        assumptions: [
          'Underlying database service will recover automatically.',
        ],
        riskFactors: ['Schema drift or database permission changes.'],
      },
      suggestedNextStep: {
        actionTitle: 'Inspect System Diagnostics and Database Connectivity',
        actionType: 'manual_review',
        safeDeepLink: '/admin/system-alerts',
        requiresApproval: true,
      },
      reviewState: 'pending_review',
      createdAt,
      expiresAt,
      partitions: {
        observations: [
          {
            metric: 'data_source_availability',
            observedValue: `${context.unavailableSources.length} sources degraded`,
            source: 'system_monitor',
            observationSummary: `Sources [${degradedList}] failed to report during context assembly.`,
          },
        ],
        likelyExplanations: [
          {
            hypothesis: 'Temporary database query timeout or table lock.',
            causality:
              'High concurrent transaction volume or schema migration in progress.',
            confidence: 0.8,
          },
        ],
        suggestedInvestigations: [
          {
            actionTitle: 'Inspect System Diagnostics and Database Connectivity',
            actionType: 'manual_review',
            safeDeepLink: '/admin/system-alerts',
            requiresApproval: true,
          },
        ],
        predictions: [],
        missingDataDisclosures: context.unavailableSources.map((s) => ({
          unmeasuredArea: s,
          reason: 'Source query failed or timed out.',
          impactOnConfidence:
            'Associated metrics and recommendations are suppressed.',
        })),
      },
    };

    recommendations.push(rec);
  }

  return recommendations;
}

/**
 * Validates untrusted LLM-proposed recommendation payload against
 * Phase 19 schema and active verified business context.
 */
export function parseAndValidateLlmRecommendation(
  untrustedPayload: unknown,
  context: CoFounderBusinessContext
):
  | { success: true; recommendation: BusinessRecommendation }
  | { success: false; errors: string[] } {
  // 1. Structural Schema Validation
  const schemaResult = validateRecommendation(untrustedPayload);
  if (!schemaResult.success) {
    return {
      success: false,
      errors: schemaResult.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      ),
    };
  }

  const rec = schemaResult.data;

  // 2. Evidence Verification against Active Context
  const verification = verifyRecommendationEvidence(rec, context);
  if (!verification.valid) {
    return {
      success: false,
      errors: verification.errors,
    };
  }

  return {
    success: true,
    recommendation: rec,
  };
}
