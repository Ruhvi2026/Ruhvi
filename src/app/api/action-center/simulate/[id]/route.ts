import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createActionProposal } from '@/lib/intelligence/approval-policy';
import {
  generateSimulationForProposal,
  ProposalSimulationReview,
} from '@/lib/intelligence/simulator-review-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Enforce admin auth
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { id: proposalId } = await params;

    // Build or fetch proposal stub
    const stubProposal = createActionProposal({
      recommendationId: `rec_${proposalId}`,
      title: `Simulated Safety Buffer Proposal (${proposalId})`,
      category: 'inventory',
      impactTier: 'inventory_operational',
      actionType: 'update_inventory_safety_buffer',
      targetEntity: { type: 'product', id: 'prod_necklace_01' },
      parameters: {
        productId: 'prod_necklace_01',
        previousThreshold: 2,
        newThreshold: 5,
        targetField: 'low_stock_threshold',
      },
    });

    const review = generateSimulationForProposal(stubProposal);

    return NextResponse.json(review, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to simulate proposal outcome' },
      { status: 500 }
    );
  }
}
