import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getSelfAuditFindings } from '@/lib/audit/self-audit-store';
import type { FindingStatus } from '@/lib/audit/self-audit-store';
import type {
  AuditCheckCategory,
  AuditSeverity,
} from '@/lib/audit/self-audit-registry';

export const dynamic = 'force-dynamic';

/**
 * ============================================================================
 * GET /api/admin/self-audit/findings (TRACK J - PHASE 49)
 * ============================================================================
 * Queries persisted, deduplicated self-audit findings with RBAC filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status =
      (searchParams.get('status') as FindingStatus | 'ALL') || 'ALL';
    const category =
      (searchParams.get('category') as AuditCheckCategory | 'ALL') || 'ALL';
    const severity =
      (searchParams.get('severity') as AuditSeverity | 'ALL') || 'ALL';
    const searchQuery = searchParams.get('q') || undefined;
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit')) || 50)
    );
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    const result = await getSelfAuditFindings({
      status,
      category,
      severity,
      searchQuery,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        findings: result.findings,
        total: result.total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < result.total,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to query self-audit findings',
      },
      { status: 500 }
    );
  }
}
