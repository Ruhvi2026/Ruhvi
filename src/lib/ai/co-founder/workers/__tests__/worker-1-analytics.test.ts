jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      timeframeLabel: 'Last 30 Days',
      startDate: '2026-09-04',
      endDate: '2026-10-04',
      totalRevenue: 245000,
      totalOrders: 68,
      aov: 3602,
      completedOrders: 58,
      cancelledOrders: 10,
      cancellationRate: 14.7,
      uniqueCustomers: 52,
    },
    comparison: {
      baselineRevenue: 210000,
      baselineOrders: 60,
      revenueGrowthPercent: 16.7,
      orderGrowthPercent: 13.3,
    },
    insights: {
      anomalies: [],
      executiveVoiceSummary:
        'Over the last 30 days, we generated ₹2,45,000 across 68 orders with an AOV of ₹3,602, up 16.7% vs baseline.',
    },
  }),
}));

jest.mock('@/lib/ai/co-founder/business-intelligence', () => ({
  runBusinessIntelligenceScan: jest.fn().mockResolvedValue({
    problems: [],
    risks: [],
    anomalies: [],
    opportunities: [
      {
        id: 'opp_1',
        title: 'Choker Cross-Sell Opportunity',
        potentialRevenueUpside: 35000,
        recommendedAction:
          'Bundle choker with matching earrings for 10% discount',
      },
    ],
    summary: {
      totalOpportunityUpside: 35000,
      criticalProblemsCount: 0,
      highRisksCount: 0,
    },
  }),
}));

import { getStoreAnalytics } from '@/lib/ai/co-founder/analytics';
import { AnalyticsPerformanceWorker } from '../worker-1-analytics';

describe('Worker 1: Analytics & Performance Worker', () => {
  let worker: AnalyticsPerformanceWorker;

  beforeEach(() => {
    worker = new AnalyticsPerformanceWorker();
  });

  it('correctly reports worker identity, role, and definition', () => {
    expect(worker.id).toBe('worker_analytics_performance');
    expect(worker.name).toBe('Analytics & Performance Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.id).toBe('worker_analytics_performance');
    expect(def.role).toContain('Data Scientist');
    expect(def.responsibilities.length).toBeGreaterThan(3);
    expect(def.requiredSkills).toContain('Statistical analysis');
    expect(def.isSystemWorker).toBe(false);
  });

  it('successfully executes an analytical task and returns structured output', async () => {
    const output = await worker.execute({
      task: 'Analyze 30d revenue and conversion health',
      timeframe: '30d',
    });

    expect(output.workerId).toBe('worker_analytics_performance');
    expect(output.workerName).toBe('Analytics & Performance Worker');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.findings[0]).toContain('₹2,45,000');
    expect(output.findings[1]).toContain('+16.7%');
    expect(output.opportunities.length).toBeGreaterThan(0);
    expect(output.opportunities[0]).toContain('Choker Cross-Sell');
    expect(output.recommendations.length).toBeGreaterThan(0);
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
    expect(output.executiveVoiceSummary).toContain('₹2,45,000');
    expect(output.verification).toBeTruthy();
  });

  it('detects high cancellation rates and flags as high/critical priority', async () => {
    (getStoreAnalytics as jest.Mock).mockResolvedValueOnce({
      currentPeriod: {
        timeframeLabel: 'Last 7 Days',
        startDate: '2026-09-27',
        endDate: '2026-10-04',
        totalRevenue: 50000,
        totalOrders: 20,
        aov: 2500,
        completedOrders: 14,
        cancelledOrders: 6,
        cancellationRate: 30.0, // > 25% critical
        uniqueCustomers: 15,
      },
      comparison: null,
      insights: {
        anomalies: [
          {
            metric: 'cancellationRate',
            currentValue: 30,
            expectedBaseline: 10,
            deviationPercent: 200,
            severity: 'critical',
          },
        ],
        executiveVoiceSummary: 'Alert: Cancellation rate spiked to 30%.',
      },
    });

    const output = await worker.execute({
      task: 'Check conversion and cancellation anomalies',
      timeframe: '7d',
    });

    expect(output.priority).toBe('critical');
    expect(output.problems.some((p) => p.includes('cancellation rate'))).toBe(
      true
    );
    expect(
      output.recommendations.some((r) => r.includes('root-cause investigation'))
    ).toBe(true);
  });

  it('handles backend failures gracefully without crashing', async () => {
    (getStoreAnalytics as jest.Mock).mockRejectedValueOnce(
      new Error('Supabase database timeout')
    );

    const output = await worker.execute({
      task: 'Check store metrics',
      timeframe: 'today',
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.problems[0]).toContain('Supabase database timeout');
    expect(output.executiveVoiceSummary).toContain('Supabase database timeout');
  });
});
