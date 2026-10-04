jest.mock('server-only', () => ({}));

import { ContentBlogWorker } from '../worker-8-content';

describe('Worker 8: Content / Blog Worker', () => {
  let worker: ContentBlogWorker;

  beforeEach(() => {
    worker = new ContentBlogWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_content_blog');
    expect(worker.name).toBe('Content / Blog Worker');
    expect(worker.priority).toBe('MEDIUM');

    const def = worker.getDefinition();
    expect(def.role).toContain('Editor-in-Chief');
    expect(def.responsibilities).toContain(
      'Draft complete publication-ready blog posts in structured Markdown'
    );
  });

  it('generates complete publication-ready SEO blog post with internal links and image prompts', async () => {
    const output = await worker.execute({
      task: 'Write a comprehensive guide on anti-tarnish jewellery care and styling',
    });

    expect(output.workerId).toBe('worker_content_blog');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.data?.article).toBeDefined();

    const article = output.data?.article;
    expect(article.title).toBeTruthy();
    expect(article.markdownContent).toContain('# ');
    expect(article.markdownContent).toContain('22K');
    expect(article.markdownContent).toContain('Anti-Tarnish');
    expect(article.internalLinks.length).toBeGreaterThanOrEqual(2);
    expect(article.featuredImagePrompt).toContain('travertine');
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
    expect(output.executiveVoiceSummary).toContain('publication-ready SEO blog post');
  });

  it('requires explicit approval when requested to publish directly live', async () => {
    const output = await worker.execute({
      task: 'Publish article live on the blog',
    });

    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.requiredAction).toContain('Publish blog article');
  });
});
