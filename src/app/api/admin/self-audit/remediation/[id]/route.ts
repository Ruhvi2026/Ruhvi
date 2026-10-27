import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getFindingById } from '@/lib/audit/self-audit-store';
import {
  generateRemediationProposal,
  bridgeRemediationToActionCenter,
} from '@/lib/audit/self-audit-remediation';

export const dynamic = 'force-dynamic';

/**
 * ============================================================================
 * GET & POST /api/admin/self-audit/remediation/:id (TRACK J - PHASE 51)
 * ============================================================================
 * Generates structured, approval-gated remediation proposals for findings and
 * bridges them into the Action Center.
 */
export async function GET(
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
    const finding = await getFindingById(findingId);

    if (!finding) {
      return NextResponse.json(
        { success: false, error: `Finding '${findingId}' not found.` },
        { status: 404 }
      );
    }

    const proposal = generateRemediationProposal(finding);

    return NextResponse.json({
      success: true,
      data: proposal,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to generate remediation proposal',
      },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const finding = await getFindingById(findingId);

    if (!finding) {
      return NextResponse.json(
        { success: false, error: `Finding '${findingId}' not found.` },
        { status: 404 }
      );
    }

    const proposal = generateRemediationProposal(finding);
    const actionCenterProposal = bridgeRemediationToActionCenter(proposal);

    return NextResponse.json({
      success: true,
      data: {
        proposal,
        actionCenterProposalId: actionCenterProposal.id,
        status: actionCenterProposal.state,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to publish remediation to Action Center',
      },
      { status: 500 }
    );
  }
}
