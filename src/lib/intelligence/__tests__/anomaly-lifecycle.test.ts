import {
  computeAnomalyFingerprint,
  canTransitionAnomalyState,
  reconcileAnomalyFindings,
  acknowledgeAnomaly,
  resolveAnomaly,
  expireAnomaly,
  type AnomalyRecord,
} from '../anomaly-lifecycle';
import { type BusinessAnomalyFinding } from '../anomaly-detector';
import { type BusinessRecommendation } from '../recommendation-schema';

describe('Anomaly Deduplication & Lifecycle Engine (Track C - Phase 21)', () => {
  const baseRecommendation: BusinessRecommendation = {
    id: 'rec_rule_payment_failure_spike_1',
    title: '[CRITICAL] Payment Gateway Failure Rate Spike',
    category: 'infrastructure',
    priority: 'critical',
    evidenceType: 'deterministic_rule',
    supportingMetrics: [
      {
        metric: 'payment_failure_rate',
        value: 22.0,
        source: 'supabase:payment_transactions',
        timeWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timeZone: 'Asia/Kolkata',
        },
        sampleSize: { numerator: 11, denominator: 50 },
      },
    ],
    observationWindow: {
      start: '2026-10-20T00:00:00.000Z',
      end: '2026-10-27T00:00:00.000Z',
      timeZone: 'Asia/Kolkata',
    },
    thresholdRule: {
      ruleId: 'rule_payment_failure_spike',
      metric: 'payment_failure_rate',
      condition: 'gt',
      actualValue: 22.0,
      thresholdValue: 20.0,
    },
    explanation: 'Payment gateway failures exceeded critical threshold.',
    uncertaintyBasis: {
      confidence: 0.95,
      confidenceReason: 'Calculated from 50 transaction records.',
      assumptions: ['Authoritative payment callbacks reconciled.'],
      riskFactors: [],
    },
    suggestedNextStep: {
      actionTitle: 'Inspect payment gateway logs',
      actionType: 'investigation',
      safeDeepLink: '/admin/payments',
      requiresApproval: true,
    },
    reviewState: 'pending_review',
    createdAt: '2026-10-27T00:00:00.000Z',
    expiresAt: '2026-11-03T00:00:00.000Z',
  };

  const sampleFinding: BusinessAnomalyFinding = {
    id: 'anom_payment_1',
    ruleId: 'rule_payment_failure_spike',
    ruleName: 'Payment Gateway Failure Rate Spike',
    category: 'infrastructure',
    priority: 'critical',
    severity: 'critical',
    metric: 'payment_failure_rate',
    condition: 'gt',
    actualValue: 22.0,
    thresholdValue: 20.0,
    sampleSize: { numerator: 11, denominator: 50 },
    minSampleRequired: 10,
    observationWindow: {
      start: '2026-10-20T00:00:00.000Z',
      end: '2026-10-27T00:00:00.000Z',
      timezone: 'Asia/Kolkata',
      preset: 'last_7_days',
    },
    explanation: 'Payment gateway failures exceeded critical threshold of 20%.',
    recommendation: baseRecommendation,
    detectedAt: '2026-10-27T00:00:00.000Z',
  };

  // 1. Fingerprint Stability
  describe('Fingerprint Determinism', () => {
    it('produces identical fingerprints for repeated evaluations of the same rule and metric', () => {
      const fp1 = computeAnomalyFingerprint(
        'rule_payment_failure_spike',
        'payment_failure_rate'
      );
      const fp2 = computeAnomalyFingerprint(
        'rule_payment_failure_spike',
        'payment_failure_rate'
      );
      expect(fp1).toBe(fp2);
      expect(fp1).toBe(
        'fp_rule_payment_failure_spike_payment_failure_rate_global'
      );
    });

    it('produces different fingerprints for different metrics or rules', () => {
      const fpPayment = computeAnomalyFingerprint(
        'rule_payment_failure_spike',
        'payment_failure_rate'
      );
      const fpRto = computeAnomalyFingerprint(
        'rule_rto_rate_surge',
        'rto_rate'
      );
      expect(fpPayment).not.toBe(fpRto);
    });
  });

  // 2. State Machine Transitions
  describe('State Machine Transitions', () => {
    it('allows valid state transitions', () => {
      expect(canTransitionAnomalyState('open', 'acknowledged')).toBe(true);
      expect(canTransitionAnomalyState('open', 'resolved')).toBe(true);
      expect(canTransitionAnomalyState('acknowledged', 'resolved')).toBe(true);
      expect(canTransitionAnomalyState('resolved', 'open')).toBe(true); // Reopening
      expect(canTransitionAnomalyState('open', 'expired')).toBe(true);
    });

    it('rejects invalid state transitions', () => {
      expect(canTransitionAnomalyState('expired', 'open')).toBe(false);
      expect(canTransitionAnomalyState('expired', 'acknowledged')).toBe(false);
      expect(canTransitionAnomalyState('resolved', 'acknowledged')).toBe(false);
    });

    it('updates record state on acknowledgeAnomaly', () => {
      const initialRecord: AnomalyRecord = {
        id: 'rec_1',
        fingerprint: 'fp_1',
        ruleId: 'rule_payment_failure_spike',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'open',
        severity: 'critical',
        title: 'Payment Gateway Failure',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 22.0,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: true,
        history: [],
        recommendation: baseRecommendation,
      };

      const acked = acknowledgeAnomaly(initialRecord, 'usr_staff_123');
      expect(acked.state).toBe('acknowledged');
      expect(acked.acknowledgedBy).toBe('usr_staff_123');
      expect(acked.acknowledgedAt).toBeDefined();
      expect(acked.shouldNotify).toBe(false);
    });

    it('updates record state on resolveAnomaly', () => {
      const initialRecord: AnomalyRecord = {
        id: 'rec_1',
        fingerprint: 'fp_1',
        ruleId: 'rule_payment_failure_spike',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'acknowledged',
        severity: 'critical',
        title: 'Payment Gateway Failure',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 22.0,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: false,
        history: [],
        recommendation: baseRecommendation,
      };

      const resolved = resolveAnomaly(
        initialRecord,
        'Payment gateway rotation completed.'
      );
      expect(resolved.state).toBe('resolved');
      expect(resolved.resolutionReason).toBe(
        'Payment gateway rotation completed.'
      );
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('throws error when attempting invalid transition', () => {
      const expiredRecord: AnomalyRecord = {
        id: 'rec_1',
        fingerprint: 'fp_1',
        ruleId: 'rule_payment_failure_spike',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'expired',
        severity: 'critical',
        title: 'Payment Gateway Failure',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 22.0,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: false,
        history: [],
        recommendation: baseRecommendation,
      };

      expect(() => acknowledgeAnomaly(expiredRecord, 'usr_1')).toThrow();
    });
  });

  // 3. Deduplication & Cooldown Logic
  describe('Deduplication & Alert Cooldown', () => {
    it('creates a new anomaly on first observation with shouldNotify=true', () => {
      const t0 = new Date('2026-10-27T00:00:00.000Z');
      const result = reconcileAnomalyFindings([sampleFinding], [], { now: t0 });

      expect(result.created).toHaveLength(1);
      expect(result.updated).toHaveLength(0);
      expect(result.activeCount).toBe(1);

      const record = result.created[0];
      expect(record.state).toBe('open');
      expect(record.occurrenceCount).toBe(1);
      expect(record.shouldNotify).toBe(true);
      expect(record.history).toHaveLength(1);
    });

    it('deduplicates recurring scan within cooldown: increments count, preserves id, sets shouldNotify=false', () => {
      const t0 = new Date('2026-10-27T00:00:00.000Z');
      const firstRun = reconcileAnomalyFindings([sampleFinding], [], {
        now: t0,
      });
      const existing = firstRun.records;

      // Second scan 30 minutes later (well within 360 min cooldown)
      const t1 = new Date('2026-10-27T00:30:00.000Z');
      const secondRun = reconcileAnomalyFindings([sampleFinding], existing, {
        now: t1,
      });

      expect(secondRun.created).toHaveLength(0);
      expect(secondRun.updated).toHaveLength(1);
      expect(secondRun.activeCount).toBe(1);

      const updatedRecord = secondRun.updated[0];
      expect(updatedRecord.id).toBe(existing[0].id); // ID strictly preserved!
      expect(updatedRecord.occurrenceCount).toBe(2);
      expect(updatedRecord.shouldNotify).toBe(false); // Alert suppressed by cooldown!
      expect(updatedRecord.history).toHaveLength(2);
      expect(updatedRecord.lastObservedAt).toBe(t1.toISOString());
    });

    it('sets shouldNotify=true when observation recurs after cooldown window has elapsed', () => {
      const t0 = new Date('2026-10-27T00:00:00.000Z');
      const firstRun = reconcileAnomalyFindings([sampleFinding], [], {
        now: t0,
        cooldownMinutes: 120, // 2 hour cooldown
      });

      // Third scan 3 hours later (past 2-hour cooldown)
      const t2 = new Date('2026-10-27T03:00:00.000Z');
      const recurringRun = reconcileAnomalyFindings(
        [sampleFinding],
        firstRun.records,
        {
          now: t2,
          cooldownMinutes: 120,
        }
      );

      expect(recurringRun.updated).toHaveLength(1);
      const updatedRecord = recurringRun.updated[0];
      expect(updatedRecord.occurrenceCount).toBe(2);
      expect(updatedRecord.shouldNotify).toBe(true); // Alert triggered because cooldown elapsed!
    });

    it('bypasses cooldown when severity escalates from warning to critical', () => {
      const warningFinding: BusinessAnomalyFinding = {
        ...sampleFinding,
        severity: 'warning',
        actualValue: 12.0,
      };

      const t0 = new Date('2026-10-27T00:00:00.000Z');
      const firstRun = reconcileAnomalyFindings([warningFinding], [], {
        now: t0,
      });

      // Severity escalates to critical 15 minutes later (inside cooldown)
      const criticalFinding: BusinessAnomalyFinding = {
        ...sampleFinding,
        severity: 'critical',
        actualValue: 28.0,
      };

      const t1 = new Date('2026-10-27T00:15:00.000Z');
      const secondRun = reconcileAnomalyFindings(
        [criticalFinding],
        firstRun.records,
        { now: t1 }
      );

      expect(secondRun.updated).toHaveLength(1);
      const updated = secondRun.updated[0];
      expect(updated.severity).toBe('critical');
      expect(updated.shouldNotify).toBe(true); // Escalation overrides cooldown!
    });
  });

  // 4. Auto-Resolution on Metric Recovery
  describe('Auto-Resolution', () => {
    it('auto-resolves open finding when subsequent scan confirms metric returned to healthy', () => {
      const t0 = new Date('2026-10-27T00:00:00.000Z');
      const firstRun = reconcileAnomalyFindings([sampleFinding], [], {
        now: t0,
      });

      // Scan evaluated the rule, but metric was healthy so findings array is empty!
      const t1 = new Date('2026-10-27T02:00:00.000Z');
      const secondRun = reconcileAnomalyFindings([], firstRun.records, {
        now: t1,
        autoResolveIfHealthy: true,
        evaluatedRuleIds: ['rule_payment_failure_spike'],
      });

      expect(secondRun.resolved).toHaveLength(1);
      expect(secondRun.activeCount).toBe(0);

      const resolved = secondRun.resolved[0];
      expect(resolved.state).toBe('resolved');
      expect(resolved.resolvedAt).toBe(t1.toISOString());
      expect(resolved.resolutionReason).toContain(
        'returned within safe thresholds'
      );
    });
  });

  // 5. Reopening Relapsed Findings
  describe('Reopening Relapsed Findings', () => {
    it('reopens previously resolved finding when metric relapses beyond threshold', () => {
      const t0 = new Date('2026-10-27T00:00:00.000Z');
      const firstRun = reconcileAnomalyFindings([sampleFinding], [], {
        now: t0,
      });

      // Manually resolve finding
      const resolvedRecord = resolveAnomaly(
        firstRun.records[0],
        'Gateway issue resolved by bank'
      );
      expect(resolvedRecord.state).toBe('resolved');

      // Next day: payment failure surges again!
      const t2 = new Date('2026-10-28T00:00:00.000Z');
      const relapsedFinding: BusinessAnomalyFinding = {
        ...sampleFinding,
        actualValue: 24.0,
      };

      const relapseRun = reconcileAnomalyFindings(
        [relapsedFinding],
        [resolvedRecord],
        { now: t2 }
      );

      expect(relapseRun.reopened).toHaveLength(1);
      expect(relapseRun.created).toHaveLength(0);
      expect(relapseRun.activeCount).toBe(1);

      const reopened = relapseRun.reopened[0];
      expect(reopened.state).toBe('open');
      expect(reopened.reopenCount).toBe(1);
      expect(reopened.occurrenceCount).toBe(2);
      expect(reopened.resolvedAt).toBeUndefined();
      expect(reopened.shouldNotify).toBe(true); // Reopened incident triggers alert
    });
  });
});
