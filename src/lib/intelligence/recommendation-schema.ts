import { z } from 'zod';
import { EntityReferenceSchema } from './event-contract';
import type { CanonicalMetric } from './metrics-service';

/**
 * ============================================================================
 * EVIDENCE-BACKED RECOMMENDATION FORMAT & CONTRACT (TRACK C - PHASE 19)
 * ============================================================================
 * Structured schema for business recommendations and their backing evidence.
 *
 * Guarantees:
 * 1. Strict Evidence Backing: Rejects any recommendation classified as a measured
 *    fact or deterministic rule that lacks verified supporting metrics.
 * 2. Distinction of Truth Classes: Strictly separates measured facts from
 *    deterministic rules, statistical hypotheses, and scenario simulations.
 * 3. Threshold Integrity: Validates that threshold conditions actually hold
 *    between observed values and benchmark thresholds.
 * 4. Human-In-The-Loop Safety: Mandates `requiresApproval: true` on all suggested
 *    next steps; autonomous execution is strictly prohibited.
 * 5. Simulation Guardrails: Caps simulation confidence at 0.85 (85%).
 * 6. Audit & Lifecycle Tracking: Validates timestamps, review states, reviewer
 *    attributions, and expiry windows.
 */

export const CANONICAL_METRIC_NAMES = [
  'gross_sales',
  'net_sales',
  'paid_orders_count',
  'average_order_value',
  'cancellation_rate',
  'rto_rate',
  'return_rate',
  'stock_out_rate',
  'payment_failure_rate',
] as const;

export const CanonicalMetricEnum = z.enum(CANONICAL_METRIC_NAMES);

export const RecommendationCategoryEnum = z.enum([
  'operations',
  'financial',
  'inventory',
  'marketing',
  'support',
  'infrastructure',
]);
export type RecommendationCategory = z.infer<typeof RecommendationCategoryEnum>;

export const RecommendationPriorityEnum = z.enum([
  'critical',
  'high',
  'medium',
  'low',
]);
export type RecommendationPriority = z.infer<typeof RecommendationPriorityEnum>;

export const EvidenceTypeEnum = z.enum([
  'measured_fact', // Historical transactional fact directly from ledger
  'deterministic_rule', // Direct mathematical threshold breach from verified metrics
  'statistical_hypothesis', // Extrapolated business trend or statistical inference
  'simulation', // Simulated 'what-if' modeling projection
]);
export type EvidenceType = z.infer<typeof EvidenceTypeEnum>;

export const ReviewStateEnum = z.enum([
  'draft',
  'pending_review',
  'acknowledged',
  'approved',
  'rejected',
  'expired',
]);
export type ReviewState = z.infer<typeof ReviewStateEnum>;

export const ActionTypeEnum = z.enum([
  'manual_review',
  'investigation',
  'inventory_restock',
  'pricing_adjustment',
  'config_update',
  'staff_outreach',
  'rollback',
]);
export type ActionType = z.infer<typeof ActionTypeEnum>;

export const ThresholdConditionEnum = z.enum([
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq',
]);
export type ThresholdCondition = z.infer<typeof ThresholdConditionEnum>;

// ─── Observation Window ──────────────────────────────────────────────────────
export const ObservationWindowSchema = z
  .object({
    start: z
      .string()
      .datetime({ message: 'Observation start must be valid ISO-8601' }),
    end: z
      .string()
      .datetime({ message: 'Observation end must be valid ISO-8601' }),
    timeZone: z.string().default('Asia/Kolkata'),
  })
  .refine((w) => new Date(w.end).getTime() >= new Date(w.start).getTime(), {
    message: 'Observation window end must be on or after start time',
  });
export type ObservationWindow = z.infer<typeof ObservationWindowSchema>;

// ─── Sample Size ─────────────────────────────────────────────────────────────
export const SampleSizeSchema = z.object({
  numerator: z.number().nonnegative().optional(),
  denominator: z.number().positive().optional(),
  count: z.number().nonnegative().optional(),
});
export type SampleSize = z.infer<typeof SampleSizeSchema>;

