import { GET, PATCH } from '../route';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getAnomalyLifecycleRegistry } from '@/lib/intelligence/anomaly-lifecycle';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/intelligence/anomaly-detector', () => ({
  detectBusinessAnomalies: jest.fn().mockResolvedValue({
    evaluatedAt: '2026-10-27T00:00:00.000Z',
    timeWindow: {
      start: '2026-10-20T00:00:00.000Z',
      end: '2026-10-27T00:00:00.000Z',
      timezone: 'Asia/Kolkata',
      preset: 'last_7_days',
    },
    totalRulesEvaluated: 5,
    anomaliesDetectedCount: 0,
    anomalies: [],
    suppressedCount: 0,
    suppressed: [],
    disabledRulesCount: 3,
    disabledRules: [],
  }),
  ENABLED_ANOMALY_RULES: {
    rule_payment_failure_spike: { id: 'rule_payment_failure_spike' },
  },
}));

describe('GET & PATCH /api/anomalies (Track C - Phase 22)', () => {
  const mockedRequireAdmin = requireAdmin as jest.Mock;
  const registry = getAnomalyLifecycleRegistry();

  beforeEach(() => {
    jest.clearAllMocks();
    registry.clear();
  });

  // 1. Authentication & RBAC
  describe('Authorization Checks', () => {
    it('returns 401 when session is unauthenticated', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      });

      const req = new NextRequest('http://localhost:3000/api/anomalies');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 403 when user is customer', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: false,
        status: 403,
        error: 'Access denied: staff or admin role required',
      });

      const req = new NextRequest('http://localhost:3000/api/anomalies');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });
  });

  // 2. GET Anomalies & Filtering
  describe('GET Handler', () => {
    it('returns summary counters and records for authorized admin', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'admin_1',
        role: 'admin',
      });

      // Seed mock records
      registry.seedRecord({
        id: 'anom_rec_1',
        fingerprint: 'fp_payment',
        ruleId: 'rule_payment_failure_spike',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'open',
        severity: 'critical',
        title: 'Payment Failure Spike',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 2,
        reopenCount: 0,
        latestValue: 24.5,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: false,
        history: [],
        recommendation: {
          id: 'rec_1',
          title: 'Payment Anomaly',
          category: 'infrastructure',
          priority: 'critical',
          evidenceType: 'deterministic_rule',
          supportingMetrics: [],
          observationWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timeZone: 'Asia/Kolkata',
          },
          explanation: 'Payment gateway failures exceeded threshold.',
          uncertaintyBasis: {
            confidence: 0.95,
            confidenceReason: 'Calculated from 50 events.',
            assumptions: ['Authoritative records.'],
            riskFactors: [],
          },
          suggestedNextStep: {
            actionTitle: 'Check logs',
            actionType: 'investigation',
            safeDeepLink: '/admin/payments',
            requiresApproval: true,
          },
          reviewState: 'pending_review',
          createdAt: '2026-10-27T00:00:00.000Z',
          expiresAt: '2026-11-03T00:00:00.000Z',
        },
      });

      const req = new NextRequest(
        'http://localhost:3000/api/anomalies?scan=false'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.summary.total).toBe(1);
      expect(json.data.summary.open).toBe(1);
      expect(json.data.summary.critical).toBe(1);
      expect(json.data.records).toHaveLength(1);
      expect(json.data.records[0].id).toBe('anom_rec_1');
    });

    it('filters records by state and severity', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'admin_1',
        role: 'admin',
      });

      // Seed 1 open critical, 1 resolved warning
      registry.seedRecord({
        id: 'anom_rec_1',
        fingerprint: 'fp_1',
        ruleId: 'rule_1',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'open',
        severity: 'critical',
        title: 'Issue 1',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 25.0,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: true,
        history: [],
        recommendation: {} as any,
      });

      registry.seedRecord({
        id: 'anom_rec_2',
        fingerprint: 'fp_2',
        ruleId: 'rule_2',
        metric: 'cancellation_rate',
        dimension: 'global',
        state: 'resolved',
        severity: 'warning',
        title: 'Issue 2',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 12.0,
        thresholdValue: 10.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: false,
        history: [],
        recommendation: {} as any,
      });

      // Query for state=open
      const reqOpen = new NextRequest(
        'http://localhost:3000/api/anomalies?scan=false&state=open'
      );
      const resOpen = await GET(reqOpen);
      const jsonOpen = await resOpen.json();
      expect(jsonOpen.data.records).toHaveLength(1);
      expect(jsonOpen.data.records[0].id).toBe('anom_rec_1');

      // Query for severity=warning
      const reqWarning = new NextRequest(
        'http://localhost:3000/api/anomalies?scan=false&severity=warning'
      );
      const resWarning = await GET(reqWarning);
      const jsonWarning = await resWarning.json();
      expect(jsonWarning.data.records).toHaveLength(1);
      expect(jsonWarning.data.records[0].id).toBe('anom_rec_2');
    });
  });

  // 3. PATCH Triage Actions
  describe('PATCH Triage Actions', () => {
    it('acknowledges an open anomaly and attributes staff actor', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'usr_mgr_42',
        role: 'manager',
      });

      registry.seedRecord({
        id: 'anom_rec_1',
        fingerprint: 'fp_1',
        ruleId: 'rule_1',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'open',
        severity: 'critical',
        title: 'Issue 1',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 25.0,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: true,
        history: [],
        recommendation: {} as any,
      });

      const req = new NextRequest('http://localhost:3000/api/anomalies', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'acknowledge',
          anomalyId: 'anom_rec_1',
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.record.state).toBe('acknowledged');
      expect(json.data.record.acknowledgedBy).toBe('usr_mgr_42');
      expect(json.data.record.acknowledgedAt).toBeDefined();
    });

    it('resolves an anomaly with documented resolution reason', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'admin_1',
        role: 'admin',
      });

      registry.seedRecord({
        id: 'anom_rec_1',
        fingerprint: 'fp_1',
        ruleId: 'rule_1',
        metric: 'payment_failure_rate',
        dimension: 'global',
        state: 'acknowledged',
        severity: 'critical',
        title: 'Issue 1',
        firstDetectedAt: '2026-10-27T00:00:00.000Z',
        lastObservedAt: '2026-10-27T00:00:00.000Z',
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: 25.0,
        thresholdValue: 20.0,
        cooldownUntil: '2026-10-27T06:00:00.000Z',
        shouldNotify: false,
        history: [],
        recommendation: {} as any,
      });

      const req = new NextRequest('http://localhost:3000/api/anomalies', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'resolve',
          anomalyId: 'anom_rec_1',
          reason: 'PhonePe gateway callback URL verified and re-registered.',
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.record.state).toBe('resolved');
      expect(json.data.record.resolutionReason).toContain(
        'PhonePe gateway callback URL'
      );
      expect(json.data.record.resolvedAt).toBeDefined();
    });

    it('rejects resolution without documented reason', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'admin_1',
        role: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/anomalies', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'resolve',
          anomalyId: 'anom_rec_1',
          // missing reason
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });
});
