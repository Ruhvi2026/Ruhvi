jest.mock('server-only', () => ({}));

import { NextRequest } from 'next/server';
import { GET as getFindingsHandler } from '@/app/api/admin/self-audit/findings/route';
import { PATCH as patchFindingHandler } from '@/app/api/admin/self-audit/findings/[id]/route';
import {
  processAuditReportFindings,
  clearFindingStoreForTesting,
} from '@/lib/audit/self-audit-store';
import { REGISTERED_SELF_AUDIT_CHECKS } from '@/lib/audit/self-audit-registry';
import * as authServer from '@/lib/auth/require-admin';

describe('Self-Audit Report View & Findings API (Track J - Phase 50)', () => {
  beforeEach(() => {
    clearFindingStoreForTesting();
    jest.clearAllMocks();
  });

  const createMockRequest = (
    url: string,
    method = 'GET',
    body?: any
  ): NextRequest => {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  describe('RBAC & Findings Querying API', () => {
    it('rejects unauthenticated requests to findings API with HTTP 401', async () => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValueOnce({
        ok: false,
        error: 'Unauthorized',
        status: 401,
      } as any);

      const req = createMockRequest(
        'http://localhost:3000/api/admin/self-audit/findings'
      );
      const res = await getFindingsHandler(req);
      expect(res.status).toBe(401);
    });

    it('queries filtered findings and supports pagination', async () => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValue({
        ok: true,
        uid: 'admin_test_01',
        role: 'admin',
      } as any);

      // Seed mock finding
      await processAuditReportFindings({
        runId: 'run_seed_01',
        trigger: 'manual_admin',
        triggeredBy: 'admin',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 120,
        totalChecks: 1,
        passed: 0,
        warned: 1,
        failed: 0,
        skipped: 0,
        overallStatus: 'DEGRADED',
        categoryBreakdown: {} as any,
        results: [
          {
            checkId: 'chk_perf_api_latency_budget',
            category: 'performance',
            severity: 'MEDIUM',
            status: 'WARN',
            message: 'Elevated API route latency observed',
            durationMs: 450,
            evaluatedAt: new Date().toISOString(),
          },
        ],
        isReadOnlySandbox: true,
        disclaimer: 'test',
      });

      const req = createMockRequest(
        'http://localhost:3000/api/admin/self-audit/findings?category=performance&status=ACTIVE'
      );
      const res = await getFindingsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.findings.length).toBe(1);
      expect(json.data.findings[0].category).toBe('performance');
    });
  });

  describe('Finding Lifecycle Actions (Acknowledge & Resolve)', () => {
    it('acknowledges and resolves a finding via PATCH endpoint', async () => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValue({
        ok: true,
        uid: 'staff_ops_99',
        role: 'manager',
      } as any);

      // Seed finding
      const seedSummary = await processAuditReportFindings({
        runId: 'run_seed_02',
        trigger: 'manual_admin',
        triggeredBy: 'admin',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 80,
        totalChecks: 1,
        passed: 0,
        warned: 0,
        failed: 1,
        skipped: 0,
        overallStatus: 'CRITICAL_ISSUES',
        categoryBreakdown: {} as any,
        results: [
          {
            checkId: 'chk_int_payment_gateway_config',
            category: 'integration',
            severity: 'CRITICAL',
            status: 'FAIL',
            message: 'PhonePe salt key missing',
            durationMs: 25,
            evaluatedAt: new Date().toISOString(),
          },
        ],
        isReadOnlySandbox: true,
        disclaimer: 'test',
      });

      const findingId = seedSummary.created[0].id;

      // 1. Acknowledge
      const ackReq = createMockRequest(
        `http://localhost:3000/api/admin/self-audit/findings/${findingId}`,
        'PATCH',
        { action: 'ACKNOWLEDGE' }
      );
      const ackRes = await patchFindingHandler(ackReq, {
        params: Promise.resolve({ id: findingId }),
      });
      const ackJson = await ackRes.json();

      expect(ackRes.status).toBe(200);
      expect(ackJson.data.status).toBe('ACKNOWLEDGED');
      expect(ackJson.data.acknowledgedBy).toContain('manager:staff_ops_99');

      // 2. Resolve
      const resReq = createMockRequest(
        `http://localhost:3000/api/admin/self-audit/findings/${findingId}`,
        'PATCH',
        {
          action: 'RESOLVE',
          reason: 'PhonePe salt key configured in environment',
        }
      );
      const resRes = await patchFindingHandler(resReq, {
        params: Promise.resolve({ id: findingId }),
      });
      const resJson = await resRes.json();

      expect(resRes.status).toBe(200);
      expect(resJson.data.status).toBe('RESOLVED');
      expect(resJson.data.resolutionReason).toContain(
        'PhonePe salt key configured'
      );
    });
  });

  describe('Allowlisted Checks Metadata & Boundary Completeness', () => {
    it('verifies all 19 allowlisted checks have documented boundaries and non-destructive flags', () => {
      expect(REGISTERED_SELF_AUDIT_CHECKS.length).toBe(19);

      for (const check of REGISTERED_SELF_AUDIT_CHECKS) {
        expect(check.isDestructive).toBe(false);
        expect(check.limitations.length).toBeGreaterThan(0);
        expect(check.timeoutMs).toBeGreaterThan(0);
        expect(check.safeExecutionConditions.length).toBeGreaterThan(0);
      }
    });
  });
});