// ─── Supporting Metric Reference ─────────────────────────────────────────────
export const SupportingMetricSchema = z.object({
  metric: CanonicalMetricEnum,
  value: z.number(),
  source: z.string().min(1, 'Source identifier must not be empty'),
  timeWindow: ObservationWindowSchema,
  sampleSize: SampleSizeSchema.optional(),
});
export type SupportingMetric = z.infer<typeof SupportingMetricSchema>;

// ─── Threshold Rule Reference ────────────────────────────────────────────────
export const ThresholdRuleRefSchema = z.object({
  ruleId: z.string().min(1, 'Rule ID must not be empty'),
  metric: CanonicalMetricEnum,
  condition: ThresholdConditionEnum,
  actualValue: z.number(),
  thresholdValue: z.number(),
});
export type ThresholdRuleRef = z.infer<typeof ThresholdRuleRefSchema>;

// ─── Uncertainty & Confidence Basis ──────────────────────────────────────────
export const UncertaintyBasisSchema = z.object({
  confidence: z
    .number()
    .min(0.0, 'Confidence must be between 0.0 and 1.0')
    .max(1.0, 'Confidence must be between 0.0 and 1.0'),
  confidenceReason: z
    .string()
    .min(
      10,
      'Confidence reason must be at least 10 characters explaining data basis'
    ),
  assumptions: z
    .array(z.string().min(1))
    .min(1, 'At least one underlying assumption must be explicitly stated'),
  riskFactors: z.array(z.string()).default([]),
});
export type UncertaintyBasis = z.infer<typeof UncertaintyBasisSchema>;

// ─── Suggested Next Step ─────────────────────────────────────────────────────
export const SuggestedNextStepSchema = z.object({
  actionTitle: z
    .string()
    .min(5, 'Action title must be at least 5 characters')
    .max(200, 'Action title cannot exceed 200 characters'),
  actionType: ActionTypeEnum,
  targetEntity: EntityReferenceSchema.optional(),
  safeDeepLink: z
    .string()
    .refine(
      (link) =>
        link.startsWith('/admin/') ||
        link.startsWith('/support/') ||
        link.startsWith('/operations/'),
      {
        message:
          'safeDeepLink must point to an authorized internal portal route',
      }
    )
    .optional(),
  requiresApproval: z.boolean().refine((val) => val === true, {
    message:
      'Automated execution prohibited: all recommendations require human approval.',
  }),
});
export type SuggestedNextStep = z.infer<typeof SuggestedNextStepSchema>;

