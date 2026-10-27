import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  runSelfAuditSuite,
  getRecentAuditRuns,
  getLatestAuditRun,
} from '@/lib/audit/self-audit-runner';
import type { AuditCheckCategory } from '@/lib/audit/self-audit-registry';

export const dynamic = 'force-dynamic';

/**
 * ============================================================================
 * POST /api/admin/self-audit/run (TRACK J - PHASE 48)
 * ============================================================================
 * Staff manual trigger for executing allowlisted read-only self-audit checks.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const category = body.category as AuditCheckCategory | undefined;
    const checkIds = Array.isArray(body.checkIds)
      ? (body.checkIds as string[])
      : undefined;

    const report = await runSelfAuditSuite({
      trigger: 'manual_admin',
      triggeredBy: `${auth.role}:${auth.uid || 'staff'}`,
      category,
      checkIds,
      maxTotalBudgetMs: 15000,
    });

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to execute self-audit run',
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * GET /api/admin/self-audit/run (TRACK J - PHASE 48)
 * ============================================================================
 * Returns recent run history and latest audit summary.
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const recentRuns = getRecentAuditRuns(10);
    const latestRun = getLatestAuditRun();

    return NextResponse.json(
      {
        success: true,
        data: {
          latestRun,
          recentRuns,
          totalBufferedRuns: recentRuns.length,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch self-audit run history',
      },
      { status: 500 }
    );
  }
}
