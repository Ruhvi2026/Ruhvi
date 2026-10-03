jest.mock('server-only', () => ({}));

import { getHolisticBusinessContext } from '../business-context';
import { runBusinessIntelligenceScan } from '../business-intelligence';
import { performRootCauseAnalysis } from '../root-cause';
import { formulateStrategicSolution } from '../strategy-engine';
import {
  generateActionPlanFromStrategy,
  saveActionPlan,
  executeActionPlanToTaskManager,
} from '../action-planner';
import { generateExecutiveAdvisorBriefing } from '../proactive';
import { verifyDueActionPlanOutcomes } from '../outcomes';
import { executeCoFounderTool } from '../tool-bridge';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../brain';
import { TOOL_PERMISSION_MAP } from '@/lib/ai/mcp-auth';

// Chainable mock builder
const createQueryBuilder = (defaultData: any = []) => {
  const builder: any = {
    select: jest.fn().mockImplementation(() => builder),
    eq: jest.fn().mockImplementation(() => builder),
    neq: jest.fn().mockImplementation(() => builder),
    gte: jest.fn().mockImplementation(() => builder),
    lte: jest.fn().mockImplementation(() => builder),
    gt: jest.fn().mockImplementation(() => builder),
    lt: jest.fn().mockImplementation(() => builder),
    in: jest.fn().mockImplementation(() => builder),
    is: jest.fn().mockImplementation(() => builder),
    order: jest.fn().mockImplementation(() => builder),
    limit: jest.fn().mockImplementation(() => builder),
    range: jest.fn().mockImplementation(() => builder),
    insert: jest.fn().mockImplementation(() => builder),
    update: jest.fn().mockImplementation(() => builder),
    delete: jest.fn().mockImplementation(() => builder),
    single: jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: Array.isArray(defaultData) ? defaultData[0] || null : defaultData,
        error: null,
      })
    ),
    maybeSingle: jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: Array.isArray(defaultData) ? defaultData[0] || null : defaultData,
        error: null,
      })
    ),
    then: (resolve: any, reject?: any) =>
      Promise.resolve({
        data: defaultData,
        count: Array.isArray(defaultData) ? defaultData.length : 1,
        error: null,
      }).then(resolve, reject),
  };
  return builder;
};

// Mock Supabase service
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}));

