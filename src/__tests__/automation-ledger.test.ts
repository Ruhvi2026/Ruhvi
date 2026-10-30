jest.mock('server-only', () => ({}));

import {
  generateRunId,
  startAutomationRun,
  finishAutomationRun,
  claimMarketingDispatch,
  completeMarketingDispatch,
} from '@/lib/cron/automation-ledger';
import { GET } from '@/app/api/cron/automations/route';

describe('Cron Automation Run Ledger & Side-Effect Idempotency (Findings B5 & C2)', () => {
  describe('Run Ledger (Finding B5)', () => {
    it('generates deterministic and unique run IDs', () => {
      const runId1 = generateRunId('daily_automations');
      const runId2 = generateRunId('daily_automations');
      expect(runId1).toMatch(/^daily_automations_\d{4}-\d{2}-\d{2}/);
      expect(runId1).not.toBe(runId2);
    });

    it('records run start into cron_automation_runs', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'cron_automation_runs') {
            return { insert: mockInsert };
          }
          return {};
        }),
      };

      const { runId, startedAt } = await startAutomationRun(
        mockSupabase,
        'daily_test'
      );
      expect(runId).toContain('daily_test');
      expect(startedAt).toBeGreaterThan(0);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          run_id: runId,
          job_name: 'daily_test',
          status: 'running',
        })
      );
    });

    it('records run completion with step counts, status, and duration', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'cron_automation_runs') {
            return { update: mockUpdate };
          }
          return {};
        }),
      };

      const result = await finishAutomationRun(mockSupabase, {
        runId: 'run-123',
        startedAt: Date.now() - 500,
        stepCounts: { abandonedCarts: 2, winBacks: 1 },
        errors: [],
      });

      expect(result.status).toBe('completed');
      expect(result.durationMs).toBeGreaterThanOrEqual(400);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          step_counts: { abandonedCarts: 2, winBacks: 1 },
          errors: [],
        })
      );
    });

    it('marks status as partial_failure when errors are captured', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await finishAutomationRun(mockSupabase, {
        runId: 'run-error',
        startedAt: Date.now() - 100,
        stepCounts: {},
        errors: [{ step: 'email_send', error: 'SMTP Timeout' }],
      });

      expect(result.status).toBe('partial_failure');
    });
  });

  describe('Campaign Dispatch Idempotency (Finding C2)', () => {
    it('claims dispatch successfully on first attempt', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'dispatch-abc-123' },
        error: null,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({ insert: mockInsert }),
      };

      const res = await claimMarketingDispatch(mockSupabase, {
        userId: 'u1',
        campaignType: 'abandoned_cart',
        campaignPeriod: '2026-10-31',
      });

      expect(res.claimed).toBe(true);
      expect(res.dispatchId).toBe('dispatch-abc-123');
    });

    it('rejects duplicate dispatch when already claimed/sent', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({ insert: mockInsert }),
      };

      const res = await claimMarketingDispatch(mockSupabase, {
        userId: 'u1',
        campaignType: 'abandoned_cart',
        campaignPeriod: '2026-10-31',
      });

      expect(res.claimed).toBe(false);
      expect(res.dispatchId).toBeUndefined();
    });

    it('updates dispatch status to sent on completion', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({ update: mockUpdate }),
      };

      await completeMarketingDispatch(mockSupabase, 'dispatch-1', true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          error_message: null,
        })
      );
    });
  });

  describe('GET /api/cron/automations endpoint security', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.CRON_SECRET = 'test_cron_secret_777';
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('returns 401 when Authorization header is missing', async () => {
      const req = new Request('http://localhost:3000/api/cron/automations');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 401 when Authorization header has wrong secret', async () => {
      const req = new Request('http://localhost:3000/api/cron/automations', {
        headers: { authorization: 'Bearer wrong_secret' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });
});
