jest.mock('server-only', () => ({}));

import {
  sanitizeFindingPayload,
  processAuditReportFindings,
  getSelfAuditFindings,
  clearFindingStoreForTesting,
} from '../self-audit-store';
import { runSelfAuditSuite } from '../self-audit-runner';
import type { AuditRunReport } from '../self-audit-runner';

// Mock Supabase service client
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
  select: mockSelect,
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Durable Self-Audit Persistence & String Secret Sanitization (P1.2 & P2.5)', () => {
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    clearFindingStoreForTesting();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  describe('Secret Sanitization on Primitive Strings (P2.5)', () => {
    it('redacts tokens embedded inside error strings', () => {
      const errorStr =
        'Authentication failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123';
      const sanitized = sanitizeFindingPayload(errorStr);
      expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('redacts passwords in database connection strings', () => {
      const connStr =
        'postgres://postgres:supersecretpassword@localhost:5432/ruhvi';
      const sanitized = sanitizeFindingPayload(connStr);
      expect(sanitized).toBe(
        'postgres://postgres:[REDACTED_PASSWORD]@localhost:5432/ruhvi'
      );
    });

    it('redacts raw API keys in plain text payloads', () => {
      const payload = 'Error calling provider: api_key=ab12cd34ef56gh78ij90kl';
      const sanitized = sanitizeFindingPayload(payload);
      expect(sanitized).toContain('api_key=[REDACTED_KEY]');
    });
  });

  describe('Database Persistence on Audit Findings (P1.2)', () => {
    it('persists findings to self_audit_findings table with unique fingerprint upsert', async () => {
      const mockReport: AuditRunReport = {
        runId: 'run_test_durable_01',
        trigger: 'scheduled_cron',
        triggeredBy: 'cron_scheduler',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1500,
        totalChecks: 1,
        passed: 0,
        warned: 1,
        failed: 0,
        skipped: 0,
        overallStatus: 'DEGRADED',
        categoryBreakdown: {
          architecture: { passed: 0, warned: 1, failed: 0, skipped: 0 },
          integration: { passed: 0, warned: 0, failed: 0, skipped: 0 },
          configuration: { passed: 0, warned: 0, failed: 0, skipped: 0 },
          security: { passed: 0, warned: 0, failed: 0, skipped: 0 },
          performance: { passed: 0, warned: 0, failed: 0, skipped: 0 },
          ai_health: { passed: 0, warned: 0, failed: 0, skipped: 0 },
        },
        results: [
          {
            checkId: 'chk_durable_test_01',
            category: 'architecture',
            severity: 'MEDIUM',
            status: 'WARN',
            message: 'Detected elevated memory usage',
            durationMs: 120,
            evaluatedAt: new Date().toISOString(),
          },
        ],
        isReadOnlySandbox: true,
        disclaimer: 'test',
      };

      const summary = await processAuditReportFindings(mockReport);
      expect(summary.created.length).toBe(1);

      // Verify PostgreSQL table interaction
      expect(mockFrom).toHaveBeenCalledWith('self_audit_findings');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            check_id: 'chk_durable_test_01',
            status: 'ACTIVE',
            severity: 'MEDIUM',
          }),
        ]),
        { onConflict: 'fingerprint' }
      );
    });

    it('automatically triggers findings processing when running the suite via runSelfAuditSuite', async () => {
      const report = await runSelfAuditSuite({
        trigger: 'manual_admin',
        triggeredBy: 'staff:admin_1',
      });

      expect(report.runId).toBeDefined();
      // Even if all checks pass or fail, the upsert or processing occurs cleanly
      expect(mockFrom).toHaveBeenCalledWith('self_audit_findings');
    });
  });
});