// ─── Primary Business Recommendation Schema ──────────────────────────────────
export const BusinessRecommendationSchema = z
  .object({
    id: z
      .string()
      .min(5, 'Recommendation ID must be at least 5 characters')
      .regex(
        /^rec_[a-zA-Z0-9_-]+$/,
        'Recommendation ID must start with rec_ prefix'
      ),
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    category: RecommendationCategoryEnum,
    priority: RecommendationPriorityEnum,
    evidenceType: EvidenceTypeEnum,
    supportingMetrics: z.array(SupportingMetricSchema),
    observationWindow: ObservationWindowSchema,
    thresholdRule: ThresholdRuleRefSchema.optional(),
    explanation: z
      .string()
      .min(
        20,
        'Explanation must be at least 20 characters providing context and rationale'
      )
      .max(2000, 'Explanation cannot exceed 2000 characters'),
    uncertaintyBasis: UncertaintyBasisSchema,
    suggestedNextStep: SuggestedNextStepSchema,
    reviewState: ReviewStateEnum.default('pending_review'),
    createdAt: z
      .string()
      .datetime({ message: 'createdAt must be valid ISO-8601' }),
    expiresAt: z
      .string()
      .datetime({ message: 'expiresAt must be valid ISO-8601' }),
    reviewedAt: z.string().datetime().optional(),
    reviewedBy: z.string().min(1).optional(),
    rejectionReason: z.string().min(5).optional(),
  })
  .superRefine((rec, ctx) => {
    // 1. Evidence Requirement for Measured Facts & Rules
    if (
      (rec.evidenceType === 'measured_fact' ||
        rec.evidenceType === 'deterministic_rule') &&
      rec.supportingMetrics.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supportingMetrics'],
        message: `Recommendations categorized as '${rec.evidenceType}' must provide at least one verified supporting metric.`,
      });
    }

    // 2. Threshold Rule Condition Verification
    if (rec.thresholdRule) {
      const { condition, actualValue, thresholdValue } = rec.thresholdRule;
      let conditionMet = false;
      switch (condition) {
        case 'gt':
          conditionMet = actualValue > thresholdValue;
          break;
        case 'gte':
          conditionMet = actualValue >= thresholdValue;
          break;
        case 'lt':
          conditionMet = actualValue < thresholdValue;
          break;
        case 'lte':
          conditionMet = actualValue <= thresholdValue;
          break;
        case 'eq':
          conditionMet = actualValue === thresholdValue;
          break;
        case 'neq':
          conditionMet = actualValue !== thresholdValue;
          break;
      }

      if (!conditionMet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['thresholdRule', 'actualValue'],
          message: `Threshold rule condition breach violation: actualValue (${actualValue}) does not satisfy '${condition}' thresholdValue (${thresholdValue}).`,
        });
      }
    }

    // 3. Simulation Confidence Cap
    if (
      rec.evidenceType === 'simulation' &&
      rec.uncertaintyBasis.confidence > 0.85
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['uncertaintyBasis', 'confidence'],
        message:
          'Simulation projections cannot claim confidence greater than 0.85 (85%).',
      });
    }

    // 4. Chronological Expiry Guard
    if (
      new Date(rec.expiresAt).getTime() <= new Date(rec.createdAt).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: 'expiresAt must be chronologically after createdAt.',
      });
    }

    // 5. Review State Attribution Invariants
    if (rec.reviewState === 'approved' || rec.reviewState === 'rejected') {
      if (!rec.reviewedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reviewedAt'],
          message: `reviewedAt is required when reviewState is '${rec.reviewState}'.`,
        });
      }
      if (!rec.reviewedBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reviewedBy'],
          message: `reviewedBy is required when reviewState is '${rec.reviewState}'.`,
        });
      }
      if (rec.reviewState === 'rejected' && !rec.rejectionReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rejectionReason'],
          message: 'rejectionReason is required when reviewState is rejected.',
        });
      }
    }
  });

export type BusinessRecommendation = z.infer<
  typeof BusinessRecommendationSchema
>;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Validates untrusted recommendation payload against the schema.
 */
export function validateRecommendation(
  payload: unknown
):
  | { success: true; data: BusinessRecommendation }
  | { success: false; errors: z.ZodIssue[] } {
  const result = BusinessRecommendationSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/**
 * Produces a human-readable summary of a validated recommendation.
 */
export function formatRecommendationSummary(
  rec: BusinessRecommendation
): string {
  const confidencePct = Math.round(rec.uncertaintyBasis.confidence * 100);
  const metricDetails = rec.supportingMetrics
    .map((m) => `${m.metric}=${m.value} (source: ${m.source})`)
    .join(', ');

  return [
    `[${rec.priority.toUpperCase()}] [${rec.category.toUpperCase()}] ${rec.title} (${rec.id})`,
    `Evidence Type: ${rec.evidenceType} | Confidence: ${confidencePct}%`,
    `Supporting Metrics: ${metricDetails || 'None'}`,
    `Next Step: ${rec.suggestedNextStep.actionTitle} (Requires Human Approval: YES)`,
    `Window: ${rec.observationWindow.start} to ${rec.observationWindow.end}`,
  ].join('\n');
}
