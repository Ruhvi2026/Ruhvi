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

import {
  dispatchWorkerTask,
  getWorkerRegistryStatus,
  executeMultiWorkerPlan,
} from '../dispatcher';
import { workerRegistry } from '../registry';

describe('AI Co-Founder Dynamic Worker Dispatcher & Registry', () => {
  it('registers all 13 specialized AI Agent Workers', () => {
    const status = getWorkerRegistryStatus();
    expect(status.totalWorkers).toBe(13);

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
      'worker_orders_logistics',
    ]);
  });

  it('dynamically routes tasks based on natural language queries', () => {
    expect(
      workerRegistry.findWorkerForTask('Analyze revenue and conversions').id
    ).toBe('worker_analytics_performance');
    expect(
      workerRegistry.findWorkerForTask('Draft Diwali ad copy and video reel').id
    ).toBe('worker_marketing');
    expect(
      workerRegistry.findWorkerForTask('Audit catalog technical SEO and schema')
        .id
    ).toBe('worker_seo');
    expect(
      workerRegistry.findWorkerForTask('Enrich product catalog descriptions').id
    ).toBe('worker_product');
    expect(
      workerRegistry.findWorkerForTask(
        'Check competitor pricing on https://giva.co'
      ).id
    ).toBe('worker_competitor_research');
    expect(
      workerRegistry.findWorkerForTask(
        'Audit checkout drop-off and cart abandonment'
      ).id
    ).toBe('worker_sales_conversion');
    expect(
      workerRegistry.findWorkerForTask(
        'Check support ticket backlog and shipping delays'
      ).id
    ).toBe('worker_customer_support');
    expect(
      workerRegistry.findWorkerForTask('Write a blog article on jewellery care')
        .id
    ).toBe('worker_content_blog');
    expect(
      workerRegistry.findWorkerForTask(
        'Check warehouse low stock and reorder needs'
      ).id
    ).toBe('worker_inventory');
    expect(
      workerRegistry.findWorkerForTask('Analyze customer reviews and ratings')
        .id
    ).toBe('worker_review_feedback');
    expect(workerRegistry.findWorkerForTask('Execute approved action').id).toBe(
      'worker_execution'
    );
    expect(
      workerRegistry.findWorkerForTask('Verify outcome and monitor regressions')
        .id
    ).toBe('worker_monitoring_verification');
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

  describe('executeMultiWorkerPlan', () => {
    it('executes a single-domain plan directly through the planner pipeline', async () => {
      const planRes = await executeMultiWorkerPlan(
        'Analyze 30-day store revenue performance'
      );

      expect(planRes.status).toBe('COMPLETED');
      expect(planRes.intent).toBe('ANALYTICS');
      expect(planRes.stepsExecuted.length).toBe(1);
      expect(planRes.stepsExecuted[0].status).toBe('SUCCESS');
      expect(planRes.stepsExecuted[0].workerId).toBe(
        'worker_analytics_performance'
      );
      expect(planRes.summaryForVoice).toBeTruthy();
      expect(planRes.executiveSummary).toContain(
        'Analytics & Performance Worker'
      );
    });

    it('executes a composite growth audit across multiple stages with parallel execution', async () => {
      const planRes = await executeMultiWorkerPlan(
        'Run a complete growth audit on our store health'
      );

      expect(planRes.intent).toBe('GROWTH_AUDIT');
      expect(planRes.stagesCompleted).toBe(2);
      expect(planRes.totalStages).toBe(2);
      expect(planRes.stepsExecuted.length).toBe(5);

      const successSteps = planRes.stepsExecuted.filter(
        (s) => s.status === 'SUCCESS'
      );
      expect(successSteps.length).toBeGreaterThanOrEqual(4);
      expect(planRes.aggregatedFindings.length).toBeGreaterThan(0);
      expect(planRes.summaryForVoice).toBeTruthy();
    });

    it('pauses execution stage when an action requires human approval in INVENTORY_DEFENSE', async () => {
      const planRes = await executeMultiWorkerPlan(
        'Address emergency low stock crisis and reorder plan'
      );

      expect(planRes.intent).toBe('INVENTORY_DEFENSE');
      expect(planRes.approvalRequired).toBe(true);
      expect(planRes.status).toBe('PAUSED_FOR_APPROVAL');
      expect(planRes.pendingApprovalIds.length).toBeGreaterThan(0);

      const approvalStep = planRes.stepsExecuted.find(
        (s) => s.workerId === 'worker_execution'
      );
      expect(approvalStep).toBeDefined();
      expect(approvalStep!.status).toBe('PENDING_APPROVAL');
      expect(approvalStep!.pendingApprovalId).toBeTruthy();
    });

    it('pauses multi-stage campaign when marketing coworker triggers ad approval', async () => {
      const planRes = await executeMultiWorkerPlan(
        'Prepare a new campaign launch for festive season'
      );

      expect(planRes.intent).toBe('CAMPAIGN_LAUNCH');
      expect(planRes.approvalRequired).toBe(true);
      expect(planRes.status).toBe('PAUSED_FOR_APPROVAL');
      expect(planRes.pendingApprovalIds.length).toBeGreaterThan(0);

      // Verify that an approval step was captured and subsequent stages were skipped
      const pendingStep = planRes.stepsExecuted.find(
        (s) => s.status === 'PENDING_APPROVAL'
      );
      expect(pendingStep).toBeDefined();
      expect(pendingStep!.pendingApprovalId).toBeTruthy();

      const skippedStep = planRes.stepsExecuted.find(
        (s) => s.status === 'SKIPPED'
      );
      expect(skippedStep).toBeDefined();
    });
  });
});
