jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      aov: 3850,
      totalRevenue: 280000,
      totalOrders: 72,
    },
  }),
}));

jest.mock('@/lib/ai/co-founder/competitors', () => ({
  getCompetitors: jest.fn().mockResolvedValue([
    {
      id: 'comp_1',
      name: 'Giva Jewellery',
      website_url: 'https://giva.co',
      market_positioning: 'Silver & demi-fine mass market',
    },
  ]),
}));

import { MarketingWorker } from '../worker-2-marketing';

describe('Worker 2: Marketing Worker', () => {
  let worker: MarketingWorker;

  beforeEach(() => {
    worker = new MarketingWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_marketing');
    expect(worker.name).toBe('Marketing Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Marketing Director');
    expect(def.responsibilities).toContain('Multi-angle ad copy generation (Meta, Google, WhatsApp, Email)');
    expect(def.requiredSkills).toContain('Visual art direction');
  });

  it('generates high-converting ad angles, visual image direction, and video storyboard', async () => {
    const output = await worker.execute({
      task: 'Create Diwali campaign ad copy and video reel concept',
    });

    expect(output.workerId).toBe('worker_marketing');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.data?.creativeBrief).toBeDefined();

    const brief = output.data?.creativeBrief;
    expect(brief.angles.length).toBeGreaterThanOrEqual(2);
    expect(brief.angles[0].hook).toBeTruthy();
    expect(brief.angles[0].headline).toBeTruthy();
    expect(brief.visualImageDirection.prompt).toContain('gold');
    expect(brief.videoStoryboard.scenes.length).toBe(3);

    // Checks missing capability is transparently declared per Step 0.3
    expect(output.missingCapabilities?.some((c) => c.includes('Direct Video Rendering'))).toBe(true);
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
  });

  it('requires explicit approval when coupon or discount promotions are requested', async () => {
    const output = await worker.execute({
      task: 'Create discount campaign with a 15% coupon for festive shoppers',
    });

    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.recommendations.some((r) => r.includes('RUHVI500') || r.includes('coupon'))).toBe(true);
    expect(output.executiveVoiceSummary).toContain('Awaiting your approval');
  });

  it('handles external dependency failure gracefully', async () => {
    const { getStoreAnalytics } = require('@/lib/ai/co-founder/analytics');
    getStoreAnalytics.mockRejectedValueOnce(new Error('Analytics service unreachable'));

    // Should not crash, competitor and fallbacks should work
    const output = await worker.execute({
      task: 'Draft ad copy',
    });

    expect(output.workerId).toBe('worker_marketing');
    expect(output.findings.length).toBeGreaterThan(0);
  });
});
