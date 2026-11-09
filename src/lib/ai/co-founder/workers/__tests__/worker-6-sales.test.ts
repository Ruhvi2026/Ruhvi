jest.mock('server-only', () => ({}));

const mockSupabaseSelect = jest.fn();
const mockSupabaseFrom = jest.fn(() => ({
  select: mockSupabaseSelect,
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

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

  it('strictly omits benchmark multipliers when visitor telemetry has missing cart/checkout counts', async () => {
    (getStoreAnalytics as jest.Mock).mockResolvedValueOnce({
      currentPeriod: {
        totalVisitors: 5000,
        totalCarts: null, // missing cart telemetry
        totalCheckouts: null, // missing checkout telemetry
        totalOrders: 100,
        completedOrders: 90,
        cancelledOrders: 10,
        cancellationRate: 10.0,
        aov: 3500,
        totalRevenue: 350000,
      },
    });

    const output = await worker.execute({
      task: 'Analyze checkout funnel with partial telemetry',
      timeframe: '30d',
    });

    const funnel = output.data?.funnel;
    expect(funnel).toBeDefined();
    // Visitors is measured
    expect(funnel[0].stage).toBe('Store Visitors');
    expect(funnel[0].count).toBe(5000);
    expect(funnel[0].status).toBe('measured');

    // Cart is unavailable (no synthetic 5% multiplier)
    expect(funnel[1].stage).toBe('Added to Cart');
    expect(funnel[1].count).toBeNull();
    expect(funnel[1].status).toBe('unavailable');

    // Checkout is unavailable (no synthetic 50% multiplier)
    expect(funnel[2].stage).toBe('Initiated Checkout');
    expect(funnel[2].count).toBeNull();
    expect(funnel[2].status).toBe('unavailable');

    // Orders placed is measured
    expect(funnel[3].stage).toBe('Orders Placed');
    expect(funnel[3].count).toBe(100);
    expect(funnel[3].status).toBe('measured');
  });

  it('computes payment failure telemetry and COD vs Prepaid ratios from orders', async () => {
    mockSupabaseSelect.mockReturnValueOnce({
      limit: jest.fn().mockResolvedValueOnce({
        data: [
          { payment_method: 'phonepe', payment_status: 'paid' },
          { payment_method: 'phonepe', payment_status: 'paid' },
          { payment_method: 'cod', payment_status: 'pending' },
          { payment_method: 'phonepe', payment_status: 'failed' },
        ],
        error: null,
      }),
    });

    const output = await worker.execute({
      task: 'Check sales conversion and payment telemetry',
      timeframe: '30d',
    });

    expect(output.data?.paymentTelemetry).toBeDefined();
    expect(output.data?.paymentTelemetry.prepaidOrdersCount).toBe(3);
    expect(output.data?.paymentTelemetry.codOrdersCount).toBe(1);
    expect(output.data?.paymentTelemetry.failedPaymentsCount).toBe(1);
    expect(output.data?.paymentTelemetry.paymentFailureRate).toBe(25);
    expect(
      output.findings.some((f: string) => f.includes('Payment Telemetry'))
    ).toBe(true);
  });
});
