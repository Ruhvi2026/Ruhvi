jest.mock('server-only', () => ({}));

import {
  classifyGoalIntent,
  decomposeGoalIntoPlan,
  detectPlanConflicts,
  resolveTargetWorker,
  PlannedWorkerStep,
} from '../workers/intelligent-planner';

describe('Intelligent Planner & Context-Aware Orchestrator', () => {
  describe('Single-Domain Intent Classification', () => {
    it('classifies analytics intent', () => {
      const res = classifyGoalIntent(
        'Analyze store revenue, traffic, and sales performance'
      );
      expect(res.intent).toBe('ANALYTICS');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_analytics_performance');
    });

    it('classifies marketing intent', () => {
      const res = classifyGoalIntent(
        'Draft high-converting ad copy and Instagram video reel hooks'
      );
      expect(res.intent).toBe('MARKETING');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_marketing');
    });

    it('classifies SEO intent', () => {
      const res = classifyGoalIntent(
        'Audit product schema, meta description, and Google search ranking'
      );
      expect(res.intent).toBe('SEO');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_seo');
    });

    it('classifies product intent', () => {
      const res = classifyGoalIntent(
        'Update product catalog descriptions and SKU merchandise details'
      );
      expect(res.intent).toBe('PRODUCT');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_product');
    });

    it('classifies competitor intent', () => {
      const res = classifyGoalIntent(
        'Benchmark Giva and Palmonas competitor pricing'
      );
      expect(res.intent).toBe('COMPETITOR');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_competitor_research');
    });

    it('classifies sales conversion intent', () => {
      const res = classifyGoalIntent(
        'Analyze checkout drop, cart abandonment, and conversion rate funnel'
      );
      expect(res.intent).toBe('SALES_CONVERSION');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_sales_conversion');
    });

    it('classifies customer support intent', () => {
      const res = classifyGoalIntent(
        'Review urgent customer support tickets and tracking delay complaints'
      );
      expect(res.intent).toBe('CUSTOMER_SUPPORT');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_customer_support');
    });

    it('classifies content blog intent', () => {
      const res = classifyGoalIntent(
        'Write a blog article and editorial post on silver jewelry gifting'
      );
      expect(res.intent).toBe('CONTENT');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_content_blog');
    });

    it('classifies inventory intent', () => {
      const res = classifyGoalIntent(
        'Identify out of stock items and warehouse reorder inventory levels'
      );
      expect(res.intent).toBe('INVENTORY');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_inventory');
    });

    it('classifies review feedback intent', () => {
      const res = classifyGoalIntent(
        'Audit negative 1-star customer reviews and product defect feedback'
      );
      expect(res.intent).toBe('REVIEW');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_review_feedback');
    });

    it('classifies execution worker intent', () => {
      const res = classifyGoalIntent(
        'Execute approved price changes and apply fix to catalog'
      );
      expect(res.intent).toBe('EXECUTION');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_execution');
    });

    it('classifies monitoring worker intent', () => {
      const res = classifyGoalIntent(
        'Verify outcome, check regression, and monitor change after deploy'
      );
      expect(res.intent).toBe('MONITORING');
      expect(res.isComposite).toBe(false);
      expect(res.matchedWorkers).toContain('worker_monitoring_verification');
    });
  });

  describe('Composite Intent Detection', () => {
    it('detects GROWTH_AUDIT composite goal', () => {
      const res = classifyGoalIntent(
        'Run a complete growth audit on our store health'
      );
      expect(res.intent).toBe('GROWTH_AUDIT');
      expect(res.isComposite).toBe(true);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('detects CAMPAIGN_LAUNCH composite goal', () => {
      const res = classifyGoalIntent(
        'Prepare a new campaign launch for festive season'
      );
      expect(res.intent).toBe('CAMPAIGN_LAUNCH');
      expect(res.isComposite).toBe(true);
    });

    it('detects CONVERSION_RECOVERY composite goal', () => {
      const res = classifyGoalIntent(
        'Execute conversion recovery to fix checkout drop'
      );
      expect(res.intent).toBe('CONVERSION_RECOVERY');
      expect(res.isComposite).toBe(true);
    });

    it('detects INVENTORY_DEFENSE composite goal', () => {
      const res = classifyGoalIntent(
        'Emergency low stock crisis and reorder plan'
      );
      expect(res.intent).toBe('INVENTORY_DEFENSE');
      expect(res.isComposite).toBe(true);
    });

    it('detects GENERAL_COMPOSITE when multiple domains are invoked without explicit template', () => {
      const res = classifyGoalIntent(
        'Analyze gross margin metrics, benchmark competitor prices, and create ad copy'
      );
      expect(res.intent).toBe('GENERAL_COMPOSITE');
      expect(res.isComposite).toBe(true);
      expect(res.matchedWorkers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Single-Worker Plan Generation', () => {
    it('decomposes single-worker goal into 1-step stage 0 plan', () => {
      const plan = decomposeGoalIntoPlan(
        'Analyze store traffic and revenue performance'
      );
      expect(plan.isComposite).toBe(false);
      expect(plan.allSteps.length).toBe(1);
      expect(plan.stages.length).toBe(1);

      const step = plan.allSteps[0];
      expect(step.workerId).toBe('worker_analytics_performance');
      expect(step.stageIndex).toBe(0);
      expect(step.dependsOn).toEqual([]);
      expect(step.isParallelSafe).toBe(true);
      expect(step.requiresApproval).toBe(false);
      expect(plan.conflictsDetected).toEqual([]);
    });

    it('marks execution worker steps as requiring approval', () => {
      const plan = decomposeGoalIntoPlan('Execute approved actions on orders');
      expect(plan.allSteps.length).toBe(1);
      const step = plan.allSteps[0];
      expect(step.workerId).toBe('worker_execution');
      expect(step.requiresApproval).toBe(true);
      expect(step.isParallelSafe).toBe(false);
      expect(plan.approvalRequiredStepsCount).toBe(1);
    });
  });

  describe('Composite Plan Decomposition & Dependency Graph', () => {
    it('generates multi-stage plan for GROWTH_AUDIT', () => {
      const plan = decomposeGoalIntoPlan(
        'Conduct a comprehensive growth audit of our business'
      );
      expect(plan.isComposite).toBe(true);
      expect(plan.intent).toBe('GROWTH_AUDIT');
      expect(plan.stages.length).toBe(2);

      // Stage 0: 3 parallel investigative read workers
      const stage0 = plan.stages[0];
      expect(stage0.stageIndex).toBe(0);
      expect(stage0.isParallelStage).toBe(true);
      expect(stage0.steps.length).toBe(3);

      const stage0Workers = stage0.steps.map((s) => s.workerId);
      expect(stage0Workers).toContain('worker_analytics_performance');
      expect(stage0Workers).toContain('worker_competitor_research');
      expect(stage0Workers).toContain('worker_seo');

      // Stage 1: Synthesis & Marketing workers depending on Stage 0
      const stage1 = plan.stages[1];
      expect(stage1.stageIndex).toBe(1);
      expect(stage1.steps.length).toBe(2);

      const marketingStep = stage1.steps.find(
        (s) => s.workerId === 'worker_marketing'
      );
      expect(marketingStep).toBeDefined();
      expect(marketingStep!.dependsOn).toContain('step_1');
      expect(marketingStep!.dependsOn).toContain('step_2');

      expect(plan.conflictsDetected).toEqual([]);
      expect(plan.approvalRequiredStepsCount).toBe(0);
    });

    it('generates multi-stage plan for CAMPAIGN_LAUNCH with human approval gate', () => {
      const plan = decomposeGoalIntoPlan('Plan a festive campaign launch');
      expect(plan.isComposite).toBe(true);
      expect(plan.intent).toBe('CAMPAIGN_LAUNCH');
      expect(plan.stages.length).toBe(3);

      // Stage 0: Product & Competitor
      expect(plan.stages[0].steps.length).toBe(2);

      // Stage 1: Content & Marketing
      expect(plan.stages[1].steps.length).toBe(2);

      // Stage 2: Execution worker requiring approval
      const stage2 = plan.stages[2];
      expect(stage2.steps.length).toBe(1);
      const execStep = stage2.steps[0];
      expect(execStep.workerId).toBe('worker_execution');
      expect(execStep.requiresApproval).toBe(true);
      expect(execStep.actionType).toBe('campaign_launch');
      expect(execStep.dependsOn).toContain('step_4');

      expect(plan.approvalRequiredStepsCount).toBe(1);
      expect(plan.conflictsDetected).toEqual([]);
    });

    it('generates multi-stage plan for CONVERSION_RECOVERY', () => {
      const plan = decomposeGoalIntoPlan(
        'Execute conversion recovery to fix checkout drop'
      );
      expect(plan.intent).toBe('CONVERSION_RECOVERY');

      // Stage 0: Sales, Customer Support, Review Feedback
      const stage0 = plan.stages[0];
      expect(stage0.steps.length).toBe(3);
      const stage0Workers = stage0.steps.map((s) => s.workerId);
      expect(stage0Workers).toContain('worker_sales_conversion');
      expect(stage0Workers).toContain('worker_customer_support');
      expect(stage0Workers).toContain('worker_review_feedback');

      // Stage 1: Marketing retention offers
      const stage1 = plan.stages[1];
      expect(stage1.steps[0].workerId).toBe('worker_marketing');
      expect(stage1.steps[0].dependsOn).toEqual(['step_1', 'step_2']);
      expect(plan.conflictsDetected).toEqual([]);
    });

    it('generates multi-stage plan for INVENTORY_DEFENSE with approval gate', () => {
      const plan = decomposeGoalIntoPlan(
        'Address emergency low stock crisis and reorder plan'
      );
      expect(plan.intent).toBe('INVENTORY_DEFENSE');
      expect(plan.stages.length).toBe(2);

      // Stage 0: Inventory & Analytics velocity
      expect(plan.stages[0].steps.length).toBe(2);

      // Stage 1: Execution worker purchase order
      expect(plan.stages[1].steps.length).toBe(1);
      expect(plan.stages[1].steps[0].workerId).toBe('worker_execution');
      expect(plan.stages[1].steps[0].requiresApproval).toBe(true);
      expect(plan.approvalRequiredStepsCount).toBe(1);
      expect(plan.conflictsDetected).toEqual([]);
    });
  });

  describe('Conflict Detection & Safety Gating', () => {
    it('detects missing dependency reference', () => {
      const badSteps: PlannedWorkerStep[] = [
        {
          stepId: 'step_1',
          workerId: 'worker_analytics_performance',
          workerName: 'Analytics',
          title: 'Analytics task',
          task: 'Analyze',
          stageIndex: 0,
          dependsOn: ['step_non_existent'],
          isParallelSafe: true,
          requiresApproval: false,
        },
      ];
      const conflicts = detectPlanConflicts(badSteps);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('depends on non-existent step');
    });

    it('detects circular self-dependency', () => {
      const circularSteps: PlannedWorkerStep[] = [
        {
          stepId: 'step_1',
          workerId: 'worker_analytics_performance',
          workerName: 'Analytics',
          title: 'Analytics task',
          task: 'Analyze',
          stageIndex: 0,
          dependsOn: ['step_1'],
          isParallelSafe: true,
          requiresApproval: false,
        },
      ];
      const conflicts = detectPlanConflicts(circularSteps);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('circular dependency on itself');
    });

    it('detects unapproved execution worker mutation', () => {
      const unapprovedSteps: PlannedWorkerStep[] = [
        {
          stepId: 'step_1',
          workerId: 'worker_execution',
          workerName: 'Execution',
          title: 'Unapproved execution',
          task: 'Mutate database directly',
          stageIndex: 0,
          dependsOn: [],
          isParallelSafe: false,
          requiresApproval: false, // VIOLATION
        },
      ];
      const conflicts = detectPlanConflicts(unapprovedSteps);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('without required human approval gate');
    });

    it('detects concurrent execution and read steps in same stage', () => {
      const mixedStageSteps: PlannedWorkerStep[] = [
        {
          stepId: 'step_1',
          workerId: 'worker_analytics_performance',
          workerName: 'Analytics',
          title: 'Read analytics',
          task: 'Analyze',
          stageIndex: 0,
          dependsOn: [],
          isParallelSafe: true,
          requiresApproval: false,
        },
        {
          stepId: 'step_2',
          workerId: 'worker_execution',
          workerName: 'Execution',
          title: 'Concurrent execution',
          task: 'Mutate',
          stageIndex: 0,
          dependsOn: [],
          isParallelSafe: false,
          requiresApproval: true,
        },
      ];
      const conflicts = detectPlanConflicts(mixedStageSteps);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain(
        'combines write/execution steps with investigative read steps'
      );
    });
  });

  describe('Fallback Resolution', () => {
    it('resolves target worker directly for simple queries', () => {
      expect(resolveTargetWorker('Check warehouse reorder stock')).toBe(
        'worker_inventory'
      );
      expect(resolveTargetWorker('Analyze customer complaint tickets')).toBe(
        'worker_customer_support'
      );
    });

    it('falls back to default worker for unrecognizable gibberish', () => {
      const fallback = resolveTargetWorker('qwertyuiop 12345 xyz');
      expect(fallback).toBe('worker_analytics_performance');
    });
  });
});
