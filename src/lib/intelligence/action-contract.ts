import { z } from 'zod';
import type { AnomalyRecord } from './anomaly-lifecycle';
import type { BusinessRecommendation } from './recommendation-schema';

/**
 * ============================================================================
 * UNIFIED ACTION-ITEM CONTRACT & SCHEMA (TRACK D - PHASE 23)
 * ============================================================================
 * Universal, typed schema and adapters for alerts, anomaly findings,
 * Co-Founder recommendations, QA failures, and self-audit findings to appear
 * consistently in the Ruhvi Unified Action Center.
 *
 * Guarantees:
 * 1. Source-of-Truth Integrity: Action items preserve references to their authoritative
 *    source records without duplicating or overwriting source schemas.
 * 2. Non-Executable Clarity: Explicitly distinguishes actionable mutations from
 *    purely informational alerts or manual investigation workflows.
 * 3. Role-Based Governance: Enforces explicit approval requirements (`none`, `staff`,
 *    `manager`, `admin`, `two_person_rule`) and role assignments.
 * 4. Safe Deep Linking: Deep links must strictly point to authorized internal routes.
 * 5. Complete Lifecycle Audit: Enforces completion/dismissal attribution.
 */

export const ActionSourceTypeEnum = z.enum([
  'anomaly',
  'co_founder_recommendation',
  'system_alert',
  'qa_failure',
  'self_audit_finding',
]);
export type ActionSourceType = z.infer<typeof ActionSourceTypeEnum>;

export const ActionCategoryEnum = z.enum([
  'operations',
  'financial',
  'inventory',
  'marketing',
  'support',
  'infrastructure',
  'security',
  'quality',
]);
export type ActionCategory = z.infer<typeof ActionCategoryEnum>;

export const ActionPriorityEnum = z.enum(['critical', 'high', 'medium', 'low']);
export type ActionPriority = z.infer<typeof ActionPriorityEnum>;

export const ActionStatusEnum = z.enum([
  'pending',
  'in_progress',
  'completed',
  'dismissed',
  'expired',
]);
export type ActionStatus = z.infer<typeof ActionStatusEnum>;

export const ExecutionTypeEnum = z.enum([
  'none', // Informational review only
  'manual_review', // Requires staff inspection & sign-off
  'deep_link_workflow', // Requires staff to follow deep link to complete in originating portal
  'guarded_mutation', // Controlled execution with two-man or role gating
]);
export type ExecutionType = z.infer<typeof ExecutionTypeEnum>;

export const ApprovalTypeEnum = z.enum([
  'none',
  'staff',
  'manager',
  'admin',
  'two_person_rule',
]);
export type ApprovalType = z.infer<typeof ApprovalTypeEnum>;

export const ActionRoleEnum = z.enum([
  'staff',
  'manager',
  'admin',
  'super_admin',
  'all',
]);
export type ActionRole = z.infer<typeof ActionRoleEnum>;

// ─── Evidence Reference Schema ───────────────────────────────────────────────
export const ActionEvidenceSchema = z.object({
  description: z
    .string()
    .min(10, 'Evidence description must be at least 10 characters'),
  metricRefs: z
    .array(
      z.object({
        metric: z.string(),
        value: z.number(),
        unit: z.string().optional(),
      })
    )
    .optional(),
  deepLink: z
    .string()
    .refine(
      (link) =>
        link.startsWith('/admin/') ||
        link.startsWith('/support/') ||
        link.startsWith('/operations/') ||
        link.startsWith('/tech/'),
      {
        message:
          'deepLink must point to an authorized internal portal route (/admin/, /support/, /operations/, /tech/)',
      }
    )
    .optional(),
  rawSourceId: z.string().min(1),
  rawSourceType: z.string().min(1),
});
export type ActionEvidence = z.infer<typeof ActionEvidenceSchema>;

