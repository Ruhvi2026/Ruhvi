jest.mock('server-only', () => ({}));

const mockProducts = [
  {
    id: 'prod_1',
    name: 'Royal Bengal Choker',
    sku: 'RBC-001',
    slug: 'royal-bengal-choker',
    price: 4999,
    mrp: 6999,
    stock_quantity: 4, // low stock
    status: 'active',
    description: 'A classic 22K gold plated handcrafted choker necklace with anti-tarnish coating.',
  },
  {
    id: 'prod_2',
    name: 'Lotus Stud Earrings',
    sku: 'LSE-002',
    slug: 'lotus-stud-earrings',
    price: 1999,
    mrp: 2999,
    stock_quantity: 0, // out of stock
    status: 'active',
    description: 'Gold stud.', // thin description (< 80 chars)
  },
  {
    id: 'prod_3',
    name: 'Filigree Bangle Set',
    sku: 'FBS-003',
    slug: 'filigree-bangle-set',
    price: 3499,
    mrp: 4999,
    stock_quantity: 12,
    status: 'active',
    description: 'Intricately handcrafted filigree bangles dipped in authentic 22K gold with high gloss finish and durability for festive occasions.',
  },
];

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: mockProducts,
      error: null,
    })
  ),
};

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue(mockQueryBuilder),
  }),
}));

import { ProductWorker } from '../worker-4-product';

describe('Worker 4: Product Worker', () => {
  let worker: ProductWorker;

  beforeEach(() => {
    worker = new ProductWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_product');
    expect(worker.name).toBe('Product Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Product & Merchandising');
    expect(def.responsibilities).toContain(
      'Audit description quality, care instructions, and material specifications'
    );
  });

  it('analyzes catalog health and detects thin descriptions and stockouts', async () => {
    const output = await worker.execute({
      task: 'Analyze catalog presentation and identify products needing description enrichment',
    });

    expect(output.workerId).toBe('worker_product');
    expect(output.findings[0]).toContain('3 products');
    expect(output.problems.some((p) => p.includes('thin descriptions'))).toBe(true);
    expect(output.problems.some((p) => p.includes('out of stock'))).toBe(true);
    expect(output.data?.enrichedCopySample).toBeDefined();
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
    expect(output.executiveVoiceSummary).toContain('Product catalog analysis complete');
  });

  it('requires explicit approval when catalog mutations or price changes are requested', async () => {
    const output = await worker.execute({
      task: 'Update product prices and publish new descriptions to live store',
    });

    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.requiredAction).toContain('Publish enriched descriptions');
  });

  it('handles database error gracefully', async () => {
    mockQueryBuilder.limit.mockImplementationOnce(() =>
      Promise.resolve({
        data: null,
        error: { message: 'Database connection terminated' },
      })
    );

    const output = await worker.execute({
      task: 'Audit catalog',
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.problems[0]).toContain('Database connection terminated');
  });
});
