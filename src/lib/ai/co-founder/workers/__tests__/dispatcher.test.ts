jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/approvals', () => ({
  requestApproval: jest.fn().mockResolvedValue({
    id: 'app_mock_123',
    status: 'pending',
  }),
}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      totalRevenue: 250000,
      totalOrders: 60,
      aov: 4166,
      completedOrders: 50,
      cancelledOrders: 10,
      cancellationRate: 16.7,
      timeframeLabel: 'Last 30 Days',
    },
    comparison: null,
    insights: {
      anomalies: [],
      executiveVoiceSummary: 'Store analytics overview ready.',
    },
  }),
}));

import { dispatchWorkerTask, getWorkerRegistryStatus } from '../dispatcher';
import { workerRegistry } from '../registry';

describe('AI Co-Founder Dynamic Worker Dispatcher & Registry', () => {
  it('registers all 12 specialized AI Agent Workers', () => {
    const status = getWorkerRegistryStatus();
    expect(status.totalWorkers).toBe(12);

    const workerIds = status.workers.map((w) => w.id);
    expect(workerIds).toEqual([
      'worker_analytics_performance',
      'worker_marketing',
      'worker_seo',
      'worker_product',
      'worker_competitor_research',
      'worker_sales_conversion',
      'worker_customer_support',
      'worker_content_blog',
      'worker_inventory',
      'worker_review_feedback',
      'worker_execution',
      'worker_monitoring_verification',
    ]);
  });

  it('dynamically routes tasks based on natural language queries', () => {
    expect(workerRegistry.findWorkerForTask('Analyze revenue and conversions').id).toBe(
      'worker_analytics_performance'
    );
    expect(workerRegistry.findWorkerForTask('Draft Diwali ad copy and video reel').id).toBe(
      'worker_marketing'
    );
    expect(workerRegistry.findWorkerForTask('Audit catalog technical SEO and schema').id).toBe(
      'worker_seo'
    );
    expect(workerRegistry.findWorkerForTask('Enrich product catalog descriptions').id).toBe(
      'worker_product'
    );
    expect(workerRegistry.findWorkerForTask('Check competitor pricing on https://giva.co').id).toBe(
      'worker_competitor_research'
    );
    expect(workerRegistry.findWorkerForTask('Audit checkout drop-off and cart abandonment').id).toBe(
      'worker_sales_conversion'
    );
    expect(workerRegistry.findWorkerForTask('Check support ticket backlog and shipping delays').id).toBe(
      'worker_customer_support'
    );
    expect(workerRegistry.findWorkerForTask('Write a blog article on jewellery care').id).toBe(
      'worker_content_blog'
    );
    expect(workerRegistry.findWorkerForTask('Check warehouse low stock and reorder needs').id).toBe(
      'worker_inventory'
    );
    expect(workerRegistry.findWorkerForTask('Analyze customer reviews and ratings').id).toBe(
      'worker_review_feedback'
    );
    expect(workerRegistry.findWorkerForTask('Execute approved action').id).toBe(
      'worker_execution'
    );
    expect(workerRegistry.findWorkerForTask('Verify outcome and monitor regressions').id).toBe(
      'worker_monitoring_verification'
    );
  });

  it('dispatches task to worker, synthesizes Co-Founder analysis, and returns executive voice summary', async () => {
    const dispatch = await dispatchWorkerTask('auto', {
      task: 'Analyze revenue and check conversion drop-offs for 30d',
    });

    expect(dispatch.workerId).toBe('worker_analytics_performance');
    expect(dispatch.workerName).toBe('Analytics & Performance Worker');
    expect(dispatch.result.findings.length).toBeGreaterThan(0);
    expect(dispatch.coFounderAnalysis).toBeDefined();
    expect(dispatch.coFounderAnalysis.evidenceSummary).toBeTruthy();
    expect(dispatch.summaryForVoice).toBeTruthy();
  });

  it('triggers human-in-the-loop approval registration when worker action requires approval', async () => {
    const dispatch = await dispatchWorkerTask('worker_marketing', {
      task: 'Create discount campaign with a 15% coupon for festive shoppers',
    });

    expect(dispatch.workerId).toBe('worker_marketing');
    expect(dispatch.coFounderAnalysis.approvalRequired).toBe(true);
    expect(dispatch.coFounderAnalysis.pendingApprovalId).toBeTruthy();
  });
});
