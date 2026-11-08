jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/approvals', () => ({
  requestApproval: jest.fn().mockResolvedValue({
    id: 'app_mock_123',
    status: 'pending',
  }),
  createApprovalRequest: jest.fn().mockResolvedValue({
    success: true,
    approvalId: 'app_mock_123',
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

import { createApprovalRequest } from '@/lib/ai/co-founder/approvals';
import {
  dispatchWorkerTask,
  getWorkerRegistryStatus,
  executeMultiWorkerPlan,
} from '../dispatcher';
import { workerRegistry } from '../registry';

describe('AI Co-Founder Dynamic Worker Dispatcher & Registry', () => {
  it('registers all 15 specialized AI Agent Workers', () => {
    const status = getWorkerRegistryStatus();
    expect(status.totalWorkers).toBe(15);

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
      'worker_accounts_tax',
      'worker_performance_intelligence',
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

    it('rejects multi-worker execution if plan contains dependency cycles (Section 5.2 & WF-GAP-008)', async () => {
      // Craft a plan with arbitrary 3-step cycle: step_1 -> step_2 -> step_3 -> step_1
      const cyclicPlan = {
        planId: 'plan_cycle_test',
        userGoal: 'Test cyclic plan rejection',
        intent: 'ANALYTICS' as any,
        isComposite: true,
        summary: 'Cyclic test plan',
        stages: [
          {
            stageIndex: 0,
            isParallelStage: true,
            steps: [
              {
                stepId: 'step_1',
                workerId: 'worker_analytics_performance' as any,
                workerName: 'Analytics',
                title: 'Step 1',
                task: 'Task 1',
                stageIndex: 0,
                dependsOn: ['step_3'], // Depends on step 3!
                isParallelSafe: true,
                requiresApproval: false,
              },
              {
                stepId: 'step_2',
                workerId: 'worker_marketing' as any,
                workerName: 'Marketing',
                title: 'Step 2',
                task: 'Task 2',
                stageIndex: 0,
                dependsOn: ['step_1'], // Depends on step 1!
                isParallelSafe: true,
                requiresApproval: false,
              },
              {
                stepId: 'step_3',
                workerId: 'worker_seo' as any,
                workerName: 'SEO',
                title: 'Step 3',
                task: 'Task 3',
                stageIndex: 0,
                dependsOn: ['step_2'], // Depends on step 2!
                isParallelSafe: true,
                requiresApproval: false,
              },
            ],
          },
        ],
        allSteps: [
          {
            stepId: 'step_1',
            workerId: 'worker_analytics_performance' as any,
            workerName: 'Analytics',
            title: 'Step 1',
            task: 'Task 1',
            stageIndex: 0,
            dependsOn: ['step_3'],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_2',
            workerId: 'worker_marketing' as any,
            workerName: 'Marketing',
            title: 'Step 2',
            task: 'Task 2',
            stageIndex: 0,
            dependsOn: ['step_1'],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_3',
            workerId: 'worker_seo' as any,
            workerName: 'SEO',
            title: 'Step 3',
            task: 'Task 3',
            stageIndex: 0,
            dependsOn: ['step_2'],
            isParallelSafe: true,
            requiresApproval: false,
          },
        ],
        approvalRequiredStepsCount: 0,
        estimatedExecutionRounds: 1,
        conflictsDetected: [],
        fallbackWorkerId: 'worker_analytics_performance' as any,
        createdAt: new Date().toISOString(),
      };

      const result = await executeMultiWorkerPlan(cyclicPlan);
      expect(result.status).toBe('FAILED');
      expect(
        result.aggregatedProblems.some((p) => p.includes('cycle detected'))
      ).toBe(true);
      expect(result.executiveSummary).toContain('plan validation failure');
    });

    it('fails closed without synthetic approval ID when approval creation service fails (Section 5.1)', async () => {
      (createApprovalRequest as jest.Mock).mockRejectedValueOnce(
        new Error('Database offline')
      );

      const dispatch = await dispatchWorkerTask('worker_marketing', {
        task: 'Launch festive discount coupon 20% off',
      });

      expect(dispatch.coFounderAnalysis.approvalRequired).toBe(true);
      // Section 5.1: Must NOT synthesize a fake approval ID!
      expect(dispatch.coFounderAnalysis.pendingApprovalId).toBeUndefined();
      expect(dispatch.result.executionStatus).toBe('failed');
      expect(
        dispatch.result.problems.some((p) =>
          p.includes('APPROVAL_CREATION_FAILED')
        )
      ).toBe(true);
    });

    it('reports truthful REGISTERED status in getWorkerRegistryStatus (Section 5.5)', () => {
      const status = getWorkerRegistryStatus();
      for (const w of status.workers) {
        expect(w.status).toBe('REGISTERED');
        expect((w as any).runtimeState).toBe('NOT_YET_RUN');
      }
    });
  });
});
