jest.mock('server-only', () => ({}));

jest.mock('../playwright', () => ({
  browseWebPageWithPlaywright: jest.fn().mockResolvedValue({
    url: 'https://giva.co',
    status: 200,
    title: 'GIVA Jewellery - Silver and Gold Collection',
    headings: ['Waterproof Gold Necklaces', 'Best Selling Rings'],
    textContent:
      'Explore 18K gold and 925 silver jewellery with 30 day return.',
    detectedPrices: ['₹1,899', '₹3,499'],
    keyHighlights: ['Silver Plating', 'Fast Delivery'],
    executiveVoiceSummary: 'Giva pricing ranges from ₹1,899 to ₹3,499.',
  }),
}));

import {
  scrapeCompetitorWithScrapling,
  SCRAPLING_RESEARCH_MANDATE,
} from '../scrapling';

describe('Scrapling Stealth Scraping Engine', () => {
  it('defines the Scrapling research mandate with adaptive parsing and Cloudflare bypass', () => {
    expect(SCRAPLING_RESEARCH_MANDATE).toContain('ADAPTIVE PARSING');
    expect(SCRAPLING_RESEARCH_MANDATE).toContain('CLOUDFLARE TURNSTILE');
    expect(SCRAPLING_RESEARCH_MANDATE).toContain('AI-TARGETED CLEAN MARKDOWN');
  });

  it('scrapes competitor URL and returns structured browse result with pricing and headings', async () => {
    const result = await scrapeCompetitorWithScrapling({
      url: 'https://giva.co',
      timeoutMs: 10000,
      solveCloudflare: true,
      aiTargeted: true,
    });

    expect(result.url).toBe('https://giva.co');
    expect(result.status).toBe(200);
    expect(result.title).toContain('GIVA Jewellery');
    expect(result.detectedPricing).toContain('₹1,899');
    expect(result.headings.h1.length).toBeGreaterThan(0);
    expect(result.engine).toBeDefined();
  });

  it('auto-prepends https:// when given domain without protocol', async () => {
    const result = await scrapeCompetitorWithScrapling({
      url: 'palmonas.com',
      timeoutMs: 5000,
    });

    expect(result.url).toBe('https://palmonas.com');
  });
});
