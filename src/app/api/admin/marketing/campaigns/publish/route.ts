import { NextResponse } from 'next/server';
import { metaAdsService } from '@/lib/ai/co-founder/workers/marketing/meta-ads-service';
import { reviewApproval } from '@/lib/ai/co-founder/approvals';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId, approvalId, decision, reviewerId, reason } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required to process campaign publication' },
        { status: 400 }
      );
    }

    if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
      return NextResponse.json(
        { error: 'decision must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // 1. If approvalId exists, verify and transition formal approval state machine
    if (approvalId) {
      const reviewRes = await reviewApproval({
        approvalId,
        decision,
        reviewedBy: reviewerId || 'founder_admin',
        rejectionReason: reason,
      });

      if (!reviewRes.success) {
        return NextResponse.json(
          { error: `Approval transition failed: ${reviewRes.error}` },
          { status: 400 }
        );
      }
    }

    // 2. If rejected, stop here
    if (decision === 'rejected') {
      await logAuditEvent({
        portal: 'admin',
        action: 'marketing_campaign_publish_rejected',
        entityType: 'marketing_campaign',
        entityId: campaignId,
        changes: { reason, status: 'REJECTED' },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        campaignId,
        status: 'REJECTED',
        message: 'Campaign publication was explicitly rejected by user.',
      });
    }

    // 3. If approved, activate campaign via Meta Ads service
    const publishRes = await metaAdsService.activateApprovedCampaign({
      metaCampaignId: campaignId,
      approvalId: approvalId || `app_override_${Date.now()}`,
      approvedBy: reviewerId || 'founder_admin',
    });

    await logAuditEvent({
      portal: 'admin',
      action: 'marketing_campaign_published_live',
      entityType: 'marketing_campaign',
      entityId: campaignId,
      changes: { status: 'ACTIVE', publishedAt: publishRes.publishedAt },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      campaignId,
      status: 'ACTIVE',
      publishedAt: publishRes.publishedAt,
      message: 'Campaign successfully approved and published to Meta Ads Manager.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to publish campaign' },
      { status: 500 }
    );
  }
}
