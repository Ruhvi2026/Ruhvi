// src/lib/ai/co-founder/workforce/__tests__/phase8-governance-and-reliability.test.ts
//
// Comprehensive Phase 8 Test Suite:
// Validates explicit typed action registry, cryptographic approval bindings,
// replay protection, distributed state store, timeout budgets, and idempotency.

jest.mock('server-only', () => ({}));

import { workforcePolicyEngine, computePayloadHash } from '../policy-engine';
import {
  ACTION_RISK_REGISTRY,
  getActionRiskCategory,
} from '../action-registry';
import {
  isGlobalKillSwitchActive,
  isWorkerActive,
  setGlobalKillSwitch,
  setWorkerMaintenance,
  clearAllWorkerMaintenance,
} from '../config';
import { workforceStateStore } from '../state-store';
import { distributedIdempotencyStore } from '../idempotency';
import { workforceAgentRunner } from '../agent-runner';

describe('Phase 8: Workforce Governance, Reliability and Distributed Controls', () => {
  beforeEach(() => {
    setGlobalKillSwitch(false);
    clearAllWorkerMaintenance();
    workforcePolicyEngine.reset();
    workforceStateStore.reset();
    distributedIdempotencyStore.reset();
  });

  describe('1. Explicit Typed Action Registry & Fail-Closed Unknowns', () => {
    test('returns exact risk category for known actions', () => {
      expect(getActionRiskCategory('delete_product')).toBe('destructive');
      expect(getActionRiskCategory('compute_gstr3b_summary')).toBe('financial');
      expect(getActionRiskCategory('adjust_stock_level')).toBe(
        'external_side_effect'
      );
      expect(getActionRiskCategory('create_task_draft')).toBe('internal_write');
      expect(getActionRiskCategory('query_analytics')).toBe('read_only');
      expect(getActionRiskCategory('web_search')).toBe('read_only');
    });

    test('returns undefined for unknown or malicious action names', () => {
      expect(
        getActionRiskCategory('arbitrary_malicious_shell_exec')
      ).toBeUndefined();
      expect(getActionRiskCategory('unknown_mutation_action')).toBeUndefined();
      expect(getActionRiskCategory('')).toBeUndefined();
    });

    test('policy engine strictly defaults unknown actions to DENY (never read_only)', () => {
      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_analytics_performance',
        toolName: 'unknown_unregistered_action',
      });

      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('not permitted');
    });
  });

  describe('2. Cryptographic Approval Binding Verification', () => {
    const payload = { sku: 'RUV-RING-01', newStock: 120 };
    const validHash = computePayloadHash(payload);

    test('valid approval binding with fresh nonce authorizes mutation', () => {
      const binding = {
        approvalId: 'app_valid_101',
        actionType: 'adjust_stock_level',
        targetResource: 'inventory:RUV-RING-01',
        payloadHash: validHash,
        actor: 'founder@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        nonce: 'nonce_unique_101',
      };

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'founder@ruhvi.in',
      });

      expect(decision.decision).toBe('ALLOW');
      expect(decision.reason).toContain('verified with valid owner approval');
    });

    test('rejects expired approval binding', () => {
      const binding = {
        approvalId: 'app_expired_102',
        actionType: 'adjust_stock_level',
        targetResource: 'inventory:RUV-RING-01',
        payloadHash: validHash,
        actor: 'founder@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        nonce: 'nonce_unique_102',
      };

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'founder@ruhvi.in',
      });

      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('expired');
    });

    test('rejects altered payload hash (tampering detection)', () => {
      const binding = {
        approvalId: 'app_tampered_103',
        actionType: 'adjust_stock_level',
        targetResource: 'inventory:RUV-RING-01',
        payloadHash: 'forged_deadbeef_hash',
        actor: 'founder@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        nonce: 'nonce_unique_103',
      };

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'founder@ruhvi.in',
      });

      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('payload hash mismatch');
    });

    test('rejects approval binding when actor user does not match requester', () => {
      const binding = {
        approvalId: 'app_wrong_user_104',
        actionType: 'adjust_stock_level',
        targetResource: 'inventory:RUV-RING-01',
        payloadHash: validHash,
        actor: 'founder@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        nonce: 'nonce_unique_104',
      };

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'unauthorized_hacker@ruhvi.in',
      });

      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('actor mismatch');
    });

    test('rejects approval binding when actionType does not match requested tool', () => {
      const binding = {
        approvalId: 'app_wrong_action_105',
        actionType: 'update_product_stock', // Mismatched action
        targetResource: 'inventory:RUV-RING-01',
        payloadHash: validHash,
        actor: 'founder@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        nonce: 'nonce_unique_105',
      };

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'founder@ruhvi.in',
      });

      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('does not match requested tool');
    });

    test('rejects replayed approval binding nonce (replay protection)', () => {
      const binding = {
        approvalId: 'app_replay_106',
        actionType: 'adjust_stock_level',
        targetResource: 'inventory:RUV-RING-01',
        payloadHash: validHash,
        actor: 'founder@ruhvi.in',
        riskCategory: 'external_side_effect' as const,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        nonce: 'nonce_single_use_106',
      };

      // 1st consumption: ALLOW
      const firstDecision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'founder@ruhvi.in',
      });
      expect(firstDecision.decision).toBe('ALLOW');

      // 2nd consumption with identical nonce: strictly DENY
      const replayDecision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_inventory',
        toolName: 'adjust_stock_level',
        payload,
        approvalBinding: binding,
        userId: 'founder@ruhvi.in',
      });
      expect(replayDecision.decision).toBe('DENY');
      expect(replayDecision.reason).toContain('replay attack detected');
    });
  });

  describe('3. Distributed State Store & Kill Switch Sync', () => {
    test('global kill switch halts execution across policy and runner', () => {
      setGlobalKillSwitch(true);
      expect(isGlobalKillSwitchActive()).toBe(true);

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_analytics_performance',
        toolName: 'read_analytics',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('kill switch is currently active');
    });

    test('worker maintenance disables target worker while other workers remain active', () => {
      setWorkerMaintenance('worker_marketing', true);

      expect(isWorkerActive('worker_marketing')).toBe(false);
      expect(isWorkerActive('worker_seo')).toBe(true);

      const decision = workforcePolicyEngine.evaluateAction({
        workerId: 'worker_marketing',
        toolName: 'read_analytics',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.reason).toContain('maintenance mode');
    });
  });

  describe('4. Timeout Budgets & Execution Cancellation', () => {
    test('marks task as TIMED_OUT when signal is pre-aborted', async () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_timeout_1',
        objective: 'Analyze high latency traffic spikes',
      });

      const controller = new AbortController();
      controller.abort(); // Pre-abort signal

      const result = await workforceAgentRunner.executeTask(task, {
        signal: controller.signal,
      });

      expect(result.success).toBe(false);
      expect(result.task.status).toBe('TIMED_OUT');
      expect(result.error).toContain('timed out or cancelled');
    });
  });

  describe('5. Distributed Idempotency at Entry Boundary', () => {
    test('returns cached result and executes 0 steps when idempotency key is matched', async () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_idempotent_1',
        objective: 'Audit daily conversion rate',
      });

      // Seed idempotency store
      const cachedResult = {
        workerId: 'worker_analytics_performance',
        workerName: 'Analytics Specialist',
        sourceMode: 'cached',
        outputSummary: 'Cached audit response',
      };
      await distributedIdempotencyStore.recordIdempotency(
        'idem_key_analytics_123',
        cachedResult
      );

      const result = await workforceAgentRunner.executeTask(task, {
        idempotencyKey: 'idem_key_analytics_123',
      });

      expect(result.success).toBe(true);
      expect(result.executedSteps).toBe(0);
      expect(result.task.status).toBe('COMPLETED');
      expect(result.task.outputSummary).toBe('Cached audit response');
    });
  });

  describe('6. Visible DryRun & Dead-Letter Replay Handling', () => {
    test('tags simulated and dryRun properties on dry-run execution output', async () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_analytics_performance',
        goalId: 'goal_dry_1',
        objective: 'Test dry-run output tagging',
      });

      const result = await workforceAgentRunner.executeTask(task, {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect((result.output as any).dryRun).toBe(true);
      expect((result.output as any).sourceMode).toBe('simulated');
    });

    test('replayDeadLetterTask cleanly resets a failed or timed-out task to PROPOSED', () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_inventory',
        goalId: 'goal_replay_1',
        objective: 'Re-run inventory reconciliation',
      });

      task.status = 'TIMED_OUT';
      task.error = 'Timeout budget exceeded';
      task.currentStep = 2;

      const replayed = workforceAgentRunner.replayDeadLetterTask(task);

      expect(replayed.status).toBe('PROPOSED');
      expect(replayed.error).toBeUndefined();
      expect(replayed.currentStep).toBe(0);
      expect(replayed.runId).not.toBe(task.runId);
    });

    test('replayDeadLetterTask refuses to replay COMPLETED tasks', () => {
      const task = workforceAgentRunner.createTask({
        workerId: 'worker_inventory',
        goalId: 'goal_replay_completed',
        objective: 'Check completed task',
      });
      task.status = 'COMPLETED';

      expect(() => workforceAgentRunner.replayDeadLetterTask(task)).toThrow(
        /Only DEAD_LETTER, FAILED, or TIMED_OUT tasks can be replayed/
      );
    });
  });
});
