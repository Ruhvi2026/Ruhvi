jest.mock('server-only', () => ({}));

import { salesConversionWorker } from '../worker-6-sales';
import { reviewWorker } from '../worker-10-review';
import { monitoringWorker } from '../worker-12-monitoring';
import { contentBlogWorker } from '../worker-8-content';
import { MetaAdsService } from '../marketing/meta-ads-service';
import * as analyticsModule from '@/lib/ai/co-founder/analytics';
import * as outcomesModule from '@/lib/ai/co-founder/outcomes';
import * as supabaseService from '@/lib/supabase/service';

describe('Phase 1: Truthful Outputs & Zero-Fabrication Contract', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Worker 6: Sales & Conversion Truthful Funnel Contract', () => {
    it('marks pre-checkout stages UNAVAILABLE when web telemetry is absent and does not invent multipliers', async () => {
      jest.spyOn(analyticsModule, 'getStoreAnalytics').mockResolvedValueOnce({
        currentPeriod: {
          totalOrders: 10,
          completedOrders: 8,
          cancelledOrders: 2,
          cancellationRate: 20.0,
          aov: 3500,
          totalRevenue: 35000,
          // Note: totalVisitors, totalCarts, totalCheckouts are NOT provided
        },
      } as any);

      const output = await salesConversionWorker.execute({
        task: 'Audit conversion funnel',
      });

      expect(output.sourceMode).toBe('partial');
      const funnel = output.data?.funnel;
      expect(funnel).toBeDefined();

      // Stage 0: Store Visitors must be unavailable, NOT 10 * 35 = 350 or 1500
      expect(funnel[0].stage).toBe('Store Visitors');
      expect(funnel[0].status).toBe('unavailable');
      expect(funnel[0].count).toBeNull();
      expect(funnel[0].conversionRatePercent).toBeNull();

      // Stage 1: Added to Cart must be unavailable
      expect(funnel[1].stage).toBe('Added to Cart');
      expect(funnel[1].status).toBe('unavailable');
      expect(funnel[1].count).toBeNull();

      // Stage 3: Orders Placed must be measured from authoritative database
      expect(funnel[3].stage).toBe('Orders Placed');
      expect(funnel[3].status).toBe('measured');
      expect(funnel[3].count).toBe(10);
    });

    it('returns INSUFFICIENT_DATA when zero orders and zero web sessions exist', async () => {
      jest.spyOn(analyticsModule, 'getStoreAnalytics').mockResolvedValueOnce({
        currentPeriod: {
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          cancellationRate: 0,
          aov: 0,
          totalRevenue: 0,
        },
      } as any);

      const output = await salesConversionWorker.execute({
        task: 'Audit conversion funnel with 0 data',
      });

      expect(output.sourceMode).toBe('insufficient_data');
      expect(output.findings.some((f) => f.includes('INSUFFICIENT_DATA'))).toBe(
        true
      );
    });
  });

  describe('Worker 10: Review & Sentiment Zero-Fabrication Contract', () => {
    it('returns INSUFFICIENT_DATA and empty praise/defect themes when 0 reviews exist', async () => {
      const mockQueryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getServiceClient').mockReturnValue({
        from: jest.fn().mockReturnValue(mockQueryBuilder),
      } as any);

      const output = await reviewWorker.execute({
        task: 'Analyze reviews',
      });

      expect(output.sourceMode).toBe('insufficient_data');
      expect(output.data?.analysis.totalReviews).toBe(0);
      expect(output.data?.analysis.averageRating).toBe(0);
      expect(output.data?.analysis.praiseThemes).toEqual([]);
      expect(output.data?.analysis.defectThemes).toEqual([]);
      expect(output.executiveVoiceSummary).toContain('INSUFFICIENT_DATA');
    });
  });

  describe('Worker 12: Monitoring & Outcome Verification Truthful Contract', () => {
    it('returns INSUFFICIENT_DATA when getOutcomeAnalytics fails instead of returning 80% or 87.5%', async () => {
      jest
        .spyOn(outcomesModule, 'verifyDueActionPlanOutcomes')
        .mockResolvedValueOnce({
          verifiedCount: 0,
          plans: [],
        } as any);

      jest
        .spyOn(outcomesModule, 'getOutcomeAnalytics')
        .mockRejectedValueOnce(
          new Error('co_founder_outcomes table unreachable')
        );

      const output = await monitoringWorker.execute({
        task: 'Verify action plan outcomes',
      });

      expect(output.sourceMode).toBe('insufficient_data');
      expect(output.data?.verifiedActionsCount).toBe(0);
      expect(output.data?.successRatePercent).toBe(0);
      expect(output.findings.some((f) => f.includes('INSUFFICIENT_DATA'))).toBe(
        true
      );
      expect(output.executiveVoiceSummary).toContain('INSUFFICIENT_DATA');
    });
  });

  describe('Worker 8: Content Blog Measured Metrics Contract', () => {
    it('computes word count and keyword density dynamically from the generated markdown', async () => {
      const output = await contentBlogWorker.execute({
        task: 'Write blog article on anti-tarnish demi-fine jewellery',
      });

      expect(output.sourceMode).toBe('live');
      const article = output.data?.article;
      expect(article).toBeDefined();

      const measuredWordCount = article.markdownContent
        .trim()
        .split(/\s+/).length;
      expect(output.findings[0]).toContain(
        measuredWordCount.toLocaleString('en-IN')
      );
      expect(output.findings[0]).not.toContain('1,200-word'); // Must NOT claim fabricated 1200 words
    });
  });

  describe('Meta Ads Service Truthful & Fail-Closed Contract', () => {
    it('returns empty list in production when META_ADS_ACCESS_TOKEN is missing', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.META_ADS_ACCESS_TOKEN;

      const service = new MetaAdsService();
      const accounts = await service.getAdAccounts();
      const insights = await service.getCampaignInsights();

      expect(accounts).toEqual([]);
      expect(insights).toEqual([]);
    });

    it('fails closed in production when attempting to activate campaign without access token', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.META_ADS_ACCESS_TOKEN;

      const service = new MetaAdsService();
      await expect(
        service.activateApprovedCampaign({
          metaCampaignId: 'cmp_prod_01',
          approvalId: 'app_123',
          approvedBy: 'founder',
        })
      ).rejects.toThrow(/integration_not_configured/);
    });

    it('labels results as simulated in non-production environments', async () => {
      (process.env as any).NODE_ENV = 'test';
      delete process.env.META_ADS_ACCESS_TOKEN;

      const service = new MetaAdsService();
      const accounts = await service.getAdAccounts();
      const draft = await service.createCampaignDraft({
        campaignId: 'cmp_test_draft',
        campaignName: 'Test Draft Campaign',
        objective: 'OUTCOME_SALES',
        adSets: [],
        ads: [],
        risksAndWarnings: [],
        approvalStatus: 'PENDING_APPROVAL',
        totalDailyBudgetInr: 2000,
        status: 'DRAFT',
        isApprovalGated: true,
        canPublishImmediately: false,
      });

      expect(accounts[0].sourceMode).toBe('simulated');
      expect(draft.sourceMode).toBe('simulated');
    });
  });
});
