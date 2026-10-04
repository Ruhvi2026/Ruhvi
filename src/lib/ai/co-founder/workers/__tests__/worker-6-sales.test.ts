jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      timeframeLabel: 'Last 30 Days',
      totalRevenue: 280000,
      totalOrders: 70,
      completedOrders: 56,
      cancelledOrders: 14,
      cancellationRate: 20.0,
      aov: 4000,
    },
  }),
}));

import { getStoreAnalytics } from '@/lib/ai/co-founder/analytics';
import { SalesConversionWorker } from '../worker-6-sales';

describe('Worker 6: Sales & Conversion Worker', () => {
  let worker: SalesConversionWorker;

  beforeEach(() => {
    worker = new SalesConversionWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_sales_conversion');
    expect(worker.name).toBe('Sales & Conversion Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Conversion Rate Optimization');
    expect(def.responsibilities).toContain(
      'Analyze visitors-to-checkout conversion funnel and identify drop-off stages'
    );
    expect(def.requiredSkills).toContain('Funnel conversion analysis');
  });

  it('computes multi-stage e-commerce funnel and identifies checkout drop-off', async () => {
    const output = await worker.execute({
      task: 'Analyze checkout funnel and recommend CRO improvements',
      timeframe: '30d',
    });

    expect(output.workerId).toBe('worker_sales_conversion');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.data?.funnel.length).toBe(5);

    const funnel = output.data?.funnel;
    expect(funnel[0].stage).toBe('Store Visitors');
    expect(funnel[1].stage).toBe('Added to Cart');
    expect(funnel[2].stage).toBe('Initiated Checkout');
    expect(funnel[3].stage).toBe('Orders Placed');

    expect(output.problems.length).toBeGreaterThan(0);
    expect(output.opportunities.some((o) => o.includes('UPI'))).toBe(true);
    expect(output.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(
      output.recommendations.some(
        (r) => r.includes('Express Checkout') || r.includes('UPI')
      )
    ).toBe(true);
    expect(output.executiveVoiceSummary).toContain('Overall store conversion');
  });

  it('handles backend analytics failure gracefully', async () => {
    (getStoreAnalytics as jest.Mock).mockRejectedValueOnce(
      new Error('Orders table read timeout')
    );

    const output = await worker.execute({
      task: 'Check conversion rate',
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.problems[0]).toContain('Orders table read timeout');
  });
});
