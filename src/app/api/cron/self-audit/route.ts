import { NextRequest, NextResponse } from 'next/server';
import { runSelfAuditSuite } from '@/lib/audit/self-audit-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ============================================================================
 * GET /api/cron/self-audit (TRACK J - PHASE 48)
 * ============================================================================
 * Scheduled cron runner for executing the full read-only self-audit suite.
 * Authenticated via Bearer CRON_SECRET header or internal scheduler.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized cron trigger' },
        { status: 401 }
      );
    }

    const report = await runSelfAuditSuite({
      trigger: 'scheduled_cron',
      triggeredBy: 'cron_scheduler',
      maxTotalBudgetMs: 20000,
    });

    return NextResponse.json({
      success: true,
      data: {
        runId: report.runId,
        overallStatus: report.overallStatus,
        totalChecks: report.totalChecks,
        passed: report.passed,
        warned: report.warned,
        failed: report.failed,
        durationMs: report.durationMs,
        startedAt: report.startedAt,
        completedAt: report.completedAt,
      },
    });
  } catch (err: any) {
    console.error('Scheduled self-audit run error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Self-audit cron execution failed',
      },
      { status: 500 }
    );
  }
}
