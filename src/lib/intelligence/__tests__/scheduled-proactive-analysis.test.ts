jest.mock('server-only', () => ({}));

import {
  getScheduledAnalysisController,
  type ScheduledAnalysisRun,
} from '../scheduled-proactive-analysis';
import { assembleCoFounderContext } from '../co-founder-context';
import { generateCoFounderRecommendations } from '../co-founder-recommendations';
import { GET, POST } from '@/app/api/intelligence/proactive-analysis/route';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

jest.mock('../co-founder-context', () => ({
  assembleCoFounderContext: jest.fn(),
}));

jest.mock('../co-founder-recommendations', () => ({
  generateCoFounderRecommendations: jest.fn(),
}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

describe('Scheduled Proactive AI Co-Founder Analysis (Track E - Phase 28)', () => {
  const mockedAssembleContext = assembleCoFounderContext as jest.Mock;
  const mockedGenerateRecs = generateCoFounderRecommendations as jest.Mock;
  const mockedRequireAdmin = requireAdmin as jest.Mock;
  const controller = getScheduledAnalysisController();

  const sampleMockContext: any = {
    assembledAt: '2026-10-26T12:00:00.000Z',
    timeWindow: {
      start: '2026-10-20T00:00:00.000Z',
      end: '2026-10-27T00:00:00.000Z',
      timezone: 'Asia/Kolkata',
      preset: 'last_7_days',
    },
    callerRole: 'admin',
    provenance: [],
    unavailableSources: [],
    financialMetrics: [],
    operationalMetrics: [],
    inventorySignals: { status: 'available' },
    funnelSummary: { status: 'available' },
    systemHealth: { status: 'available' },
    activeAnomalies: [],
    privacyGuarantees: { noPiiIncluded: true },
    promptContextMarkdown: 'context',
    characterCount: 7,
  };

  const sampleMockRecs: any[] = [
    {
      id: 'rec_sample_1',
      title: 'Catalog Restock Recommendation',
      category: 'inventory',
      priority: 'high',
      evidenceType: 'deterministic_rule',
      supportingMetrics: [],
      suggestedNextStep: {
        actionTitle: 'Restock SKUs',
        actionType: 'inventory_restock',
        safeDeepLink: '/admin/reports/inventory',
        requiresApproval: true,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    controller.clearForTesting();

    mockedAssembleContext.mockResolvedValue(sampleMockContext);
    mockedGenerateRecs.mockReturnValue(sampleMockRecs);

    mockedRequireAdmin.mockResolvedValue({
      ok: true,
      uid: 'admin_test_1',
      role: 'admin',
    });

    process.env.CRON_SECRET = 'test_cron_secret_123';
  });

  // 1. Controller Execution & Idempotency
  describe('Controller Execution and Duplicate Run Controls', () => {
    it('executes automated analysis run successfully and logs audit history', async () => {
      const run = await controller.executeAnalysis({
        trigger: 'cron',
        callerRole: 'admin',
      });

      expect(run.status).toBe('success');
      expect(run.trigger).toBe('cron');
      expect(run.recommendationsCount).toBe(1);
      expect(run.durationMs).toBeGreaterThanOrEqual(0);

      const history = controller.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].runId).toBe(run.runId);

      const status = controller.getStatus();
      expect(status.totalRunsRecorded).toBe(1);
      expect(status.lastRunStatus).toBe('success');
      expect(status.nextAllowedAutomatedRunAt).toBeDefined();
    });

    it('enforces cooldown window on repeated automated runs without force', async () => {
      // First run succeeds
      const firstRun = await controller.executeAnalysis({
        trigger: 'cron',
        cooldownMinutes: 15,
      });
      expect(firstRun.status).toBe('success');

      // Immediate second automated run is skipped
      const secondRun = await controller.executeAnalysis({
        trigger: 'cron',
        cooldownMinutes: 15,
      });

      expect(secondRun.status).toBe('skipped');
      expect(secondRun.skipReason).toContain('Cooldown active');
      expect(secondRun.recommendationsCount).toBe(0);
    });

    it('bypasses cooldown window when force=true is specified for manual runs', async () => {
      await controller.executeAnalysis({
        trigger: 'cron',
        cooldownMinutes: 15,
      });

      // Forced run proceeds immediately
      const forcedRun = await controller.executeAnalysis({
        trigger: 'admin_manual',
        force: true,
      });

      expect(forcedRun.status).toBe('success');
      expect(forcedRun.trigger).toBe('admin_manual');
      expect(forcedRun.recommendationsCount).toBe(1);
    });

    it('handles unexpected failure gracefully without crashing or retry loops', async () => {
      mockedAssembleContext.mockRejectedValueOnce(
        new Error('Database cluster unresponsive')
      );

      const failedRun = await controller.executeAnalysis({
        trigger: 'cron',
      });

      expect(failedRun.status).toBe('failed');
      expect(failedRun.error).toContain('Database cluster unresponsive');
      expect(failedRun.unavailableSources).toContain(
        'internal_execution_error'
      );

      // Controller lock is released even after failure
      const status = controller.getStatus();
      expect(status.isRunInProgress).toBe(false);
      expect(status.lastRunStatus).toBe('failed');
    });

    it('caps execution history to bounded maximum items', async () => {
      for (let i = 0; i < 30; i++) {
        await controller.executeAnalysis({
          trigger: 'admin_manual',
          force: true,
        });
      }

      const history = controller.getHistory();
      expect(history.length).toBeLessThanOrEqual(25);
    });
  });

  // 2. API Route Handlers (GET / POST)
  describe('API Route Triggers', () => {
    it('returns 401 when GET is called without valid CRON_SECRET or admin session', async () => {
      mockedRequireAdmin.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/intelligence/proactive-analysis'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it('triggers automated run when valid Bearer CRON_SECRET is provided', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/intelligence/proactive-analysis',
        {
          headers: {
            authorization: 'Bearer test_cron_secret_123',
          },
        }
      );

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.run.trigger).toBe('cron');
    });

    it('returns scheduler status and history when GET is called by an authenticated admin', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/intelligence/proactive-analysis'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('status');
      expect(json.data).toHaveProperty('history');
    });

    it('triggers on-demand manual analysis via POST with admin session', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/intelligence/proactive-analysis',
        {
          method: 'POST',
          body: JSON.stringify({ preset: 'last_7_days', force: true }),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.run.trigger).toBe('admin_manual');
      expect(json.run.callerRole).toBe('admin');
    });
  });
});
