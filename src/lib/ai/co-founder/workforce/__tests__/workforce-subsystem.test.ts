jest.mock('server-only', () => ({}));

import { getAllWorkerManifests, getWorkerManifest } from '../manifests';
import {
  assertWorkforceOperationAllowed,
  clearAllWorkerMaintenance,
  getWorkforceConfig,
  isGlobalKillSwitchActive,
  isWorkerActive,
  setGlobalKillSwitch,
  setWorkerMaintenance,
} from '../config';
import { computePayloadHash, workforcePolicyEngine } from '../policy-engine';
import { workforceSignalNormalizer } from '../signals';
import { workforceGoalDiscovery } from '../goal-discovery';
import { workforcePlanner } from '../planner';
import { workforceDelegationBroker } from '../delegation-broker';
import { workforceAgentRunner } from '../agent-runner';
import { workforceVerifier } from '../verifier';
import { autonomousWorkforceCoordinator } from '../index';
import { WorkerId } from '../types';

describe('Autonomous Worker Workforce Subsystem', () => {
  beforeEach(() => {
    setGlobalKillSwitch(false);
    clearAllWorkerMaintenance();
    workforceDelegationBroker.reset();
    workforceGoalDiscovery.reset();
  });

  describe('1. Worker Manifests Integrity', () => {
    const canonicalWorkers: WorkerId[] = [
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
    ];

    it('has exactly 14 canonical worker manifests registered', () => {
      const manifests = getAllWorkerManifests();
      expect(manifests).toHaveLength(14);

      const registeredIds = manifests.map((m) => m.workerId);
      for (const id of canonicalWorkers) {
        expect(registeredIds).toContain(id);
      }
    });

    it('each manifest contains complete governance metadata and valid sha256 hash', () => {
      for (const workerId of canonicalWorkers) {
        const manifest = getWorkerManifest(workerId);
        expect(manifest).toBeDefined();
        expect(manifest!.displayName).toBeTruthy();
        expect(manifest!.domain).toBeTruthy();
        expect(manifest!.objectives.length).toBeGreaterThan(0);
        expect(manifest!.ownedKpis.length).toBeGreaterThan(0);
        expect(manifest!.allowedTools.length).toBeGreaterThan(0);
        expect(manifest!.readScopes.length).toBeGreaterThan(0);
        expect(manifest!.autonomyTier).toBeDefined();
        expect(manifest!.limits.maxSteps).toBeGreaterThan(0);
        expect(manifest!.limits.maxToolCalls).toBeGreaterThan(0);
        expect(manifest!.manifestHash).toHaveLength(64);
      }
    });
  });

  describe('2. Governance & Safety Constraints', () => {
    it('has safe default configuration with dryRun enabled', () => {
      const config = getWorkforceConfig();
      expect(config.dryRun).toBe(true);
      expect(config.maxDelegationDepth).toBe(2);
      expect(config.maxConcurrentChildren).toBe(3);
    });

    it('strictly forbids repository writes, deploys, and schema mutations', () => {
      expect(() => assertWorkforceOperationAllowed('git_push_master')).toThrow(
        /Workforce safety violation/
      );

      expect(() =>
        assertWorkforceOperationAllowed('production_deploy')
      ).toThrow(/Workforce safety violation/);

      expect(() => assertWorkforceOperationAllowed('alter_table_ddl')).toThrow(
        /Workforce safety violation/
      );

      expect(() =>
        assertWorkforceOperationAllowed('write_source_code')
      ).toThrow(/Workforce safety violation/);

      expect(() =>
        assertWorkforceOperationAllowed('analyze_metrics')
      ).not.toThrow();
    });

    it('toggles global emergency kill switch correctly', () => {
      expect(isGlobalKillSwitchActive()).toBe(false);
      setGlobalKillSwitch(true);
      expect(isGlobalKillSwitchActive()).toBe(true);
      setGlobalKillSwitch(false);
      expect(isGlobalKillSwitchActive()).toBe(false);
    });

    it('toggles individual worker maintenance mode', () => {
      expect(isWorkerActive('worker_marketing')).toBe(true);
      setWorkerMaintenance('worker_marketing', true);
      expect(isWorkerActive('worker_marketing')).toBe(false);
      setWorkerMaintenance('worker_marketing', false);
      expect(isWorkerActive('worker_marketing')).toBe(true);
    });
  });

  describe('3. Policy Engine & Autonomy Tiers', () => {
    it('correctly classifies action risks', () => {
      expect(workforcePolicyEngine.classifyActionRisk('query_analytics')).toBe(
        'read_only'
      );
      expect(
        workforcePolicyEngine.classifyActionRisk('create_task_draft')
      ).toBe('internal_write');
      expect(workforcePolicyEngine.classifyActionRisk('publish_campaign')).toBe(
        'external_side_effect'
      );
      expect(workforcePolicyEngine.classifyActionRisk('process_refund')).toBe(
        'financial'
      );
      expect(workforcePolicyEngine.classifyActionRisk('delete_product')).toBe(
        'destructive'
      );
    });

    it('denies execution when global kill switch is active', () => {
      setGlobalKillSwitch(true);
      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_marketing',
        toolName: 'read_analytics',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('kill switch is currently active');
    });

    it('denies execution when worker is in maintenance mode', () => {
      setWorkerMaintenance('worker_seo', true);
      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_seo',
        toolName: 'read_search_console',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('maintenance mode');
    });

    it('denies tools not included in worker allowlist', () => {
      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_seo',
        toolName: 'unauthorized_random_tool',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('not permitted');
    });

    it('T1 tier allows read-only and requires approval for mutations', () => {
      const readDecision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_analytics_performance',
        toolName: 'read_analytics',
      });
      expect(readDecision.decision).toBe('ALLOW');

      const writeDecision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_analytics_performance',
        toolName: 'draft_metric_alert',
      });
      expect(writeDecision.decision).toBe('REQUIRE_APPROVAL');
    });

    it('validates cryptographic approval binding for approval-gated actions', () => {
      const payload = { action: 'update_stock', amount: 50 };
      const validHash = computePayloadHash(payload);

      // 1. Missing approval -> REQUIRE_APPROVAL
      const decisionMissing = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
      });
      expect(decisionMissing.decision).toBe('REQUIRE_APPROVAL');

      // 2. Expired approval -> DENY
      const expiredBinding = {
        approvalId: 'app_1',
        actionType: 'adjust_stock_level',
        targetResource: 'inventory:item_123',
        payloadHash: validHash,
        actor: 'owner@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      };
      const decisionExpired = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: expiredBinding,
      });
      expect(decisionExpired.decision).toBe('DENY');
      expect(decisionExpired.reason).toContain('expired');

      // 3. Payload hash mismatch (tampered payload) -> DENY
      const tamperedBinding = {
        ...expiredBinding,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        payloadHash: 'deadbeef_invalid_hash',
      };
      const decisionTampered = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: tamperedBinding,
      });
      expect(decisionTampered.decision).toBe('DENY');
      expect(decisionTampered.reason).toContain('payload hash mismatch');

      // 4. Valid approval -> ALLOW
      const validBinding = {
        ...expiredBinding,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        payloadHash: validHash,
      };
      const decisionValid = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: validBinding,
      });
      expect(decisionValid.decision).toBe('ALLOW');
    });

    it('calculates strict delegation permission intersection', () => {
      const parentManifest = getWorkerManifest('worker_marketing')!;
      const childManifest = getWorkerManifest('worker_seo')!;

      const intersection = workforcePolicyEngine.intersectDelegationPermissions(
        parentManifest,
        childManifest
      );

      expect(intersection.isAllowedDelegate).toBe(true);
      // Effective tools can only be tools present in BOTH parent and child
      for (const tool of intersection.effectiveTools) {
        expect(parentManifest.allowedTools).toContain(tool);
        expect(childManifest.allowedTools).toContain(tool);
      }
    });
  });

  describe('4. Signals & Normalization', () => {
    it('normalizes incoming signal and computes deterministic idempotencyKey', () => {
      const raw = {
        sourceType: 'schedule' as const,
        sourceId: 'cron_nightly_briefing',
        eventType: 'sales_anomaly_detected',
        payload: { anomaly: 'traffic_dip', threshold: 0.15 },
      };

      const normalized1 = workforceSignalNormalizer.normalizeSignal(raw);
      const normalized2 = workforceSignalNormalizer.normalizeSignal(raw);

      expect(normalized1.signalId).toBeTruthy();
      expect(normalized1.idempotencyKey).toHaveLength(64);
      expect(normalized1.idempotencyKey).toBe(normalized2.idempotencyKey);
      expect(normalized1.workerCandidates).toContain(
        'worker_analytics_performance'
      );
    });

    it('rejects stale signals older than 24 hours', () => {
      const staleTime = new Date(Date.now() - 90000000).toISOString();
      const raw = {
        sourceType: 'webhook' as const,
        sourceId: 'stripe_event_123',
        eventType: 'payment_received',
        occurredAt: staleTime,
      };

      expect(() => workforceSignalNormalizer.normalizeSignal(raw)).toThrow(
        /Stale signal rejected/
      );
    });
  });

  describe('5. Goal Discovery & Transparent Priority Scoring', () => {
    it('discovers candidate goals and calculates transparent priority score', () => {
      const signal = workforceSignalNormalizer.normalizeSignal({
        sourceType: 'schedule',
        sourceId: 'hourly_health_check',
        eventType: 'cart_abandonment_spike',
        payload: { abandonRate: 0.72 },
      });

      const goals = workforceGoalDiscovery.discoverGoalsFromSignal(signal);
      expect(goals.length).toBeGreaterThan(0);

      const topGoal = goals[0];
      expect(topGoal.workerId).toBe('worker_sales_conversion');
      expect(topGoal.priorityScore).toBeGreaterThan(0);
      expect(topGoal.suggestedTier).toBe('T1');
    });

    it('enforces 48-hour cooldown fingerprinting against duplicate goals', () => {
      const signal = workforceSignalNormalizer.normalizeSignal({
        sourceType: 'webhook',
        sourceId: 'support_desk',
        eventType: 'customer_complaint_surge',
        payload: { tag: 'delivery_delay' },
      });

      const firstGoals = workforceGoalDiscovery.discoverGoalsFromSignal(signal);
      expect(firstGoals.length).toBe(1);

      // Re-running same signal within cooldown must be suppressed
      const secondGoals =
        workforceGoalDiscovery.discoverGoalsFromSignal(signal);
      expect(secondGoals.length).toBe(0);
    });
  });

  describe('6. Workforce Planner & DAG Validation', () => {
    it('generates valid execution plan with dependency steps', () => {
      const goal = {
        goalId: 'goal_test_123',
        workerId: 'worker_analytics_performance' as WorkerId,
        sourceSignalId: 'sig_123',
        objective: 'Analyze weekly revenue drop',
        rationale: 'Revenue fell by 12% WoW',
        evidenceRefs: ['orders:last_7d'],
        confidence: 0.8,
        impact: 4,
        urgency: 4,
        effort: 2,
        strategicAlignment: 5,
        riskPenalty: 0,
        cooldownFingerprint: 'fp_123',
        suggestedTier: 'T1' as const,
        priorityScore: 32,
        status: 'CANDIDATE' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const plan = workforcePlanner.createPlanForGoal(goal);
      expect(plan.validationStatus).toBe('valid');
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps[0].workerId).toBe('worker_analytics_performance');
    });

    it('detects circular dependencies in plan DAG and marks plan invalid', () => {
      const invalidSteps = [
        {
          stepId: 'step_A',
          workerId: 'worker_analytics_performance' as WorkerId,
          action: 'read_analytics',
          allowedTools: ['read_analytics'],
          dependsOnStepIds: ['step_B'],
          riskCategory: 'read_only' as const,
          autonomyTier: 'T1' as const,
          expectedOutputSchema: 'WorkerStructuredOutput',
          timeoutSeconds: 30,
        },
        {
          stepId: 'step_B',
          workerId: 'worker_analytics_performance' as WorkerId,
          action: 'read_metrics',
          allowedTools: ['read_metrics'],
          dependsOnStepIds: ['step_A'], // Cycle A -> B -> A
          riskCategory: 'read_only' as const,
          autonomyTier: 'T1' as const,
          expectedOutputSchema: 'WorkerStructuredOutput',
          timeoutSeconds: 30,
        },
      ];

      const validation = workforcePlanner.validatePlanDAG(invalidSteps);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Circular dependency detected');
    });
  });

  describe('7. Delegation Broker', () => {
    it('prohibits self-delegation loop', () => {
      const result = workforceDelegationBroker.createDelegation({
        parentTaskId: 'task_parent_1',
        parentWorkerId: 'worker_marketing',
        childWorkerId: 'worker_marketing',
        objective: 'Self delegate',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot delegate to itself');
    });

    it('enforces maximum delegation depth of 2 (blocks depth 3)', () => {
      // Level 1 -> Level 2 allowed
      const level2 = workforceDelegationBroker.createDelegation({
        parentTaskId: 'task_root',
        parentWorkerId: 'worker_marketing',
        childWorkerId: 'worker_seo',
        parentDepth: 1,
        objective: 'SEO keyword optimization for marketing',
      });
      expect(level2.allowed).toBe(true);
      expect(level2.contract?.depth).toBe(2);

      // Level 2 -> Level 3 must be blocked!
      const level3 = workforceDelegationBroker.createDelegation({
        parentTaskId: 'task_child',
        parentWorkerId: 'worker_seo',
        childWorkerId: 'worker_content_blog',
        parentDepth: 2,
        objective: 'Grandchild delegation attempt',
      });
      expect(level3.allowed).toBe(false);
      expect(level3.reason).toContain('depth limit exceeded');
    });

    it('enforces maximum 3 concurrent child delegations per parent task', () => {
      const parentTaskId = 'task_multi_child';

      // 1st child
      expect(
        workforceDelegationBroker.createDelegation({
          parentTaskId,
          parentWorkerId: 'worker_marketing',
          childWorkerId: 'worker_seo',
          objective: 'Child 1',
        }).allowed
      ).toBe(true);

      // 2nd child
      expect(
        workforceDelegationBroker.createDelegation({
          parentTaskId,
          parentWorkerId: 'worker_marketing',
          childWorkerId: 'worker_content_blog',
          objective: 'Child 2',
        }).allowed
      ).toBe(true);

      // 3rd child
      expect(
        workforceDelegationBroker.createDelegation({
          parentTaskId,
          parentWorkerId: 'worker_marketing',
          childWorkerId: 'worker_sales_conversion',
          objective: 'Child 3',
        }).allowed
      ).toBe(true);

      // 4th child must be rejected
      const fourth = workforceDelegationBroker.createDelegation({
        parentTaskId,
        parentWorkerId: 'worker_marketing',
        childWorkerId: 'worker_analytics_performance',
        objective: 'Child 4',
      });
      expect(fourth.allowed).toBe(false);
      expect(fourth.reason).toContain('maximum allowed is 3');
    });

    it('rejects child workers not in parent allowedDelegates list', () => {
      const result = workforceDelegationBroker.createDelegation({
        parentTaskId: 'task_p1',
        parentWorkerId: 'worker_accounts_tax',
        childWorkerId: 'worker_content_blog', // Not in accounts tax delegates
        objective: 'Invalid delegation',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not an authorized delegate');
    });
  });

  describe('8. Agent Runner & Step Execution', () => {
    it('initializes task with valid manifest defaults', () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_inventory',
        goalId: 'goal_inv_01',
        objective: 'Audit low stock rings',
      });

      expect(task.taskId.startsWith('task_')).toBe(true);
      expect(task.status).toBe('PROPOSED');
      expect(task.tier).toBe('T1');
      expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
    });

    it('halts and marks task as DEAD_LETTER if global kill switch is active', async () => {
      setGlobalKillSwitch(true);

      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_kill_01',
        objective: 'Run analytics under kill switch',
      });

      const result = await workforceAgentRunner.executeTask(task);
      expect(result.success).toBe(false);
      expect(result.task.status).toBe('DEAD_LETTER');
      expect(result.error).toContain('kill switch is active');
    });

    it('executes bounded steps, saves checkpoints, and completes task successfully', async () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_run_01',
        objective: 'Analyze quarterly conversion metrics',
      });

      const result = await workforceAgentRunner.executeTask(task, {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.task.status).toBe('COMPLETED');
      expect(result.executedSteps).toBeGreaterThanOrEqual(1);
      expect(result.task.checkpoints.length).toBeGreaterThanOrEqual(1);
      expect(result.task.outputSummary).toBeTruthy();
    });
  });

  describe('9. Workforce Verifier (Level 1 & Level 2)', () => {
    it('Level 1: verifies task completion, output summary, and tool boundaries', () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_ver_01',
        objective: 'Verify analytics task',
      });
      task.status = 'COMPLETED';
      task.outputSummary = 'Verified conversion rate analysis completed.';
      task.checkpoints = [
        {
          stepIndex: 1,
          state: { action: 'read_analytics' },
          timestamp: new Date().toISOString(),
        },
      ];

      const l1 = workforceVerifier.verifyTaskExecution(task);
      expect(l1.taskVerified).toBe(true);
      expect(l1.violations).toHaveLength(0);
    });

    it('Level 1: detects unauthorized tool invocation in task checkpoints', () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_ver_bad',
        objective: 'Bad task',
      });
      task.status = 'COMPLETED';
      task.outputSummary = 'Done';
      task.checkpoints = [
        {
          stepIndex: 1,
          state: { action: 'unauthorized_dangerous_action' },
          timestamp: new Date().toISOString(),
        },
      ];

      const l1 = workforceVerifier.verifyTaskExecution(task);
      expect(l1.taskVerified).toBe(false);
      expect(l1.violations[0]).toContain('Unauthorized tool executed');
    });

    it('Level 2: evaluates authoritative metric outcomes', async () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_sales_conversion',
        goalId: 'goal_ver_l2',
        objective: 'Increase sales conversion',
      });
      task.status = 'COMPLETED';
      task.outputSummary = 'Optimized checkout flow recommendation.';

      const result = await workforceVerifier.verifyBusinessOutcome({
        task,
        metricKey: 'order_count',
      });

      expect(result.taskVerified).toBe(true);
      expect(['verified', 'pending', 'unresolved', 'conflicted']).toContain(
        result.businessOutcomeStatus
      );
      expect(result.evaluatedAt).toBeTruthy();
    });
  });

  describe('10. Autonomous Workforce Coordinator Facade', () => {
    it('returns system health status and registered manifests', () => {
      const health = autonomousWorkforceCoordinator.getHealthStatus();
      expect(health.activeWorkerCount).toBe(14);
      expect(health.maxDepth).toBe(2);
      expect(health.maxChildren).toBe(3);
      expect(health.killSwitchActive).toBe(false);
    });

    it('processes incoming signal through complete autonomous cycle', async () => {
      const cycle = await autonomousWorkforceCoordinator.processIncomingSignal(
        {
          sourceType: 'schedule',
          sourceId: 'morning_briefing_job',
          eventType: 'daily_revenue_check',
          payload: { revenueTarget: 50000 },
        },
        { dryRun: true }
      );

      expect(cycle.signal).toBeDefined();
      expect(cycle.goals.length).toBeGreaterThan(0);
      expect(cycle.status).toBe('COMPLETED');
      expect(cycle.runResult?.success).toBe(true);
      expect(cycle.verification?.taskVerified).toBe(true);
    });
  });
});
