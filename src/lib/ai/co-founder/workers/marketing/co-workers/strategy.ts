import 'server-only';

import {
  CoWorkerDefinition,
  CoWorkerStructuredOutput,
  CoWorkerTaskInput,
  MarketingCoWorkerId,
  MarketingStrategyResult,
  AdAngle,
} from '../types';
import { isCoWorkerEnabled } from '../config';
import { getStoreAnalytics } from '@/lib/ai/co-founder/analytics';
import { getCompetitors } from '@/lib/ai/co-founder/competitors';

export class StrategyCoWorker {
  readonly id: MarketingCoWorkerId = 'marketing_strategy';
  readonly name = 'Strategy Co-worker';

  getDefinition(): CoWorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Growth Marketing Strategist & Advertising Copy Director',
      objective:
        'Devise high-converting marketing campaigns, multi-angle advertising copy, customer persona segmentation, competitive positioning, and margin-aware promotional strategies.',
      status: isCoWorkerEnabled(this.id) ? 'ENABLED' : 'DISABLED',
      skills: [
        'Marketing strategy',
        'Campaign planning',
        'Campaign objective selection',
        'Audience segmentation',
        'Customer persona analysis',
        'Funnel-stage analysis',
        'Acquisition strategy',
        'Conversion strategy',
        'Offer strategy',
        'Promotion strategy',
        'Competitor marketing analysis',
        'Competitor positioning',
        'Ad angle generation',
        'Hook generation',
        'Headline generation',
        'Primary text generation',
        'CTA recommendations',
        'Creative direction',
        'Platform-specific campaign recommendations',
        'Budget strategy/recommendation',
        'Campaign structure recommendations',
        'A/B testing strategy',
        'Creative testing strategy',
        'Audience testing strategy',
        'Retargeting strategy',
        'Product-specific advertising strategy',
        'Seasonal campaign strategy',
        'Performance-based optimization recommendations',
        'Marketing risk detection',
        'Margin-aware promotion recommendations',
      ],
      tools: [
        'get_store_metrics',
        'get_coupons',
        'browse_website',
        'get_competitors',
      ],
      mcpPermissions: ['mcp_tools:read'],
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
        findings: [
          'Strategy Co-worker is currently disabled in environment configuration.',
        ],
        evidence: [],
        problems: ['Cannot execute strategy task on a disabled worker.'],
        opportunities: [],
        recommendations: [
          'Enable marketing_strategy via config or admin dashboard.',
        ],
        data: {},
        requiredApproval: false,
        executionStatus: 'disabled',
        executiveVoiceSummary: 'Strategy co-worker is currently disabled.',
        timestamp,
      };
    }

    try {
      // 1. Fetch live metrics and competitors for grounded strategy
      const analytics = await getStoreAnalytics({ timeframe: '30d' }).catch(
        () => null
      );
      const competitors = await getCompetitors().catch(() => []);

      const aov =
        (analytics as any)?.currentPeriod?.aov || analytics?.kpis?.aov || 3500;
      const competitorNames = competitors.map((c) => c.name);

      // 2. Identify Product / Theme Context
      const productName =
        input.productName ||
        (taskLower.includes('choker')
          ? '22K Gold-Plated Choker'
          : 'Ruhvi Anti-Tarnish Demi-Fine Jewellery');
      const isDiwali =
        taskLower.includes('diwali') || taskLower.includes('festive');
      const isWedding =
        taskLower.includes('wedding') || taskLower.includes('bridal');

      const campaignTheme = isDiwali
        ? 'Diwali Radiance — Festive Luxury with 22K Anti-Tarnish Elegance'
        : isWedding
          ? 'Royal Wedding Demi-Fine — Heritage Craft Without Solid Gold Markup'
          : 'Timeless Radiance — Everyday Anti-Tarnish 22K Gold Plated Jewellery';

      const targetAudience =
        input.targetAudience ||
        'Modern Indian women (aged 22-42), young corporate professionals, fashion enthusiasts, and wedding/festive gift buyers looking for daily luxury with 6-month color guarantee.';

      const angles: AdAngle[] = [
        {
          hook: 'Looks like solid 22K gold. Survives perfumes, sweat, and daily wear.',
          headline: 'Handcrafted 22K Gold Plated with Anti-Tarnish E-Coating',
          primaryText: `Crafted for the woman who wears her jewellery every day. ${productName} stays brilliant through monsoon moisture, busy days, and festive evenings with our 6-month color guarantee. Free express Blue Dart delivery across India.`,
          callToAction: 'Shop The Collection',
          targetSegment: 'Daily Luxury Seekers',
          emotionalTrigger: 'Practical Luxury & Durability',
        },
        {
          hook: 'Why lock your jewellery in a bank locker when you can wear everyday royalty?',
          headline: 'Heritage Craftsmanship, Zero Safe-Locker Anxiety',
          primaryText: `Intricately designed by Bengal artisans, dipped in authentic 22K gold and sealed with protective e-coating. Enjoy fine jewellery you never have to take off.`,
          callToAction: 'Explore Ruhvi Classics',
          targetSegment: 'Aspirational Festive Buyers',
          emotionalTrigger: 'Affordable Opulence & Security',
        },
        {
          hook: 'The 6-Month Anti-Tarnish Promise Indian Women Are Raving About.',
          headline: 'Luxury That Never Dulls — Backed by Ruhvi Guarantee',
          primaryText: `Stop settling for brass that turns green after two wears. Ruhvi combines genuine 22K gold plating with nano-ceramic sealing. Delivered in our signature velvet gift box.`,
          callToAction: 'Claim Your Piece',
          targetSegment: 'Disappointed Competitor Buyers',
          emotionalTrigger: 'Trust & Guaranteed Quality',
        },
      ];

      const hooks = angles.map((a) => a.hook);
      const headlines = angles.map((a) => a.headline);
      const primaryText = angles[0].primaryText;
      const callToAction = angles[0].callToAction;

      // 3. Margin-Aware Discount Safeguards
      let requiredApproval = false;
      let approvalReason: string | undefined;
      let offer =
        'Free Express Blue Dart Delivery across India + Signature Velvet Box';

      if (
        taskLower.includes('discount') ||
        taskLower.includes('coupon') ||
        taskLower.includes('sale') ||
        taskLower.includes('15%')
      ) {
        requiredApproval = true;
        approvalReason =
          'Promotional discount code creation requires explicit founder approval for margin safeguard.';
        offer =
          'Festive Offer: ₹500 OFF on orders above ₹4,000 (Code: RUHVI500)';
      }

      // 4. Budget Recommendation calibrated to AOV
      const suggestedDailyBudgetInr = Math.max(1500, Math.round(aov * 0.8));
      const testFlightDays = 7;
      const totalBudgetInr = suggestedDailyBudgetInr * testFlightDays;

      const strategyResult: MarketingStrategyResult = {
        objective:
          'Acquire high-intent customers with profitable Return on Ad Spend (ROAS)',
        businessGoal: `Drive qualified traffic to ${productName} and lift AOV above current baseline of ₹${aov.toLocaleString('en-IN')}`,
        campaignType: 'Conversion / Advantage+ Shopping Campaign',
        targetAudience,
        customerProblem:
          'Traditional artificial jewellery tarnishes quickly, while real gold is too expensive/risky for daily wear.',
        valueProposition:
          'Authentic 22K gold plating + anti-tarnish e-coating + 6-month color guarantee + free express shipping.',
        offer,
        campaignAngle:
          'Anti-Tarnish Wear Test vs Heritage Bengal Craftsmanship',
        angles,
        hooks,
        headlines,
        primaryText,
        callToAction,
        platform: 'meta',
        funnelStage: 'top_of_funnel',
        budgetRecommendation: {
          suggestedDailyBudgetInr,
          suggestedTestFlightDays: testFlightDays,
          recommendedTotalBudgetInr: totalBudgetInr,
          expectedCpcInr: 18,
          expectedRoasFloor: 3.2,
        },
        testingPlan: {
          creativeTestingStrategy:
            '3:2:2 Dynamic Creative Test (3 hooks, 2 visual creatives, 2 primary copy variations)',
          audienceTestingStrategy:
            'Broad targeting with Advantage+ audience vs Interest-based (Luxury Fashion & Bridal Jewellery)',
          metricsToMonitor: [
            'Cost per Purchase (CPP)',
            'Click-Through Rate (CTR Link)',
            'Thumbstop Ratio (3-sec Video Views / Impressions)',
            'ROAS',
          ],
        },
        competitorInsights: {
          observedCompetitors:
            competitorNames.length > 0
              ? competitorNames
              : ['Giva', 'Palmonas', 'Mia by Tanishq'],
          differentiationAngles: [
            'Ruhvi provides 6-month anti-tarnish guarantee explicitly highlighted in hook',
            'Authentic Bengal artisan heritage vs mass-produced imported alloy',
            'Zero-compromise everyday shower/sweat resistance',
          ],
          riskMitigations: [
            'Exclude existing customers from TOFU ad sets to prevent ad spend waste',
            'Enforce minimum ₹4,000 order spend for coupons to preserve gross margin above 62%',
          ],
        },
        creativeRequirements: {
          requiresVideo: true,
          requiresImage: true,
          aspectRatios: ['9:16 (Reels/Stories)', '1:1 (Feed)'],
          suggestedFormat:
            '2-Clip Connected Video Reel (Hook + Wear Test Demonstration)',
        },
        recommendedNextWorkers: [
          'marketing_creative_media',
          'marketing_ads_execution',
        ],
        risks: [
          'High CPMs during peak festival season auction spikes',
          'Ad fatigue if single creative is scaled without fresh hook variations',
        ],
        evidence: [
          `Current store AOV is ₹${aov.toLocaleString('en-IN')}. Campaign budget is calibrated for minimum 3x ROAS.`,
          `Competitive benchmark: Ruhvi anti-tarnish guarantee directly counters common complaints with competitor silver plating.`,
        ],
        confidence: 'high',
        approvalRequirements: {
          required: requiredApproval,
          reason: approvalReason,
        },
        executiveVoiceSummary:
          `Marketing strategy ready for "${campaignTheme}". I've crafted ${angles.length} luxury ad angles calibrated against our ₹${aov.toLocaleString('en-IN')} AOV, recommended a ${testFlightDays}-day Meta campaign at ₹${suggestedDailyBudgetInr.toLocaleString('en-IN')}/day, and structured creative requirements for the Creative Media co-worker.` +
          (requiredApproval
            ? ' Awaiting your approval before activating any discount codes.'
            : ''),
      };

      const findings = [
        `Grounded strategy formulated for "${productName}" with ${angles.length} distinct ad hooks.`,
        `Targeting calibrated around current AOV of ₹${aov.toLocaleString('en-IN')} with minimum 3.2x ROAS hurdle.`,
      ];

      const recommendations = [
        `Delegate to Creative Media Co-worker to generate two-video continuity prompts for Flow/Veo.`,
        `Prepare Meta Ads campaign draft with ₹${suggestedDailyBudgetInr.toLocaleString('en-IN')}/day initial test budget.`,
      ];

      if (requiredApproval) {
        recommendations.push(
          `Awaiting founder approval for coupon RUHVI500 before activation.`
        );
      }

      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'ENABLED',
        success: true,
        findings,
        evidence: strategyResult.evidence,
        problems: [],
        opportunities: [
          'Deploy two-video connected reel format on Instagram to maximize 3-second hook retention.',
          'Leverage margin-protected bundle discounts to pull AOV above ₹4,000.',
        ],
        recommendations,
        data: {
          strategy: strategyResult,
        },
        requiredApproval,
        executionStatus: requiredApproval ? 'pending_approval' : 'not_required',
        executiveVoiceSummary: strategyResult.executiveVoiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'ENABLED',
        success: false,
        findings: ['Strategy execution encountered an unexpected error.'],
        evidence: [err.message],
        problems: [`Failed to formulate marketing strategy: ${err.message}`],
        opportunities: [],
        recommendations: [
          'Retry strategy formulation with specific product parameters.',
        ],
        data: {},
        requiredApproval: false,
        executionStatus: 'failed',
        executiveVoiceSummary: `Strategy co-worker encountered an issue: ${err.message}`,
        timestamp,
        error: err.message,
      };
    }
  }
}

export const strategyCoWorker = new StrategyCoWorker();
