import {
  UnifiedActionItemSchema,
  validateActionItem,
  fromAnomalyRecord,
  fromBusinessRecommendation,
  fromSystemAlert,
  fromQaFailure,
  fromSelfAuditFinding,
  type UnifiedActionItem,
} from '../action-contract';
import { type AnomalyRecord } from '../anomaly-lifecycle';
import { type BusinessRecommendation } from '../recommendation-schema';

describe('Unified Action-Item Contract & Adapters (Track D - Phase 23)', () => {
  const baseValidActionItem: UnifiedActionItem = {
    id: 'act_anom_payment_spike_101',
    sourceType: 'anomaly',
    sourceId: 'anom_payment_spike_101',
    title: 'Payment Gateway Failure Rate Breach',
    summary:
      'Payment gateway failures exceeded operational threshold of 20% across 50 attempts.',
    category: 'infrastructure',
    priority: 'critical',
    status: 'pending',
    isExecutable: false,
    executionType: 'deep_link_workflow',
    requiredApprovalType: 'manager',
    assignedRole: 'manager',
    evidence: {
      description:
        'Observed 14 failures out of 50 gateway authorization callbacks.',
      metricRefs: [{ metric: 'payment_failure_rate', value: 28.0, unit: '%' }],
      deepLink: '/admin/payments',
      rawSourceId: 'anom_payment_spike_101',
      rawSourceType: 'anomaly_record',
    },
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    expiresAt: '2026-11-03T00:00:00.000Z',
  };

  // 1. Schema Validation
  describe('Schema Invariants & Rules', () => {
    it('validates a well-formed UnifiedActionItem successfully', () => {
      const validation = validateActionItem(baseValidActionItem);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.id).toBe('act_anom_payment_spike_101');
        expect(validation.data.sourceType).toBe('anomaly');
      }
    });

    it('rejects isExecutable=true when executionType is none', () => {
      const invalid = {
        ...baseValidActionItem,
        isExecutable: true,
        executionType: 'none',
      };
      const validation = validateActionItem(invalid);
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(
          validation.errors.some((e) =>
            e.message.includes(
              'Executable action items must specify an executionType other than none'
            )
          )
        ).toBe(true);
      }
    });

    it('rejects unsafe external deep links', () => {
      const invalid = {
        ...baseValidActionItem,
        evidence: {
          ...baseValidActionItem.evidence,
          deepLink: 'https://external-phishing-site.com/steal-creds',
        },
      };
      const validation = validateActionItem(invalid);
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(
          validation.errors.some((e) =>
            e.message.includes(
              'deepLink must point to an authorized internal portal route'
            )
          )
        ).toBe(true);
      }
    });

    it('rejects expiresAt that is earlier than or equal to createdAt', () => {
      const invalid = {
        ...baseValidActionItem,
        createdAt: '2026-10-27T12:00:00.000Z',
        expiresAt: '2026-10-27T10:00:00.000Z',
      };
      const validation = validateActionItem(invalid);
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(
          validation.errors.some((e) =>
            e.message.includes(
              'expiresAt must be chronologically after createdAt'
            )
          )
        ).toBe(true);
      }
    });

    it('rejects status=completed without completedAt and completedBy', () => {
      const invalid = {
        ...baseValidActionItem,
        status: 'completed',
        // missing completedAt, completedBy
      };
      const validation = validateActionItem(invalid);
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(
          validation.errors.some((e) =>
            e.message.includes('completedAt is required')
          )
        ).toBe(true);
        expect(
          validation.errors.some((e) =>
            e.message.includes('completedBy is required')
          )
        ).toBe(true);
      }
    });

    it('rejects status=dismissed without dismissalReason', () => {
      const invalid = {
        ...baseValidActionItem,
        status: 'dismissed',
        dismissedAt: '2026-10-27T01:00:00.000Z',
        dismissedBy: 'admin_usr_1',
        // missing dismissalReason
      };
      const validation = validateActionItem(invalid);
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(
          validation.errors.some((e) =>
            e.message.includes('dismissalReason is required')
          )
        ).toBe(true);
      }
    });
  });

  // 2. Adapters for Heterogeneous Sources
  describe('Source Adapters', () => {
    it('adapts Track C AnomalyRecord to valid UnifiedActionItem', () => {
      const mockAnomaly: AnomalyRecord = {
        id: 'anom_rto_surge_42',
        fingerprint: 'fp_rule_rto_rate_surge_rto_rate_global',
        ruleId: 'rule_rto_rate_surge',
        metric: 'rto_rate',
        dimension: 'global',
        state: 'open',
        severity: 'critical',
        title: 'Courier Return-to-Origin (RTO) Surge',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:30:00.000Z',
        occurrenceCount: 2,
        reopenCount: 0,
        latestValue: 18.2,
        thresholdValue: 15.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: false,
        history: [],
        recommendation: {
          id: 'rec_rto_42',
          title: 'Investigate Delhi courier delivery scans',
          category: 'operations',
          priority: 'critical',
          evidenceType: 'deterministic_rule',
          supportingMetrics: [],
          observationWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timeZone: 'Asia/Kolkata',
          },
          explanation: 'RTO rate surged to 18.2% exceeding threshold.',
          uncertaintyBasis: {
            confidence: 0.95,
            confidenceReason: 'Calculated from 50 orders.',
            assumptions: ['Reconciled courier transit webhooks.'],
            riskFactors: [],
          },
          suggestedNextStep: {
            actionTitle: 'Review courier delivery scan logs',
            actionType: 'investigation',
            safeDeepLink: '/admin/orders',
            requiresApproval: true,
          },
          reviewState: 'pending_review',
          createdAt: '2026-10-27T00:00:00.000Z',
          expiresAt: '2026-11-03T00:00:00.000Z',
        },
      };

      const actionItem = fromAnomalyRecord(mockAnomaly);
      const validation = validateActionItem(actionItem);

      expect(validation.success).toBe(true);
      expect(actionItem.sourceType).toBe('anomaly');
      expect(actionItem.category).toBe('operations');
      expect(actionItem.priority).toBe('critical');
      expect(actionItem.isExecutable).toBe(false); // Non-executable review item
      expect(actionItem.evidence.deepLink).toBe('/admin/orders');
    });

    it('adapts Track C/E BusinessRecommendation to valid UnifiedActionItem', () => {
      const mockRec: BusinessRecommendation = {
        id: 'rec_inventory_restock_99',
        title: 'Restock High-Velocity Kundan Necklace Variant',
        category: 'inventory',
        priority: 'high',
        evidenceType: 'deterministic_rule',
        supportingMetrics: [
          {
            metric: 'stock_out_rate',
            value: 22.5,
            source: 'supabase:products',
            timeWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timeZone: 'Asia/Kolkata',
            },
          },
        ],
        observationWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timeZone: 'Asia/Kolkata',
        },
        explanation:
          'Stock-out rate exceeded 20% on bestselling jewelry pieces.',
        uncertaintyBasis: {
          confidence: 0.9,
          confidenceReason: 'Based on actual catalog stock inventory.',
          assumptions: ['Supplier lead time is 7 business days.'],
          riskFactors: [],
        },
        suggestedNextStep: {
          actionTitle: 'Initiate vendor purchase order',
          actionType: 'inventory_restock',
          safeDeepLink: '/admin/reports/inventory',
          requiresApproval: true,
        },
        reviewState: 'pending_review',
        createdAt: '2026-10-27T00:00:00.000Z',
        expiresAt: '2026-11-03T00:00:00.000Z',
      };

      const actionItem = fromBusinessRecommendation(mockRec);
      const validation = validateActionItem(actionItem);

      expect(validation.success).toBe(true);
      expect(actionItem.sourceType).toBe('co_founder_recommendation');
      expect(actionItem.category).toBe('inventory');
      expect(actionItem.priority).toBe('high');
      expect(actionItem.evidence.deepLink).toBe('/admin/reports/inventory');
    });

    it('adapts System Alerts to valid UnifiedActionItem', () => {
      const alert = {
        id: 'alert_redis_timeout_1',
        title: 'Redis Cache Connection Timeout',
        message:
          'Multiple consecutive cache timeouts observed connecting to Upstash Redis cluster.',
        severity: 'high' as const,
        createdAt: '2026-10-27T00:00:00.000Z',
        source: 'upstash:redis',
        deepLink: '/admin/system-alerts',
      };

      const actionItem = fromSystemAlert(alert);
      const validation = validateActionItem(actionItem);

      expect(validation.success).toBe(true);
      expect(actionItem.sourceType).toBe('system_alert');
      expect(actionItem.category).toBe('infrastructure');
      expect(actionItem.priority).toBe('high');
    });

    it('adapts QA Guardian Failures to valid UnifiedActionItem', () => {
      const qaFailure = {
        id: 'qa_fail_checkout_e2e_4',
        testName: 'Guest Checkout with PhonePe Payment Redirect',
        suite: 'e2e/checkout.spec.ts',
        failureMessage:
          'Timed out waiting for Payment Gateway Redirection selector.',
        timestamp: '2026-10-27T00:00:00.000Z',
        severity: 'critical' as const,
        deepLink: '/admin/system-alerts',
      };

      const actionItem = fromQaFailure(qaFailure);
      const validation = validateActionItem(actionItem);

      expect(validation.success).toBe(true);
      expect(actionItem.sourceType).toBe('qa_failure');
      expect(actionItem.category).toBe('quality');
      expect(actionItem.priority).toBe('critical');
    });

    it('adapts Self-Audit Architecture Findings to valid UnifiedActionItem', () => {
      const auditFinding = {
        id: 'audit_secret_leak_check_1',
        title: 'Unauthenticated Public Bucket Access Detected',
        riskLevel: 'high' as const,
        category: 'security' as const,
        description:
          'Storage bucket permissions allowed public read on private verification assets.',
        detectedAt: '2026-10-27T00:00:00.000Z',
        suggestedAction:
          'Apply RLS policy to restrict bucket reads to service role.',
        deepLink: '/admin/system-alerts',
      };

      const actionItem = fromSelfAuditFinding(auditFinding);
      const validation = validateActionItem(actionItem);

      expect(validation.success).toBe(true);
      expect(actionItem.sourceType).toBe('self_audit_finding');
      expect(actionItem.category).toBe('security');
      expect(actionItem.priority).toBe('high');
    });
  });
});
