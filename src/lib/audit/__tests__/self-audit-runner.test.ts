jest.mock('server-only', () => ({}));

import {
  runSelfAuditSuite,
  getRecentAuditRuns,
  getLatestAuditRun,
  clearRunHistoryForTesting,
  RUNNER_DISCLAIMER,
} from '../self-audit-runner';

describe('Self-Audit Scheduled & Manual Runner (Track J - Phase 48)', () => {
  beforeEach(() => {
    clearRunHistoryForTesting();
  });

  describe('Suite Execution & Invariants', () => {
    it('executes the full self-audit suite and returns a structured report', async () => {
      const report = await runSelfAuditSuite({
        trigger: 'manual_admin',
        triggeredBy: 'admin_test_runner',
      });

      expect(report.runId).toBeDefined();
      expect(report.runId).toContain('audit_run_');
      expect(report.trigger).toBe('manual_admin');
      expect(report.triggeredBy).toBe('admin_test_runner');

      // Safety invariants
      expect(report.isReadOnlySandbox).toBe(true);
      expect(report.disclaimer).toBe(RUNNER_DISCLAIMER);
      expect(report.disclaimer).toContain(
        'No production settings or customer records are altered'
      );

      // Execution metrics
      expect(report.totalChecks).toBeGreaterThan(0);
      expect(report.durationMs).toBeGreaterThan(0);
      expect(new Date(report.startedAt).getTime()).toBeGreaterThan(0);
      expect(new Date(report.completedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(report.startedAt).getTime()
      );

      // Status & counts
      expect(['HEALTHY', 'DEGRADED', 'CRITICAL_ISSUES']).toContain(
        report.overallStatus
      );
      expect(
        report.passed + report.warned + report.failed + report.skipped
      ).toBe(report.totalChecks);

      // Category breakdown presence
      expect(report.categoryBreakdown.architecture).toBeDefined();
      expect(report.categoryBreakdown.security).toBeDefined();
      expect(report.categoryBreakdown.integration).toBeDefined();
    });

    it('executes a category-scoped audit run (security only)', async () => {
      const report = await runSelfAuditSuite({
        category: 'security',
      });

      expect(report.totalChecks).toBe(3);
      for (const res of report.results) {
        expect(res.category).toBe('security');
      }
    });

    it('filters out non-allowlisted check IDs safely', async () => {
      const report = await runSelfAuditSuite({
        checkIds: [
          'chk_arch_app_router_routes',
          'fake_destructive_sql_check', // invalid ID
        ],
      });

      expect(report.totalChecks).toBe(1);
      expect(report.results[0].checkId).toBe('chk_arch_app_router_routes');
    });
  });

  describe('Run History Buffer & Observability', () => {
    it('records and retrieves recent audit runs in memory', async () => {
      expect(getRecentAuditRuns().length).toBe(0);
      expect(getLatestAuditRun()).toBeNull();

      const run1 = await runSelfAuditSuite({ trigger: 'scheduled_cron' });
      expect(getRecentAuditRuns().length).toBe(1);
      expect(getLatestAuditRun()?.runId).toBe(run1.runId);

      const run2 = await runSelfAuditSuite({ trigger: 'manual_admin' });
      expect(getRecentAuditRuns().length).toBe(2);
      expect(getLatestAuditRun()?.runId).toBe(run2.runId);
    });
  });

  describe('Zero Secret Leakage Guarantee', () => {
    it('ensures no secret tokens appear in the completed run report', async () => {
      const report = await runSelfAuditSuite({ category: 'configuration' });
      const serialized = JSON.stringify(report).toLowerCase();

      expect(serialized).not.toContain('bearer eyj');
      expect(serialized).not.toContain('service_role_secret');
      expect(serialized).not.toContain('private_key_content');
    });
  });
});
