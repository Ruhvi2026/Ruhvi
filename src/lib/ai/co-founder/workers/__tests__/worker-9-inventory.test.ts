jest.mock('server-only', () => ({}));

const mockInventory = [
  {
    id: 'prod_1',
    name: 'Choker Necklace',
    sku: 'CHK-01',
    stock_quantity: 0,
    price: 4999,
    status: 'active',
  },
  {
    id: 'prod_2',
    name: 'Pearl Drop Earrings',
    sku: 'PDE-02',
    stock_quantity: 3,
    price: 2499,
    status: 'active',
  },
  {
    id: 'prod_3',
    name: 'Filigree Bangles',
    sku: 'FB-03',
    stock_quantity: 18,
    price: 3999,
    status: 'active',
  },
];

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: mockInventory,
      error: null,
    })
  ),
};

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue(mockQueryBuilder),
  }),
}));

import { InventoryWorker } from '../worker-9-inventory';

describe('Worker 9: Inventory Worker', () => {
  let worker: InventoryWorker;

  beforeEach(() => {
    worker = new InventoryWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_inventory');
    expect(worker.name).toBe('Inventory Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Supply Chain & Inventory');
    expect(def.responsibilities).toContain(
      'Real-time catalog stock monitoring across all jewellery SKUs'
    );
  });

  it('detects out-of-stock emergency and low-stock SKUs with restock recommendations', async () => {
    const output = await worker.execute({
      task: 'Check catalog stock levels and identify reorder needs',
    });

    expect(output.workerId).toBe('worker_inventory');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.problems.some((p) => p.includes('Emergency: 1 SKUs are out of stock'))).toBe(true);
    expect(output.problems.some((p) => p.includes('Imminent Stockout Risk'))).toBe(true);

    const summary = output.data?.summary;
    expect(summary.totalSkus).toBe(3);
    expect(summary.outOfStockCount).toBe(1);
    expect(summary.lowStockCount).toBe(1);
    expect(summary.healthyCount).toBe(1);
    expect(summary.totalUnitsToOrder).toBeGreaterThan(20);

    expect(output.priority).toBe('critical'); // out of stock present
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
    expect(output.executiveVoiceSummary).toContain('Inventory health check complete');
  });

  it('requires explicit approval when stock updates or inventory adjustments are requested', async () => {
    const output = await worker.execute({
      task: 'Update stock quantity for SKU CHK-01 to 25 units',
    });

    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.requiredAction).toContain('Apply inventory stock adjustment');
  });

  it('handles database error gracefully', async () => {
    mockQueryBuilder.limit.mockImplementationOnce(() =>
      Promise.resolve({
        data: null,
        error: { message: 'Database query timeout on products table' },
      })
    );

    const output = await worker.execute({
      task: 'Check stock',
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.problems[0]).toContain('Database query timeout');
  });
});
