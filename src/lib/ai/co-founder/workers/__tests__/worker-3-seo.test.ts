jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/seo-health', () => ({
  auditCatalogSeoHealth: jest.fn().mockResolvedValue({
    seoScore: 74,
    totalProductsAudited: 45,
    missingMetaDescriptionCount: 12,
    missingAltTextCount: 8,
    shortTitleCount: 5,
    duplicateTitlesCount: 0,
    healthyProductsCount: 20,
  }),
}));

import { SeoWorker } from '../worker-3-seo';

describe('Worker 3: SEO Worker', () => {
  let worker: SeoWorker;

  beforeEach(() => {
    worker = new SeoWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_seo');
    expect(worker.name).toBe('SEO Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Technical SEO');
    expect(def.responsibilities).toContain(
      'Validate Structured Data (JSON-LD Product, BreadcrumbList, Organization)'
    );
    expect(def.requiredSkills).toContain('Structured Data (JSON-LD)');
  });

  it('successfully executes a catalog SEO audit and returns structured output', async () => {
    const output = await worker.execute({
      task: 'Audit store technical SEO and identify keyword opportunities',
    });

    expect(output.workerId).toBe('worker_seo');
    expect(output.findings[0]).toContain('74/100');
    expect(output.problems.length).toBeGreaterThan(0);
    expect(output.problems[0]).toContain('12 products are missing custom meta descriptions');
    expect(output.opportunities.length).toBeGreaterThanOrEqual(3);
    expect(output.opportunities.some((o) => o.includes('anti tarnish'))).toBe(true);
    expect(output.recommendations.some((r) => r.includes('JSON-LD'))).toBe(true);
    expect(output.priority).toBe('high');
    expect(output.executiveVoiceSummary).toContain('74 out of 100');
  });

  it('elevates priority to critical when SEO score is critically low', async () => {
    const { auditCatalogSeoHealth } = require('@/lib/ai/co-founder/seo-health');
    auditCatalogSeoHealth.mockResolvedValueOnce({
      seoScore: 48,
      totalProductsAudited: 50,
      missingMetaDescriptionCount: 35,
      missingAltTextCount: 30,
      shortTitleCount: 20,
      duplicateTitlesCount: 5,
      healthyProductsCount: 5,
    });

    const output = await worker.execute({
      task: 'Check site SEO health',
    });

    expect(output.priority).toBe('critical');
    expect(output.findings[0]).toContain('48/100');
  });

  it('handles SEO audit exception gracefully', async () => {
    const { auditCatalogSeoHealth } = require('@/lib/ai/co-founder/seo-health');
    auditCatalogSeoHealth.mockRejectedValueOnce(new Error('Catalog DB read error'));

    const output = await worker.execute({
      task: 'Audit SEO',
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.problems[0]).toContain('Catalog DB read error');
  });
});
