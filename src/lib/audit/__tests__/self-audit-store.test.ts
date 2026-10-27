jest.mock('server-only', () => ({}));

import {
  generateFindingFingerprint,
  sanitizeFindingPayload,
  processAuditReportFindings,
  getSelfAuditFindings,
  getFindingById,
  acknowledgeFinding,
  resolveFinding,
  expireStaleResolvedFindings,
  clearFindingStoreForTesting,
} from '../self-audit-store';
import type { AuditRunReport } from '../self-audit-runner';

describe('Self-Audit Findings Persistence & Deduplication (Track J - Phase 49)', () => {
  beforeEach(() => {
    clearFindingStoreForTesting();
  });

  const createMockReport = (results: any[]): AuditRunReport => ({
    runId: 'audit_run_test_01',
    trigger: 'scheduled_cron',
    triggeredBy: 'cron_scheduler',
    startedAt: '2026-10-27T03:00:00.000Z',
    completedAt: '2026-10-27T03:00:02.000Z',
    durationMs: 2000,
    totalChecks: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    warned: results.filter((r) => r.status === 'WARN').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    skipped: results.filter((r) => r.status === 'SKIPPED').length,
    overallStatus: results.some((r) => r.status === 'FAIL')
      ? 'CRITICAL_ISSUES'
      : 'HEALTHY',
    categoryBreakdown: {
      architecture: { passed: 0, warned: 0, failed: 0, skipped: 0 },
      integration: { passed: 0, warned: 0, failed: 0, skipped: 0 },
      configuration: { passed: 0, warned: 0, failed: 0, skipped: 0 },
      security: { passed: 0, warned: 0, failed: 0, skipped: 0 },
      performance: { passed: 0, warned: 0, failed: 0, skipped: 0 },
      ai_health: { passed: 0, warned: 0, failed: 0, skipped: 0 },
    },
    results,
    isReadOnlySandbox: true,
    disclaimer: 'Test disclaimer',
  });

  describe('Fingerprint Generation & Secret Sanitization', () => {
    it('generates deterministic fingerprints for identical check events', () => {
      const fp1 = generateFindingFingerprint(
        'chk_int_supabase_connection',
        'integration',
        'Database unreachable'
      );
      const fp2 = generateFindingFingerprint(
        'chk_int_supabase_connection',
        'integration',
        'Database unreachable'
      );
      const fp3 = generateFindingFingerprint(
        'chk_int_supabase_connection',
        'integration',
        'Latency high'
      );

      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp1.length).toBe(24);
    });

    it('sanitizes sensitive secret patterns in payloads', () => {
      const dirtyPayload = {
        apiEndpoint: 'https://api.shiprocket.in',
        serviceToken: 'eyJhGciOiJIUzI1NiJ9.super_secret_payload',
        nested: {
          adminPassword: 'plaintext_pass_123',
          normalKey: 'safe_value',
        },
      };

      const clean = sanitizeFindingPayload(dirtyPayload);
      expect(clean.serviceToken).toBe('[REDACTED_SECRET]');
      expect(clean.nested.adminPassword).toBe('[REDACTED_SECRET]');
      expect(clean.nested.normalKey).toBe('safe_value');
    });
  });

  describe('Deduplication & Auto-Resolution Lifecycle', () => {
    it('creates a new finding on initial failure and deduplicates on repeat scans', async () => {
      const failureResult = {
        checkId: 'chk_int_supabase_connection',
        category: 'integration',
        severity: 'CRITICAL',
        status: 'FAIL',
        message: 'Supabase credentials missing or invalid',
        durationMs: 45,
        evaluatedAt: '2026-10-27T03:00:00.000Z',
      };

      // 1. Initial Failure Run
      const report1 = createMockReport([failureResult]);
      const summary1 = await processAuditReportFindings(report1);

      expect(summary1.created.length).toBe(1);
      expect(summary1.updated.length).toBe(0);
      expect(summary1.activeCount).toBe(1);

      const findingId = summary1.created[0].id;
      const initialFinding = await getFindingById(findingId);
      expect(initialFinding).toBeDefined();
      expect(initialFinding?.occurrenceCount).toBe(1);
      expect(initialFinding?.status).toBe('ACTIVE');

      // 2. Second Run with SAME Failure (Repeat scan)
      const repeatResult = {
        ...failureResult,
        evaluatedAt: '2026-10-27T03:05:00.000Z',
      };
      const report2 = createMockReport([repeatResult]);
      const summary2 = await processAuditReportFindings(report2);

      expect(summary2.created.length).toBe(0);
      expect(summary2.updated.length).toBe(1);
      expect(summary2.activeCount).toBe(1);

      const deduplicatedFinding = await getFindingById(findingId);
      expect(deduplicatedFinding?.occurrenceCount).toBe(2);
      expect(deduplicatedFinding?.lastSeenAt).toBe('2026-10-27T03:05:00.000Z');
      expect(deduplicatedFinding?.history.length).toBe(2);
    });

    it('auto-resolves active finding when check evaluates PASS in subsequent run', async () => {
      const failResult = {
        checkId: 'chk_cfg_required_env_presence',
        category: 'configuration',
        severity: 'CRITICAL',
        status: 'FAIL',
        message: 'Missing NEXT_PUBLIC_SUPABASE_URL',
        durationMs: 20,
        evaluatedAt: '2026-10-27T03:00:00.000Z',
      };

      // 1. Run with failure
      await processAuditReportFindings(createMockReport([failResult]));

      const activeFindings = await getSelfAuditFindings({ status: 'ACTIVE' });
      expect(activeFindings.findings.length).toBe(1);

      // 2. Subsequent run where the check has recovered to PASS
      const passResult = {
        checkId: 'chk_cfg_required_env_presence',
        category: 'configuration',
        severity: 'CRITICAL',
        status: 'PASS',
        message: 'All mandatory runtime environment variables are defined.',
        durationMs: 15,
        evaluatedAt: '2026-10-27T03:10:00.000Z',
      };

      const summary = await processAuditReportFindings(
        createMockReport([passResult])
      );
      expect(summary.autoResolved.length).toBe(1);
      expect(summary.activeCount).toBe(0);

      const resolved = await getFindingById(activeFindings.findings[0].id);
      expect(resolved?.status).toBe('RESOLVED');
      expect(resolved?.resolvedAt).toBe('2026-10-27T03:10:00.000Z');
      expect(resolved?.resolutionReason).toContain('healthy');
    });

    it('reopens resolved finding when the issue relapses in a later run', async () => {
      const failResult = {
        checkId: 'chk_sec_rbac_admin_route_guards',
        category: 'security',
        severity: 'CRITICAL',
        status: 'FAIL',
        message: 'Route guard missing on /api/admin/test',
        durationMs: 25,
        evaluatedAt: '2026-10-27T03:00:00.000Z',
      };

      // 1. Fail
      await processAuditReportFindings(createMockReport([failResult]));

      // 2. Pass -> auto-resolves
      await processAuditReportFindings(
        createMockReport([
          {
            checkId: 'chk_sec_rbac_admin_route_guards',
            category: 'security',
            severity: 'CRITICAL',
            status: 'PASS',
            message: 'All admin routes guarded',
            durationMs: 10,
            evaluatedAt: '2026-10-27T03:15:00.000Z',
          },
        ])
      );

      const resolvedList = await getSelfAuditFindings({ status: 'RESOLVED' });
      expect(resolvedList.findings.length).toBe(1);
      const findingId = resolvedList.findings[0].id;

      // 3. Relapse -> Reopen
      const relapseSummary = await processAuditReportFindings(
        createMockReport([
          {
            ...failResult,
            evaluatedAt: '2026-10-27T03:30:00.000Z',
          },
        ])
      );

      expect(relapseSummary.reopened.length).toBe(1);
      expect(relapseSummary.activeCount).toBe(1);

      const reopenedFinding = await getFindingById(findingId);
      expect(reopenedFinding?.status).toBe('ACTIVE');
      expect(reopenedFinding?.reopenCount).toBe(1);
      expect(reopenedFinding?.resolvedAt).toBeUndefined();
    });
  });

  describe('Staff Actions & Status Transitions', () => {
    it('supports acknowledging and manually resolving findings', async () => {
      const failResult = {
        checkId: 'chk_perf_api_latency_budget',
        category: 'performance',
        severity: 'MEDIUM',
        status: 'WARN',
        message: 'P95 latency elevated at 620ms',
        durationMs: 620,
        evaluatedAt: '2026-10-27T03:00:00.000Z',
      };

      const summary = await processAuditReportFindings(
        createMockReport([failResult])
      );
      const findingId = summary.created[0].id;

      // 1. Acknowledge
      const acked = await acknowledgeFinding(findingId, {
        uid: 'usr_staff_01',
        role: 'manager',
      });
      expect(acked.status).toBe('ACKNOWLEDGED');
      expect(acked.acknowledgedBy).toBe('manager:usr_staff_01');

      // 2. Resolve
      const resolved = await resolveFinding(findingId, {
        reason: 'Scaled serverless container memory limit',
        actor: { uid: 'usr_staff_01', role: 'manager' },
      });
      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolutionReason).toContain('Scaled serverless');
    });

    it('expires stale resolved findings older than the retention threshold', async () => {
      const failResult = {
        checkId: 'chk_ai_anomaly_rule_registry',
        category: 'ai_health',
        severity: 'MEDIUM',
        status: 'FAIL',
        message: 'Rule registry timeout',
        durationMs: 15,
        evaluatedAt: '2026-10-27T03:00:00.000Z',
      };

      const summary = await processAuditReportFindings(
        createMockReport([failResult])
      );
      const finding = summary.created[0];

      // Mark resolved with timestamp 40 days ago
      finding.status = 'RESOLVED';
      finding.resolvedAt = new Date(
        Date.now() - 40 * 24 * 60 * 60 * 1000
      ).toISOString();

      const expiredCount = await expireStaleResolvedFindings(30);
      expect(expiredCount).toBe(1);
      expect(finding.status).toBe('EXPIRED');
    });
  });
});
