jest.mock('server-only', () => ({}));

const mockReviews = [
  {
    id: 'rev_1',
    product_id: 'prod_1',
    rating: 5,
    title: 'Looks like solid heirloom gold!',
    comment: 'The 22K gold color is stunning. Wore it to a wedding and got so many compliments. Packaging is luxurious.',
    verified_purchase: true,
  },
  {
    id: 'rev_2',
    product_id: 'prod_1',
    rating: 5,
    title: 'Zero tarnishing after 2 months',
    comment: 'Really surprised by the anti-tarnish coating. Held up through sweat and perfumes flawlessly.',
    verified_purchase: true,
  },
  {
    id: 'rev_3',
    product_id: 'prod_2',
    rating: 3,
    title: 'Pretty but clasp was stiff',
    comment: 'The pendant is gorgeous, but the lobster clasp is very tight and tricky to open with long nails.',
    verified_purchase: true,
  },
];

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: mockReviews,
      error: null,
    })
  ),
};

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue(mockQueryBuilder),
  }),
}));

import { ReviewFeedbackWorker } from '../worker-10-review';

describe('Worker 10: Review & Feedback Worker', () => {
  let worker: ReviewFeedbackWorker;

  beforeEach(() => {
    worker = new ReviewFeedbackWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_review_feedback');
    expect(worker.name).toBe('Review & Feedback Worker');
    expect(worker.priority).toBe('MEDIUM');

    const def = worker.getDefinition();
    expect(def.role).toContain('Sentiment & Product Quality');
    expect(def.responsibilities).toContain(
      'Extract recurring manufacturing, packaging, and wear-and-tear defect patterns'
    );
  });

  it('mines customer sentiment, extracts praises, and highlights defect themes', async () => {
    const output = await worker.execute({
      task: 'Analyze customer reviews and report quality feedback',
    });

    expect(output.workerId).toBe('worker_review_feedback');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.data?.analysis).toBeDefined();

    const analysis = output.data?.analysis;
    expect(analysis.averageRating).toBeGreaterThanOrEqual(4.0);
    expect(analysis.praiseThemes.length).toBeGreaterThan(0);
    expect(analysis.defectThemes.some((d: any) => d.defect.includes('clasp'))).toBe(true);

    expect(output.problems.length).toBeGreaterThan(0);
    expect(output.recommendations.some((r) => r.includes('clasp'))).toBe(true);
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
    expect(output.executiveVoiceSummary).toContain('sentiment is exceptionally strong');
  });

  it('handles database error gracefully', async () => {
    mockQueryBuilder.limit.mockImplementationOnce(() =>
      Promise.resolve({
        data: null,
        error: { message: 'Reviews table query failed' },
      })
    );

    const output = await worker.execute({
      task: 'Check reviews',
    });

    expect(output.workerId).toBe('worker_review_feedback');
    expect(output.findings.length).toBeGreaterThan(0);
  });
});
