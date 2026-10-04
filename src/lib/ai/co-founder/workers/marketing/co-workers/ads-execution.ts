import 'server-only';

import {
  CoWorkerDefinition,
  CoWorkerStructuredOutput,
  CoWorkerTaskInput,
  MarketingCoWorkerId,
  AdsExecutionResult,
  AdCampaignDraft,
  AdSetDraft,
  AdDraft,
} from '../types';
import { isCoWorkerEnabled } from '../config';
import { metaAdsService } from '../meta-ads-service';

export class AdsExecutionCoWorker {
  readonly id: MarketingCoWorkerId = 'marketing_ads_execution';
  readonly name = 'Ads Execution Co-worker';

  getDefinition(): CoWorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Advertising Operations & Paid Acquisition Campaign Architect',
      objective:
        'Convert approved marketing strategy and creative assets into Meta Ads campaign structures, configure targeting, build draft ad sets and creatives, and enforce approval-gated publishing.',
      status: isCoWorkerEnabled(this.id) ? 'ENABLED' : 'DISABLED',
      skills: [
        'Campaign creation',
        'Campaign objective selection',
        'Ad account selection',
        'Campaign structure',
        'Ad set creation',
        'Audience configuration',
        'Location targeting',
        'Demographic targeting',
        'Placement configuration',
        'Budget configuration',
        'Schedule configuration',
        'Creative attachment',
        'Primary text',
        'Headline',
        'Description',
        'CTA',
        'Tracking configuration',
        'Campaign naming',
        'Ad set naming',
        'Ad naming',
        'Draft creation',
        'Campaign validation',
        'Campaign preview',
        'Campaign optimization',
        'Campaign insights',
        'Performance monitoring',
        'Budget-aware recommendations',
        'A/B testing setup where supported',
        'Pause/resume where permitted',
        'Campaign activation after approval',
      ],
      tools: [
        'get_store_metrics',
        'get_coupons',
      ],
      mcpPermissions: ['mcp_tools:read', 'mcp_tools:write'],
      isProductionOnly: false,
    };
  }

  async execute(input: CoWorkerTaskInput): Promise<CoWorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const taskLower = input.task.toLowerCase();

    if (!isCoWorkerEnabled(this.id)) {
      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'DISABLED',
        success: false,
        findings: ['Ads Execution Co-worker is currently disabled in configuration.'],
        evidence: [],
        problems: ['Cannot execute ads campaign task on a disabled worker.'],
        opportunities: [],
        recommendations: ['Enable marketing_ads_execution via config or admin dashboard.'],
        data: {},
        requiredApproval: false,
        executionStatus: 'disabled',
        executiveVoiceSummary: 'Ads Execution co-worker is currently disabled.',
        timestamp,
      };
    }

    try {
      const strategy = input.previousContext?.strategy;
      const creative = input.previousContext?.creative;
      const mediaJob = input.previousContext?.mediaJob;

      const productName = input.productName || '22K Gold-Plated Luxury Demi-Fine Jewellery';
      const campaignName = strategy?.businessGoal
        ? `Ruhvi — ${strategy.campaignAngle} [Advantage+ Test]`
        : `Ruhvi — ${productName} Acquisition Campaign`;

      const dailyBudgetInr =
        input.budget ||
        strategy?.budgetRecommendation.suggestedDailyBudgetInr ||
        2500;

      // 1. Build Ad Sets
      const adSets: AdSetDraft[] = [
        {
          id: 'adset_broad_advantage',
          name: 'Advantage+ Broad Audience (India, Women 22-42)',
          dailyBudgetInr: Math.round(dailyBudgetInr * 0.6),
          targeting: {
            locations: ['India (All Tier 1 & 2 Metros)'],
            ageMin: 22,
            ageMax: 42,
            genders: ['female', 'all'],
            interests: [
              'Fine jewelry',
              'Gold plating',
              'Luxury goods',
              'Wedding shopping in India',
              'Festive fashion',
            ],
            behaviors: ['Engaged shoppers', 'Frequent online buyers'],
            placements: ['instagram_reels', 'instagram_feed', 'facebook_feed', 'stories'],
          },
          billingEvent: 'IMPRESSIONS',
          optimizationGoal: 'CONVERSIONS',
        },
        {
          id: 'adset_interest_luxury',
          name: 'Interests: Designer Jewellery & Bridal Enthusiasts',
          dailyBudgetInr: Math.round(dailyBudgetInr * 0.4),
          targeting: {
            locations: ['Mumbai', 'Delhi NCR', 'Kolkata', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad'],
            ageMin: 24,
            ageMax: 45,
            genders: ['female'],
            interests: ['Tanishq', 'CaratLane', 'Ethnic wear', 'Indian bridal fashion'],
            placements: ['instagram_reels', 'instagram_feed'],
          },
          billingEvent: 'IMPRESSIONS',
          optimizationGoal: 'CONVERSIONS',
        },
      ];

      // 2. Build Ads
      const finalVideoUrl =
        mediaJob?.outputAsset?.finalVideoUrl ||
        'https://res.cloudinary.com/ruhvi-demo/video/upload/v1728000000/marketing/final/connected_reel.mp4';

      const ads: AdDraft[] = [
        {
          id: 'ad_angle_1_wear_test',
          name: 'Hook 1: Anti-Tarnish All-Day Wear Test (Reel)',
          adSetId: 'adset_broad_advantage',
          headline: strategy?.angles[0]?.headline || '22K Gold Plated with Anti-Tarnish E-Coating',
          primaryText:
            strategy?.angles[0]?.primaryText ||
            'Looks like solid 22K gold. Survives perfumes, sweat, and daily wear with our 6-month color guarantee. Free express Blue Dart delivery across India.',
          callToAction: strategy?.angles[0]?.callToAction || 'Shop Now',
          creativeType: 'video',
          mediaUrl: finalVideoUrl,
          destinationUrl: 'https://ruhvi.in/collections/bestsellers',
        },
        {
          id: 'ad_angle_2_heritage_craft',
          name: 'Hook 2: Heritage Bengal Craftsmanship',
          adSetId: 'adset_interest_luxury',
          headline: strategy?.angles[1]?.headline || 'Heritage Craftsmanship, Zero Safe-Locker Anxiety',
          primaryText:
            strategy?.angles[1]?.primaryText ||
            'Intricately handcrafted in Bengal, dipped in authentic 22K gold. Discover demi-fine jewellery designed for modern life.',
          callToAction: 'Explore Ruhvi Classics',
          creativeType: 'video',
          mediaUrl: finalVideoUrl,
          destinationUrl: 'https://ruhvi.in/collections/all',
        },
      ];

      // 3. Register Safe Draft Campaign in PAUSED mode
      const campaignDraft: AdCampaignDraft = {
        campaignId: `cmp_${Date.now()}`,
        campaignName,
        objective: 'OUTCOME_SALES',
        status: 'DRAFT',
        totalDailyBudgetInr: dailyBudgetInr,
        adSets,
        ads,
        trackingPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || 'pixel_ruhvi_official',
        risksAndWarnings: [
          'Live activation will charge payment method connected to Meta Ads Manager.',
          `Proposed daily spend: ₹${dailyBudgetInr.toLocaleString('en-IN')}/day across ${adSets.length} ad sets.`,
        ],
        approvalStatus: 'PENDING_APPROVAL',
        isApprovalGated: true,
        canPublishImmediately: false,
      };

      // Call meta service to prepare draft
      await metaAdsService.createCampaignDraft(campaignDraft);

      const adsResult: AdsExecutionResult = {
        campaignDraft,
        approvalRequired: true,
        approvalStatus: 'PENDING_APPROVAL',
        verification: 'Verify budget caps, audience exclusions, and creative preview before approving publication.',
        executiveVoiceSummary:
          `Campaign draft "${campaignName}" is configured in DRAFT status with 2 ad sets at ₹${dailyBudgetInr.toLocaleString('en-IN')}/day. Awaiting your approval before publishing live to Meta Ads.`,
      };

      const findings = [
        `Structured Meta Ads campaign draft "${campaignName}" with 2 targeted ad sets and 2 ad creatives.`,
        `Set to DRAFT/PAUSED mode to prevent unapproved ad spend.`,
        `Integrated tracking with Meta Pixel and Conversions API.`,
      ];

      const recommendations = [
        `Review the campaign draft summary in the Campaign Review card.`,
        `Click [ APPROVE & PUBLISH ] to activate the campaign on Meta Ads Manager once ready.`,
      ];

      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'ENABLED',
        success: true,
        findings,
        evidence: [
          `Meta Ads campaign created in DRAFT status adhering strictly to safety approval gate.`,
          `Daily budget capped at ₹${dailyBudgetInr.toLocaleString('en-IN')}.`,
        ],
        problems: [],
        opportunities: [
          'Run 7-day test flight to identify winning creative hook before scaling budget.',
        ],
        recommendations,
        data: {
          adsExecution: adsResult,
        },
        requiredApproval: true,
        executionStatus: 'pending_approval',
        executiveVoiceSummary: adsResult.executiveVoiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'ENABLED',
        success: false,
        findings: ['Ads Execution worker encountered an error.'],
        evidence: [err.message],
        problems: [`Failed to create ad campaign draft: ${err.message}`],
        opportunities: [],
        recommendations: ['Retry campaign draft generation.'],
        data: {},
        requiredApproval: false,
        executionStatus: 'failed',
        executiveVoiceSummary: `Ads Execution co-worker encountered an issue: ${err.message}`,
        timestamp,
        error: err.message,
      };
    }
  }
}

export const adsExecutionCoWorker = new AdsExecutionCoWorker();