// ─── Unified Action Item Schema ──────────────────────────────────────────────
export const UnifiedActionItemSchema = z
  .object({
    id: z
      .string()
      .min(5)
      .regex(/^act_[a-z0-9_-]+$/, 'Action item ID must start with act_ prefix'),
    sourceType: ActionSourceTypeEnum,
    sourceId: z.string().min(1, 'Source ID must not be empty'),
    title: z.string().min(5).max(150),
    summary: z.string().min(10).max(2000),
    category: ActionCategoryEnum,
    priority: ActionPriorityEnum,
    status: ActionStatusEnum.default('pending'),
    isExecutable: z.boolean(),
    executionType: ExecutionTypeEnum,
    requiredApprovalType: ApprovalTypeEnum.default('staff'),
    assignedRole: ActionRoleEnum.default('all'),
    assignedUserId: z.string().optional(),
    evidence: ActionEvidenceSchema,
    createdAt: z
      .string()
      .datetime({ message: 'createdAt must be valid ISO-8601' }),
    updatedAt: z
      .string()
      .datetime({ message: 'updatedAt must be valid ISO-8601' }),
    expiresAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    completedBy: z.string().min(1).optional(),
    dismissedAt: z.string().datetime().optional(),
    dismissedBy: z.string().min(1).optional(),
    dismissalReason: z.string().min(3).optional(),
  })
  .superRefine((item, ctx) => {
    // 1. Executable vs ExecutionType alignment
    if (item.isExecutable && item.executionType === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['executionType'],
        message:
          'Executable action items must specify an executionType other than none.',
      });
    }

    if (!item.isExecutable && item.executionType === 'guarded_mutation') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isExecutable'],
        message: 'guarded_mutation execution type requires isExecutable: true.',
      });
    }

    // 2. Expiry Chronology Guard
    if (item.expiresAt) {
      if (
        new Date(item.expiresAt).getTime() <= new Date(item.createdAt).getTime()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiresAt'],
          message: 'expiresAt must be chronologically after createdAt.',
        });
      }
    }

    // 3. Completion Attribution
    if (item.status === 'completed') {
      if (!item.completedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['completedAt'],
          message: 'completedAt is required when status is completed.',
        });
      }
      if (!item.completedBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['completedBy'],
          message: 'completedBy is required when status is completed.',
        });
      }
    }

    // 4. Dismissal Attribution
    if (item.status === 'dismissed') {
      if (!item.dismissedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dismissedAt'],
          message: 'dismissedAt is required when status is dismissed.',
        });
      }
      if (!item.dismissedBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dismissedBy'],
          message: 'dismissedBy is required when status is dismissed.',
        });
      }
      if (!item.dismissalReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dismissalReason'],
          message: 'dismissalReason is required when status is dismissed.',
        });
      }
    }
  });

export type UnifiedActionItem = z.infer<typeof UnifiedActionItemSchema>;

// ─── Adapters to Convert Heterogeneous Sources into UnifiedActionItem ────────

/**
 * Adapter: Convert Track C AnomalyRecord to UnifiedActionItem.
 */
export function fromAnomalyRecord(anomaly: AnomalyRecord): UnifiedActionItem {
  const isCritical = anomaly.severity === 'critical';
  const statusMap: Record<string, ActionStatus> = {
    open: 'pending',
    acknowledged: 'in_progress',
    resolved: 'completed',
    expired: 'expired',
  };

  return {
    id: `act_anom_${anomaly.id.replace(/^anom_/, '')}`,
    sourceType: 'anomaly',
    sourceId: anomaly.id,
    title: anomaly.title,
    summary: anomaly.recommendation?.explanation || anomaly.title,
    category:
      (anomaly.recommendation?.category as ActionCategory) || 'operations',
    priority: isCritical ? 'critical' : 'high',
    status: statusMap[anomaly.state] || 'pending',
    isExecutable: false, // Anomalies are investigation/review items
    executionType: 'deep_link_workflow',
    requiredApprovalType: isCritical ? 'manager' : 'staff',
    assignedRole: isCritical ? 'manager' : 'staff',
    evidence: {
      description: `Observed ${anomaly.metric} of ${(anomaly.latestValue ?? 0).toFixed(1)}% breached threshold ${(anomaly.thresholdValue ?? 0).toFixed(1)}% across ${anomaly.occurrenceCount} scan observations.`,
      metricRefs: [
        {
          metric: anomaly.metric,
          value: anomaly.latestValue,
          unit: '%',
        },
      ],
      deepLink:
        anomaly.recommendation?.suggestedNextStep?.safeDeepLink ||
        '/admin/anomalies',
      rawSourceId: anomaly.id,
      rawSourceType: 'anomaly_record',
    },
    createdAt: anomaly.firstDetectedAt,
    updatedAt: anomaly.lastObservedAt,
    completedAt: anomaly.resolvedAt,
    completedBy: anomaly.acknowledgedBy || 'system_auto_resolved',
  };
}

/**
 * Adapter: Convert Track C/E BusinessRecommendation to UnifiedActionItem.
 */
