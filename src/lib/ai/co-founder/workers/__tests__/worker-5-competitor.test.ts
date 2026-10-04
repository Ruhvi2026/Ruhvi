jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/competitors', () => ({
  getCompetitors: jest.fn().mockResolvedValue([
    {
      id: 'comp_1',
      name: 'Giva Jewellery',
      website_url: 'https://giva.co',
      price_positioning: '₹1,500 - ₹3,500',
      strengths: ['Mass distribution', 'Silver range'],
      weaknesses: ['Thin plating', 'Lacks 6-month color warranty'],
    },
  ]),
}));

jest.mock('@/lib/ai/browser/playwright', () => ({
  browseWebPageWithPlaywright: jest.fn().mockResolvedValue({
    url: 'https://competitor.com',
    status: 200,
    title: 'Luxury Demi-Fine Jewellery Online',
    headings: {
      h1: ['Waterproof Gold Necklaces & Rings'],
    },
    detectedPricing: ['₹2,499', '₹3,999', '₹5,499'],
  }),
}));

import { browseWebPageWithPlaywright } from '@/lib/ai/browser/playwright';
import { CompetitorResearchWorker } from '../worker-5-competitor';

describe('Worker 5: Competitor Research Worker', () => {
  let worker: CompetitorResearchWorker;

  beforeEach(() => {
    worker = new CompetitorResearchWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_competitor_research');
    expect(worker.name).toBe('Competitor Research Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Competitive Intelligence');
    expect(def.responsibilities).toContain(
      'Strictly distinguish VERIFIED FACTS from INFERRED ASSUMPTIONS'
    );
  });

  it('crawls competitor URL and strictly partitions verified facts from inferences', async () => {
    const output = await worker.execute({
      task: 'Analyze competitor offering at https://competitor.com',
      parameters: { url: 'https://competitor.com' },
    });

    expect(output.workerId).toBe('worker_competitor_research');

    // Check VERIFIED items
    const verified = output.data?.verifiedInformation || [];
    expect(
      verified.some((v: string) =>
        v.includes('[VERIFIED] Successfully browsed competitor site')
      )
    ).toBe(true);
    expect(
      verified.some((v: string) =>
        v.includes('[VERIFIED] Primary Value Proposition')
      )
    ).toBe(true);
    expect(
      verified.some((v: string) =>
        v.includes('[VERIFIED] Live Extracted Price Points')
      )
    ).toBe(true);

    // Check INFERRED items
    const inferences = output.data?.assumptionsAndInferences || [];
    expect(inferences.some((i: string) => i.includes('[INFERENCE]'))).toBe(
      true
    );

    // Differentiation and recommendations
    expect(output.opportunities.length).toBeGreaterThan(0);
    expect(
      output.opportunities.some((o) => o.includes('Ruhvi Guarantee Advantage'))
    ).toBe(true);
    expect(output.executiveVoiceSummary).toContain(
      'Competitor analysis complete'
    );
  });

  it('works seamlessly using database competitor registry when no URL is provided', async () => {
    const output = await worker.execute({
      task: 'Provide competitive landscape overview in Indian demi-fine jewellery',
    });

    expect(output.workerId).toBe('worker_competitor_research');
    expect(output.findings.some((f) => f.includes('Giva Jewellery'))).toBe(
      true
    );
    expect(output.recommendations.length).toBeGreaterThan(0);
  });

  it('handles browser crawl errors gracefully and falls back to inference', async () => {
    (browseWebPageWithPlaywright as jest.Mock).mockRejectedValueOnce(
      new Error('Cloudflare Captcha Challenge')
    );

    const output = await worker.execute({
      task: 'Analyze https://blocked-competitor.com',
    });

    expect(output.workerId).toBe('worker_competitor_research');
    expect(
      output.findings.some((f) => f.includes('timed out or blocked'))
    ).toBe(true);
    expect(output.executionStatus).toBe('not_required');
  });
});
