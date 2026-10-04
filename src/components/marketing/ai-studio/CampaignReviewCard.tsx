'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  DollarSign,
  Send,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdCampaignDraft } from '@/lib/ai/co-founder/workers/marketing/types';

interface CampaignReviewCardProps {
  campaignDraft?: AdCampaignDraft;
  approvalId?: string;
  onStatusChange?: (newStatus: 'ACTIVE' | 'REJECTED') => void;
}

export const CampaignReviewCard: React.FC<CampaignReviewCardProps> = ({
  campaignDraft,
  approvalId,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [decisionState, setDecisionState] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>(
    campaignDraft?.approvalStatus === 'APPROVED'
      ? 'APPROVED'
      : campaignDraft?.approvalStatus === 'REJECTED'
      ? 'REJECTED'
      : 'PENDING'
  );

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/campaigns/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignDraft?.campaignId || `cmp_${Date.now()}`,
          approvalId: approvalId || campaignDraft?.approvalId,
          decision,
          reviewerId: 'current_user',
          reason: decision === 'rejected' ? 'Rejected by founder during campaign review' : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process decision');

      if (decision === 'approved') {
        setDecisionState('APPROVED');
        toast.success('Campaign successfully approved and published to Meta Ads! 🚀');
        if (onStatusChange) onStatusChange('ACTIVE');
      } else {
        setDecisionState('REJECTED');
        toast.error('Campaign publication rejected.');
        if (onStatusChange) onStatusChange('REJECTED');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing campaign publication');
    } finally {
      setLoading(false);
    }
  };

  const draft = campaignDraft || {
    campaignId: 'cmp_demo_2026',
    campaignName: 'Ruhvi — Timeless Radiance [Advantage+ Test]',
    objective: 'OUTCOME_SALES' as const,
    status: 'DRAFT' as const,
    totalDailyBudgetInr: 2500,
    adSets: [
      {
        id: 'adset_1',
        name: 'Advantage+ Broad Audience (India, Women 22-42)',
        dailyBudgetInr: 1500,
        targeting: {
          locations: ['India (All Tier 1 & 2 Metros)'],
          ageMin: 22,
          ageMax: 42,
          genders: ['female' as const, 'all' as const],
          interests: ['Fine jewelry', 'Gold plating', 'Luxury goods', 'Festive fashion'],
          placements: ['instagram_reels' as const, 'instagram_feed' as const, 'facebook_feed' as const, 'stories' as const],
        },
        billingEvent: 'IMPRESSIONS' as const,
        optimizationGoal: 'CONVERSIONS' as const,
      },
    ],
    ads: [
      {
        id: 'ad_1',
        name: 'Hook 1: Anti-Tarnish All-Day Wear Test',
        adSetId: 'adset_1',
        headline: '22K Gold Plated with Anti-Tarnish E-Coating',
        primaryText:
          'Crafted for the woman who never takes her jewellery off. Handcrafted in Bengal, dipped in authentic 22K gold with 6-month color guarantee. Free express Blue Dart delivery.',
        callToAction: 'Shop The Collection',
        creativeType: 'video' as const,
        mediaUrl: 'https://res.cloudinary.com/ruhvi-demo/video/upload/v1728000000/marketing/final/reel.mp4',
        destinationUrl: 'https://ruhvi.in',
      },
    ],
    risksAndWarnings: [
      'Live activation will charge payment method connected to Meta Ads Manager.',
      'Proposed daily spend: ₹2,500/day across 2 ad sets.',
    ],
    approvalStatus: 'PENDING_APPROVAL' as const,
    isApprovalGated: true,
    canPublishImmediately: false,
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Ads Execution Co-Worker • Approval Gate</span>
          </div>
          <h2 className="text-xl font-bold text-stone-100">{draft.campaignName}</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            decisionState === 'APPROVED'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : decisionState === 'REJECTED'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {decisionState === 'APPROVED' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> LIVE / PUBLISHED
              </>
            ) : decisionState === 'REJECTED' ? (
              <>
                <XCircle className="w-3.5 h-3.5" /> REJECTED
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 animate-pulse" /> DRAFT / PENDING APPROVAL
              </>
            )}
          </span>
        </div>
      </div>

      {/* Campaign Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800">
          <span className="text-stone-400 font-medium block mb-1">Campaign Objective</span>
          <span className="text-stone-200 font-semibold">{draft.objective}</span>
        </div>
        <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800">
          <span className="text-stone-400 font-medium block mb-1">Target Audience</span>
          <span className="text-stone-200 font-semibold">{draft.adSets[0]?.targeting.locations.join(', ')} • Women (22-42)</span>
        </div>
        <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800">
          <span className="text-stone-400 font-medium block mb-1">Proposed Daily Budget</span>
          <span className="text-amber-400 font-bold text-sm">₹{draft.totalDailyBudgetInr.toLocaleString('en-IN')}/day</span>
        </div>
      </div>

      {/* Ad Creative & Copy Details */}
      <div className="bg-stone-950 rounded-xl border border-stone-800 p-5 space-y-3">
        <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
          Primary Ad Creative & Copy Preview
        </h4>
        <div className="space-y-2 text-xs">
          <p><span className="text-stone-400 font-medium">Headline:</span> <span className="text-stone-100 font-semibold">{draft.ads[0]?.headline}</span></p>
          <p><span className="text-stone-400 font-medium">Primary Text:</span> <span className="text-stone-300">{draft.ads[0]?.primaryText}</span></p>
          <p><span className="text-stone-400 font-medium">Call To Action:</span> <span className="text-amber-400 font-semibold">{draft.ads[0]?.callToAction}</span></p>
          <p className="truncate"><span className="text-stone-400 font-medium">Video Asset URL:</span> <span className="text-stone-400 font-mono text-[11px]">{draft.ads[0]?.mediaUrl}</span></p>
        </div>
      </div>

      {/* Safety & Risk Notice */}
      <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-200/90">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300 block mb-0.5">Strict Budget Safety Gate</span>
          <p className="text-stone-300 leading-relaxed">
            Meta Ads cannot spend any real budget until you explicitly click <strong>Approve & Publish</strong>. If you reject this draft, it will be discarded with zero financial impact.
          </p>
        </div>
      </div>

      {/* Approval Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => handleDecision('approved')}
          disabled={loading || decisionState === 'APPROVED'}
          className={`flex-1 py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
            decisionState === 'APPROVED'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30 cursor-default'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{decisionState === 'APPROVED' ? 'Campaign Published Live ✓' : 'APPROVE & PUBLISH LIVE'}</span>
        </button>

        <button
          onClick={() => handleDecision('rejected')}
          disabled={loading || decisionState === 'APPROVED' || decisionState === 'REJECTED'}
          className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 rounded-xl font-medium text-xs border border-stone-700 transition flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4 text-rose-400" />
          <span>REJECT DRAFT</span>
        </button>
      </div>
    </div>
  );
};