describe('AI Co-Founder — Business Advisor, Intelligence & Execution Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. BUSINESS CONTEXT ENGINE ──────────────────────────────────────────
  describe('Capability 1: Business Context Engine', () => {
    it('aggregates holistic 360-degree business context across users, catalog, support, and roadmap', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'orders') {
          return createQueryBuilder([
            {
              id: 'ord_1',
              total: 2500,
              status: 'delivered',
              payment_status: 'paid',
              created_at: new Date().toISOString(),
            },
          ]);
        }
        if (table === 'products') {
          return createQueryBuilder([
            {
              id: 'p1',
              name: 'Choker',
              sku: 'CH-01',
              stock_quantity: 4,
              status: 'active',
            },
          ]);
        }
        if (table === 'users') {
          return createQueryBuilder([{ id: 'u1' }]);
        }
        if (table === 'support_tickets') {
          return createQueryBuilder([
            {
              id: 't1',
              category: 'Shipping',
              status: 'open',
              priority: 'urgent',
            },
          ]);
        }
        if (table === 'tasks') {
          return createQueryBuilder([
            {
              id: 't_1',
              task_id_text: 'TM-01',
              title: 'Order Dispatch',
              status: { name: 'In Progress' },
              priority: { name: 'High' },
            },
          ]);
        }
        return createQueryBuilder([]);
      });

      const context = await getHolisticBusinessContext({ forceRefresh: true });

      expect(context).toBeDefined();
      expect(context.executiveVoiceSummary).toBeDefined();
      expect(typeof context.executiveVoiceSummary).toBe('string');
      expect(context.catalog).toBeDefined();
      expect(context.roadmap).toBeDefined();
      expect(context.users).toBeDefined();
    });
  });

  // ── 2. BUSINESS INTELLIGENCE SCAN ────────────────────────────────────────
  describe('Capability 2: Business Intelligence & Anomaly Detection', () => {
    it('detects problems, trends, operational risks, and growth opportunities', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'orders') {
          return createQueryBuilder([
            {
              id: '1',
              total: 1000,
              status: 'cancelled',
              payment_status: 'failed',
              created_at: new Date().toISOString(),
            },
            {
              id: '2',
              total: 1500,
              status: 'cancelled',
              payment_status: 'failed',
              created_at: new Date().toISOString(),
            },
            {
              id: '3',
              total: 2000,
              status: 'cancelled',
              payment_status: 'failed',
              created_at: new Date().toISOString(),
            },
            {
              id: '4',
              total: 2000,
              status: 'delivered',
              payment_status: 'paid',
              created_at: new Date().toISOString(),
            },
            {
              id: '5',
              total: 2000,
              status: 'delivered',
              payment_status: 'paid',
              created_at: new Date().toISOString(),
            },
          ]);
        }
        if (table === 'products') {
          return createQueryBuilder([
            {
              id: 'prod_1',
              name: 'Royal Rajputi Choker',
              sku: 'RUH-CH-01',
              stock_quantity: 2,
              price: 2499,
            },
          ]);
        }
        if (table === 'support_tickets') {
          return createQueryBuilder([
            { id: 't1', status: 'open', priority: 'urgent' },
          ]);
        }
        return createQueryBuilder([]);
      });

      const digest = await runBusinessIntelligenceScan('7d');

      expect(digest.problems.length).toBeGreaterThan(0);
      expect(digest.risks.length).toBeGreaterThan(0);
      expect(digest.executiveVoiceSummary).toBeDefined();
    });
  });

  // ── 3. ROOT-CAUSE ANALYSIS ───────────────────────────────────────────────
  describe('Capability 3: Root-Cause Analysis (RCA)', () => {
    it('partitions root cause investigation into Facts, Evidence, Assumptions, Hypotheses, and Uncertainty', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'orders') {
          return createQueryBuilder([
            {
              id: '1',
              order_number: 'ORD-101',
              payment_method: 'COD',
              status: 'cancelled',
            },
            {
              id: '2',
              order_number: 'ORD-102',
              payment_method: 'COD',
              status: 'cancelled',
            },
            {
              id: '3',
              order_number: 'ORD-103',
              payment_method: 'Prepaid',
              status: 'cancelled',
            },
          ]);
        }
        return createQueryBuilder([]);
      });

      const rca = await performRootCauseAnalysis('high_cancellation_rate');

      expect(rca.facts.length).toBeGreaterThan(0);
      expect(rca.evidence.length).toBeGreaterThan(0);
      expect(rca.assumptions.length).toBeGreaterThan(0);
      expect(rca.hypotheses.length).toBeGreaterThan(0);
      expect(rca.hypotheses[0].likelihood).toBe('high');
      expect(rca.uncertainty.confidenceLevel).toBeDefined();
      expect(rca.recommendedImmediateCheck).toContain('WhatsApp');
    });
  });

  // ── 4. SOLUTION & STRATEGY ENGINE ────────────────────────────────────────
  describe('Capability 4: Solution & Strategy Engine', () => {
    it('formulates practical solutions with reasoning, expected impact, costs, and trade-offs', () => {
      const solution = formulateStrategicSolution({
        title: 'Elevated COD Cancellation Rate',
        issueType: 'cancellation',
      });

      expect(solution.strategicObjective).toBeDefined();
      expect(solution.recommendedSolution).toContain('WhatsApp');
      expect(solution.expectedImpact.quantitativeProjection).toBeDefined();
      expect(solution.effortAndCost.level).toBe('low');
      expect(solution.tradeOffsAndRisks.length).toBeGreaterThan(0);
      expect(solution.alternativesConsidered.length).toBeGreaterThan(0);
      expect(solution.priority).toBe('high');
    });
  });

  // ── 5. ACTION PLANNER & TASK MANAGER INTEGRATION ─────────────────────────
  describe('Capability 5 & 6: Action Planner & Task Manager Execution', () => {
    it('decomposes strategy into Goal -> Strategy -> Project -> Tasks -> Steps -> Metrics', () => {
      const solution = formulateStrategicSolution({
        title: 'Core Stockout Prevention',
        issueType: 'stockout',
      });

      const plan = generateActionPlanFromStrategy(solution);

      expect(plan.goal).toBe(solution.strategicObjective);
      expect(plan.strategy).toBe(solution.recommendedSolution);
      expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
      expect(plan.tasks[0].steps.length).toBeGreaterThan(0);
      expect(plan.successMetrics.length).toBeGreaterThan(0);
    });

    it('executes action plan by creating real tasks in public.tasks and public.task_checklists', async () => {
      const fakePlan = {
        id: 'plan_123',
        title: 'COD Verification Protocol',
        goal: 'Cut cancellations',
        strategy: 'WhatsApp 1-tap confirmation',
        tasks_created: [
          {
            title: 'Deploy WhatsApp Template',
            description: 'Configure automated WhatsApp message',
            departmentName: 'Customer Support',
            priorityName: 'High',
            dueDaysFromNow: 2,
            steps: [{ title: 'Write template copy', order: 1 }],
          },
        ],
        success_metrics: [
          {
            metricKey: 'cancellation_rate',
            metricLabel: 'COD Cancellation Rate',
            baselineValue: 25,
            targetValue: 8,
            unit: '%',
            verificationWindowDays: 14,
          },
        ],
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'co_founder_action_plans') {
          return createQueryBuilder(fakePlan);
        }
        if (table === 'task_priorities') {
          return createQueryBuilder([{ id: 'p_high', name: 'High' }]);
        }
        if (table === 'task_statuses') {
          return createQueryBuilder([{ id: 's_open', name: 'Open' }]);
        }
        if (table === 'departments') {
          return createQueryBuilder([
            { id: 'd_support', name: 'Customer Support' },
          ]);
        }
        if (table === 'tasks') {
          return createQueryBuilder({
            id: 'task_created_1',
            task_id_text: 'TM-AI-01',
            title: 'Deploy WhatsApp Template',
          });
        }
        return createQueryBuilder({ id: 'mock_row' });
      });

      const res = await executeActionPlanToTaskManager(
        'plan_123',
        'staff_user_1'
      );

      expect(res.success).toBe(true);
      expect(res.tasksCreatedCount).toBe(1);
      expect(res.createdTasks[0].taskIdText).toBe('TM-AI-01');
      expect(res.voiceSummary).toContain('created 1 tasks in the Task Manager');
    });
  });

  // ── 7. PROACTIVE ADVISOR MODE ────────────────────────────────────────────
  describe('Capability 7: Proactive Advisor Mode', () => {
    it('proactively formats reports as Problem/Opportunity -> Evidence -> Recommended Solution -> Action Plan -> Priority', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'products') {
          return createQueryBuilder([
            {
              id: 'p1',
              name: 'Kundan Choker',
              sku: 'KUN-01',
              stock_quantity: 1,
              price: 1999,
            },
          ]);
        }
        return createQueryBuilder([]);
      });

      const briefings = await generateExecutiveAdvisorBriefing();

      expect(briefings.length).toBeGreaterThan(0);
      const first = briefings[0];
      expect(first.problemOrOpportunity).toBeDefined();
      expect(first.evidence).toBeDefined();
      expect(first.recommendedSolution).toBeDefined();
      expect(first.actionPlan).toBeDefined();
      expect(first.priority).toBeDefined();
    });
  });

  // ── 8. MEASURE & LEARN LOOP ──────────────────────────────────────────────
  describe('Capability 8: Measure & Learn Loop', () => {
    it('verifies due action plan outcomes and saves learnings into long-term memory', async () => {
      const mockOutcomes = [
        {
          id: 'out_1',
          evidence: { metricKey: 'cancellation_rate', baseline: 25, target: 8 },
          expected_outcome: 'Reduce cancellations below 8%',
          user_id: 'user_1',
        },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'co_founder_outcomes') {
          return createQueryBuilder(mockOutcomes);
        }
        if (table === 'co_founder_memories') {
          return createQueryBuilder([]);
        }
        return createQueryBuilder([]);
      });

      const result = await verifyDueActionPlanOutcomes();

      expect(result.checkedCount).toBe(1);
      expect(result.verifiedCount).toBe(1);
      expect(result.learningsRecordedCount).toBe(1);
    });
  });

  // ── 9. TOOL BRIDGE & PERMISSIONS MATRIX ───────────────────────────────────
  describe('Capability 9: Tool Bridge & Permissions Verification', () => {
    it('registers all 6 new advisor tools in CO_FOUNDER_TOOL_DECLARATIONS', () => {
      const names = CO_FOUNDER_TOOL_DECLARATIONS.map((t) => t.name);
      expect(names).toContain('get_business_context');
      expect(names).toContain('run_business_intelligence_scan');
      expect(names).toContain('investigate_root_cause');
      expect(names).toContain('formulate_strategy');
      expect(names).toContain('generate_action_plan');
      expect(names).toContain('execute_action_plan');
    });

    it('maps all 6 new advisor tools in TOOL_PERMISSION_MAP', () => {
      expect(TOOL_PERMISSION_MAP['get_business_context']).toEqual({
        module: 'analytics',
        action: 'read',
      });
      expect(TOOL_PERMISSION_MAP['run_business_intelligence_scan']).toEqual({
        module: 'analytics',
        action: 'read',
      });
      expect(TOOL_PERMISSION_MAP['investigate_root_cause']).toEqual({
        module: 'analytics',
        action: 'read',
      });
      expect(TOOL_PERMISSION_MAP['formulate_strategy']).toEqual({
        module: 'analytics',
        action: 'read',
      });
      expect(TOOL_PERMISSION_MAP['generate_action_plan']).toEqual({
        module: 'analytics',
        action: 'write',
      });
      expect(TOOL_PERMISSION_MAP['execute_action_plan']).toEqual({
        module: 'analytics',
        action: 'write',
      });
    });

    it('blocks execution when scopes lack permission', async () => {
      const result = await executeCoFounderTool(
        'generate_action_plan',
        { strategy_title: 'Test', strategy_objective: 'Test' },
        ['orders:read'] // Lacks analytics:write
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });
  });
});
