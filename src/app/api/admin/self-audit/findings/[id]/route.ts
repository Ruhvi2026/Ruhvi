import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  acknowledgeFinding,
  resolveFinding,
  getFindingById,
} from '@/lib/audit/self-audit-store';

export const dynamic = 'force-dynamic';

/**
 * ============================================================================
 * PATCH /api/admin/self-audit/findings/:id (TRACK J - PHASE 49)
 * ============================================================================
 * Updates finding status (ACKNOWLEDGE or RESOLVE) with staff attribution.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { id: findingId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as 'ACKNOWLEDGE' | 'RESOLVE';
    const reason = body.reason as string | undefined;

    if (!action || !['ACKNOWLEDGE', 'RESOLVE'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'ACKNOWLEDGE' or 'RESOLVE'.",
        },
        { status: 400 }
      );
    }

    const existing = await getFindingById(findingId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Finding '${findingId}' not found.` },
        { status: 404 }
      );
    }

    let updatedFinding;
    if (action === 'ACKNOWLEDGE') {
      updatedFinding = await acknowledgeFinding(findingId, {
        uid: auth.uid,
        role: auth.role,
      });
    } else {
      updatedFinding = await resolveFinding(findingId, {
        reason,
        actor: {
          uid: auth.uid,
          role: auth.role,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedFinding,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to update finding status',
      },
      { status: 500 }
    );
  }
}
