import 'server-only';

import {
  ApprovalBinding,
  CandidateGoal,
  TaskVerificationResult,
  WorkforcePlan,
  WorkforceSignal,
  WorkforceTask,
} from './types';
import { getWorkforceConfig, isGlobalKillSwitchActive } from './config';
import { workforceSignalNormalizer } from './signals';
import { workforceGoalDiscovery } from './goal-discovery';
import { workforcePlanner } from './planner';
import { workforcePolicyEngine } from './policy-engine';
import { workforceDelegationBroker } from './delegation-broker';
import { workforceAgentRunner, WorkforceTaskRunResult } from './agent-runner';
import { workforceVerifier } from './verifier';
import { getAllWorkerManifests, getWorkerManifest } from './manifests';

export * from './types';
export * from './config';
export * from './manifests';
export * from './policy-engine';
export * from './signals';
export * from './goal-discovery';
export * from './planner';
export * from './delegation-broker';
export * from './agent-runner';
export * from './verifier';

export interface AutonomousWorkforceCycleResult {
  signal: WorkforceSignal;
  goals: CandidateGoal[];
  plan?: WorkforcePlan;
  runResult?: WorkforceTaskRunResult;
  verification?: TaskVerificationResult;
  status:
    | 'COMPLETED'
    | 'WAITING_APPROVAL'
    | 'REJECTED'
    | 'FAILED'
    | 'KILLED'
    | 'NO_GOALS';
  summary: string;
}

/**
 * AutonomousWorkforceCoordinator
 * Unified facade integrating Signals, Goal Discovery, Planner, Policy Engine, Runner, Delegation Broker, and Verifier.
 */
export class AutonomousWorkforceCoordinator {
  /**
   * Runs a complete end-to-end governed cycle for an incoming signal.
   */
  async processIncomingSignal(
    rawSignal: Partial<WorkforceSignal>,
    options: {
      approvalBinding?: ApprovalBinding;
      dryRun?: boolean;
    } = {}
  ): Promise<AutonomousWorkforceCycleResult> {
    const config = getWorkforceConfig();

    // 1. Kill switch check
    if (isGlobalKillSwitchActive()) {
      return {
        signal: rawSignal as WorkforceSignal,
        goals: [],
        status: 'KILLED',
        summary: 'Cycle aborted: global emergency kill switch is active.',
      };
    }

    // 2. Normalize and validate incoming signal
    const signal = workforceSignalNormalizer.normalizeSignal(rawSignal);

    // 3. Goal Discovery
    const goals = workforceGoalDiscovery.discoverGoalsFromSignal(signal);
    if (goals.length === 0) {
      return {
        signal,
        goals: [],
        status: 'NO_GOALS',
        summary: 'No viable goals discovered for incoming signal.',
      };
    }

    // Select highest priority goal
    const topGoal = goals[0];

    // 4. Generate plan
    const plan = workforcePlanner.createPlanForGoal(topGoal);
    if (plan.validationStatus === 'invalid') {
      return {
        signal,
        goals,
        plan,
        status: 'FAILED',
        summary: `Plan validation failed: ${(plan.validationErrors || []).join('; ')}`,
      };
    }

    // 5. Initialize task & execute through runner
    const task = workforceAgentRunner.createTask({
      workerId: topGoal.workerId,
      goalId: topGoal.goalId,
      objective: topGoal.objective,
      tier: topGoal.suggestedTier,
      correlationId: signal.correlationId,
    });

    const runResult = await workforceAgentRunner.executeTask(task, {
      steps: plan.steps,
      approvalBinding: options.approvalBinding,
      dryRun: options.dryRun ?? config.dryRun,
    });

    if (runResult.task.status === 'WAITING_APPROVAL') {
      return {
        signal,
        goals,
        plan,
        runResult,
        status: 'WAITING_APPROVAL',
        summary:
          runResult.error ||
          'Execution paused: exact owner approval binding required.',
      };
    }

    if (!runResult.success) {
      return {
        signal,
        goals,
        plan,
        runResult,
        status: 'FAILED',
        summary: runResult.error || 'Task execution failed.',
      };
    }

    // 6. Level 1 & Level 2 Verification
    const verification = await workforceVerifier.verifyBusinessOutcome({
      task: runResult.task,
      metricKey: plan.steps[0]?.action,
    });

    return {
      signal,
      goals,
      plan,
      runResult,
      verification,
      status: 'COMPLETED',
      summary: `Workforce cycle completed successfully. Task: ${runResult.task.taskId}, Outcome: ${verification.businessOutcomeStatus}.`,
    };
  }

  /**
   * Health status of the workforce subsystem.
   */
  getHealthStatus() {
    const config = getWorkforceConfig();
    const manifests = getAllWorkerManifests();
    return {
      enabled: config.enabled,
      dryRun: config.dryRun,
      killSwitchActive: isGlobalKillSwitchActive(),
      activeWorkerCount: manifests.length,
      maxDepth: config.maxDelegationDepth,
      maxChildren: config.maxConcurrentChildren,
    };
  }
}

export const autonomousWorkforceCoordinator =
  new AutonomousWorkforceCoordinator();