export function fromBusinessRecommendation(
  rec: BusinessRecommendation
): UnifiedActionItem {
  const statusMap: Record<string, ActionStatus> = {
    draft: 'pending',
    pending_review: 'pending',
    acknowledged: 'in_progress',
    approved: 'completed',
    rejected: 'dismissed',
    expired: 'expired',
  };

  return {
    id: `act_rec_${rec.id.replace(/^rec_/, '')}`,
    sourceType: 'co_founder_recommendation',
    sourceId: rec.id,
    title: rec.title,
    summary: rec.explanation,
    category: rec.category,
    priority: rec.priority,
    status: statusMap[rec.reviewState] || 'pending',
    isExecutable: false, // Requires explicit human approval workflow
    executionType: 'manual_review',
    requiredApprovalType: rec.priority === 'critical' ? 'admin' : 'manager',
    assignedRole: rec.priority === 'critical' ? 'admin' : 'manager',
    evidence: {
      description: `Recommendation derived from ${rec.evidenceType} with ${Math.round(rec.uncertaintyBasis.confidence * 100)}% confidence basis.`,
      metricRefs: rec.supportingMetrics.map((m) => ({
        metric: m.metric,
        value: m.value,
      })),
      deepLink: rec.suggestedNextStep.safeDeepLink,
      rawSourceId: rec.id,
      rawSourceType: 'business_recommendation',
    },
    createdAt: rec.createdAt,
    updatedAt: rec.createdAt,
    expiresAt: rec.expiresAt,
    completedAt: rec.reviewedAt,
    completedBy: rec.reviewedBy,
    dismissedAt: rec.reviewState === 'rejected' ? rec.reviewedAt : undefined,
    dismissedBy: rec.reviewState === 'rejected' ? rec.reviewedBy : undefined,
    dismissalReason: rec.rejectionReason,
  };
}

/**
 * Adapter: Convert System Alerts to UnifiedActionItem.
 */
export function fromSystemAlert(alert: {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  deepLink?: string;
  source: string;
  category?: ActionCategory;
}): UnifiedActionItem {
  return {
    id: `act_alert_${alert.id.replace(/[^a-z0-9_-]/gi, '_')}`,
    sourceType: 'system_alert',
    sourceId: alert.id,
    title: alert.title,
    summary: alert.message,
    category: alert.category || 'infrastructure',
    priority: alert.severity,
    status: 'pending',
    isExecutable: false,
    executionType: alert.deepLink ? 'deep_link_workflow' : 'manual_review',
    requiredApprovalType: alert.severity === 'critical' ? 'admin' : 'staff',
    assignedRole: alert.severity === 'critical' ? 'admin' : 'staff',
    evidence: {
      description: `System alert originating from ${alert.source}.`,
      deepLink: alert.deepLink || '/admin/system-alerts',
      rawSourceId: alert.id,
      rawSourceType: 'system_alert',
    },
    createdAt: alert.createdAt,
    updatedAt: alert.createdAt,
  };
}

/**
 * Adapter: Convert QA Guardian Failures to UnifiedActionItem.
 */
export function fromQaFailure(qa: {
  id: string;
  testName: string;
  suite: string;
  failureMessage: string;
  timestamp: string;
  severity?: ActionPriority;
  deepLink?: string;
}): UnifiedActionItem {
  return {
    id: `act_qa_${qa.id.replace(/[^a-z0-9_-]/gi, '_')}`,
    sourceType: 'qa_failure',
    sourceId: qa.id,
    title: `[QA FAILURE] ${qa.suite}: ${qa.testName}`,
    summary: qa.failureMessage,
    category: 'quality',
    priority: qa.severity || 'high',
    status: 'pending',
    isExecutable: false,
    executionType: 'manual_review',
    requiredApprovalType: 'staff',
    assignedRole: 'staff',
    evidence: {
      description: `Automated test '${qa.testName}' failed in suite '${qa.suite}'.`,
      deepLink: qa.deepLink || '/admin/system-alerts',
      rawSourceId: qa.id,
      rawSourceType: 'qa_run_failure',
    },
    createdAt: qa.timestamp,
    updatedAt: qa.timestamp,
  };
}

/**
 * Adapter: Convert Self-Audit Architecture Findings to UnifiedActionItem.
 */
export function fromSelfAuditFinding(finding: {
  id: string;
  title: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  category: ActionCategory;
  description: string;
  detectedAt: string;
  suggestedAction: string;
  deepLink?: string;
}): UnifiedActionItem {
  return {
    id: `act_audit_${finding.id.replace(/[^a-z0-9_-]/gi, '_')}`,
    sourceType: 'self_audit_finding',
    sourceId: finding.id,
    title: finding.title,
    summary: `${finding.description} Suggested remediation: ${finding.suggestedAction}`,
    category: finding.category,
    priority: finding.riskLevel,
    status: 'pending',
    isExecutable: false,
    executionType: 'manual_review',
    requiredApprovalType:
      finding.riskLevel === 'critical' ? 'admin' : 'manager',
    assignedRole: finding.riskLevel === 'critical' ? 'admin' : 'manager',
    evidence: {
      description: finding.description,
      deepLink: finding.deepLink || '/admin/system-alerts',
      rawSourceId: finding.id,
      rawSourceType: 'self_audit_finding',
    },
    createdAt: finding.detectedAt,
    updatedAt: finding.detectedAt,
  };
}

/**
 * Validates untrusted payload against UnifiedActionItemSchema.
 */
export function validateActionItem(
  payload: unknown
):
  | { success: true; data: UnifiedActionItem }
  | { success: false; errors: z.ZodIssue[] } {
  const result = UnifiedActionItemSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
