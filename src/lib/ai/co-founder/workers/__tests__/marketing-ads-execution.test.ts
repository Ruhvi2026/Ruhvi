jest.mock('server-only', () => ({}));

import { AdsExecutionCoWorker } from '../marketing/co-workers/ads-execution';
import { metaAdsService } from '../marketing/meta-ads-service';

describe('Marketing Co-Worker 3: Ads Execution Co-Worker', () => {
  let adsWorker: AdsExecutionCoWorker;

  beforeEach(() => {
    adsWorker = new AdsExecutionCoWorker();
  });

  it('declares identity, enabled status, and all 30 skills', () => {
    expect(adsWorker.id).toBe('marketing_ads_execution');
    expect(adsWorker.name).toBe('Ads Execution Co-worker');

    const def = adsWorker.getDefinition();
    expect(def.status).toBe('ENABLED');
    expect(def.skills.length).toBe(30);
    expect(def.skills).toContain('Campaign creation');
    expect(def.skills).toContain('Audience configuration');
    expect(def.skills).toContain('Campaign activation after approval');
  });

  it('creates Meta Ads campaign draft in PAUSED/DRAFT status with strict approval requirement', async () => {
    const output = await adsWorker.execute({
      task: 'Set up Meta Ads campaign for 22K Gold Plated Choker with ₹2,500 daily budget',
      budget: 2500,
    });

    expect(output.coWorkerId).toBe('marketing_ads_execution');
    expect(output.success).toBe(true);
    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');

    const draft = output.data.adsExecution!.campaignDraft;
    expect(draft).toBeDefined();
    expect(draft.status).toBe('DRAFT');
    expect(draft.totalDailyBudgetInr).toBe(2500);
    expect(draft.adSets.length).toBeGreaterThanOrEqual(2);
    expect(draft.ads.length).toBeGreaterThanOrEqual(2);
    expect(draft.isApprovalGated).toBe(true);
    expect(draft.canPublishImmediately).toBe(false);
  });

  it('prohibits live campaign activation without explicit approvalId in MetaAdsService', async () => {
    await expect(
      metaAdsService.activateApprovedCampaign({
        metaCampaignId: 'cmp_123',
        approvalId: '',
        approvedBy: 'admin',
      })
    ).rejects.toThrow('approvalId');
  });
});
