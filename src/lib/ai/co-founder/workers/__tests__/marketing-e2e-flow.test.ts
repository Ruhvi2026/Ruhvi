jest.mock('server-only', () => ({}));

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        const stream = {
          end: (buffer: Buffer) => {
            callback(null, {
              secure_url: `https://res.cloudinary.com/io1kkukg/video/upload/v123456789/marketing/campaigns/${options.public_id || 'flow_clip_1'}.mp4`,
              public_id: options.public_id || 'marketing/flow_clip_1',
              format: 'mp4',
              duration: 8.5,
              bytes: buffer.length || 1024,
              width: 1080,
              height: 1920,
            });
          },
        };
        return stream;
      }),
    },
  },
}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: { aov: 3850, totalRevenue: 280000, totalOrders: 72 },
  }),
}));

jest.mock('@/lib/ai/co-founder/competitors', () => ({
  getCompetitors: jest.fn().mockResolvedValue([
    { id: 'comp_1', name: 'Giva Jewellery', website_url: 'https://giva.co' },
  ]),
}));

import { marketingWorker } from '../worker-2-marketing';
import { uploadMarketingVideoToCloudinary } from '../marketing/cloudinary-service';
import {
  createAndDispatchMediaJob,
  handleMediaJobCallback,
} from '../marketing/media-job-service';
import { metaAdsService } from '../marketing/meta-ads-service';

describe('Safe End-to-End Marketing Campaign Scenario (Section 31)', () => {
  it('executes the full end-to-end marketing lifecycle without real ad spend', async () => {
    // -----------------------------------------------------------------------
    // Stage 1: Co-Founder dispatches campaign creation request
    // -----------------------------------------------------------------------
    const task = 'Create an ad campaign for 22K Gold Plated Choker';
    const workerOutput = await marketingWorker.execute({ task });

    expect(workerOutput.workerId).toBe('worker_marketing');
    expect(workerOutput.findings.length).toBeGreaterThan(0);

    // -----------------------------------------------------------------------
    // Stage 2: Strategy Co-Worker formulation verified
    // -----------------------------------------------------------------------
    const strategy = workerOutput.data?.strategy;
    expect(strategy).toBeDefined();
    expect(strategy.angles.length).toBe(3);
    expect(strategy.budgetRecommendation.suggestedDailyBudgetInr).toBeGreaterThanOrEqual(1500);

    // -----------------------------------------------------------------------
    // Stage 3: Creative Media Co-Worker two-video continuous prompts verified
    // -----------------------------------------------------------------------
    const creative = workerOutput.data?.creativeMedia;
    expect(creative).toBeDefined();
    const { video1Prompt, video2Prompt, continuityInstructions } = creative.twoVideoFlow;
    expect(video1Prompt.visualPrompt).toBeTruthy();
    expect(video2Prompt.visualPrompt).toBeTruthy();
    expect(continuityInstructions.sharedClothingDescription).toBeTruthy();

    // -----------------------------------------------------------------------
    // Stage 4: User generates videos in Flow and uploads Video 1 & Video 2
    // -----------------------------------------------------------------------
    const upload1 = await uploadMarketingVideoToCloudinary(Buffer.from('flow_clip_1_data'), {
      campaignId: 'cmp_e2e_test',
      clipIndex: 1,
      fileName: 'flow_1.mp4',
    });
    const upload2 = await uploadMarketingVideoToCloudinary(Buffer.from('flow_clip_2_data'), {
      campaignId: 'cmp_e2e_test',
      clipIndex: 2,
      fileName: 'flow_2.mp4',
    });

    expect(upload1.secureUrl).toContain('cloudinary.com');
    expect(upload2.secureUrl).toContain('cloudinary.com');

    // -----------------------------------------------------------------------
    // Stage 5: Async Media Job dispatched to n8n webhook
    // -----------------------------------------------------------------------
    const mediaJob = await createAndDispatchMediaJob({
      campaignId: 'cmp_e2e_test',
      taskId: 'task_e2e_01',
      video1Url: upload1.secureUrl,
      video2Url: upload2.secureUrl,
      voiceoverLanguage: 'bengali',
      voiceoverScript: creative.voiceover.bengali.script,
    });

    expect(mediaJob.jobId).toBeTruthy();

    // -----------------------------------------------------------------------
    // Stage 6: n8n FFmpeg completion callback returns final video URL
    // -----------------------------------------------------------------------
    const finalCallback = await handleMediaJobCallback({
      jobId: mediaJob.jobId,
      status: 'COMPLETED',
      finalVideoUrl: 'https://res.cloudinary.com/ruhvi-demo/video/upload/final_stitched_reel.mp4',
      finalPublicId: 'marketing/final/final_stitched_reel',
    });

    expect(finalCallback.success).toBe(true);
    expect(finalCallback.job?.outputAsset?.analysis?.status).toBe('PASS');

    // -----------------------------------------------------------------------
    // Stage 7: Ads Execution Co-Worker registers draft campaign in PAUSED state
    // -----------------------------------------------------------------------
    const adsExecution = workerOutput.data?.adsExecution;
    expect(adsExecution).toBeDefined();
    expect(adsExecution.campaignDraft.status).toBe('DRAFT');
    expect(adsExecution.approvalRequired).toBe(true);

    // -----------------------------------------------------------------------
    // Stage 8: Explicit Founder Approval Gate & Safe Publishing Mock
    // -----------------------------------------------------------------------
    const approvalId = 'app_e2e_verified_123';
    const publishResult = await metaAdsService.activateApprovedCampaign({
      metaCampaignId: adsExecution.campaignDraft.campaignId,
      approvalId,
      approvedBy: 'founder_super_admin',
    });

    expect(publishResult.success).toBe(true);
    expect(publishResult.status).toBe('ACTIVE');
    expect(publishResult.publishedAt).toBeTruthy();
  }, 30000);
});
