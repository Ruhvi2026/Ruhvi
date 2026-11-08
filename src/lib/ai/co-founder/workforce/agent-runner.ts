import 'server-only';

import { randomUUID } from 'crypto';
import {
  ApprovalBinding,
  AutonomyTier,
  PlanStep,
  TaskCheckpoint,
  TaskLifecycleState,
  WorkerId,
  WorkforceTask,
} from './types';
import { getWorkerManifest } from './manifests';
import {
  isDryRunEnabled,
  isGlobalKillSwitchActive,
  isWorkerActive,
} from './config';
import { workforcePolicyEngine } from './policy-engine';
import { WorkerRegistry } from '../workers/registry';
import { WorkerTaskInput, WorkerStructuredOutput } from '../workers/types';
import { getCofounderDataClient } from '../data-client';

export interface CreateTaskParams {
  workerId: WorkerId;
  goalId: string;
  objective: string;
  acceptanceCriteria?: string[];
  tier?: AutonomyTier;
  parentTaskId?: string;
  correlationId?: string;
}

export interface ExecuteTaskOptions {
  steps?: PlanStep[];
  input?: WorkerTaskInput;
  approvalBinding?: ApprovalBinding;
  dryRun?: boolean;
}

export interface WorkforceTaskRunResult {
  task: WorkforceTask;
  success: boolean;
  executedSteps: number;
  output?: WorkerStructuredOutput | Record<string, any>;
  error?: string;
}

export class WorkforceAgentRunner {
  private workerRegistry: WorkerRegistry;

  constructor(workerRegistry?: WorkerRegistry) {
    this.workerRegistry = workerRegistry || new WorkerRegistry();
  }

  /**
   * Initializes a governed WorkforceTask in PROPOSED state.
   */
  createTask(params: CreateTaskParams): WorkforceTask {
    const manifest = getWorkerManifest(params.workerId);
    const now = new Date().toISOString();

    return {
      taskId: `task_${randomUUID()}`,
      runId: `run_${randomUUID()}`,
      correlationId: params.correlationId || randomUUID(),
      parentTaskId: params.parentTaskId,
      workerId: params.workerId,
      goalId: params.goalId,
      objective: params.objective,
      acceptanceCriteria:
        params.acceptanceCriteria || (manifest ? manifest.successCriteria : []),
      status: 'PROPOSED',
      tier: params.tier || (manifest ? manifest.autonomyTier : 'T1'),
      currentStep: 0,
      checkpoints: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Executes a governed WorkforceTask under policy, budget, and checkpoint constraints.
   */
  async executeTask(
    task: WorkforceTask,
    options: ExecuteTaskOptions = {}
  ): Promise<WorkforceTaskRunResult> {
    const { steps = [], input, approvalBinding } = options;
    const effectiveDryRun = options.dryRun ?? isDryRunEnabled();
    const manifest = getWorkerManifest(task.workerId);

    // 1. Global kill switch check
    if (isGlobalKillSwitchActive()) {
      task.status = 'DEAD_LETTER';
      task.error =
        'Workforce execution halted: Global emergency kill switch is active.';
      task.updatedAt = new Date().toISOString();
      await this.safeRecordWorkerRun(task, 'dead_letter');
      return { task, success: false, executedSteps: 0, error: task.error };
    }

    // 2. Worker active / maintenance check
    if (!isWorkerActive(task.workerId)) {
      task.status = 'CANCELLED';
      task.error = `Worker '${task.workerId}' is currently disabled or in maintenance mode.`;
      task.updatedAt = new Date().toISOString();
      await this.safeRecordWorkerRun(task, 'cancelled');
      return { task, success: false, executedSteps: 0, error: task.error };
    }

    if (!manifest) {
      task.status = 'FAILED';
      task.error = `Manifest missing for worker '${task.workerId}'.`;
      task.updatedAt = new Date().toISOString();
      return { task, success: false, executedSteps: 0, error: task.error };
    }

    task.status = 'RUNNING';
    task.updatedAt = new Date().toISOString();
    await this.safeRecordWorkerRun(task, 'running');

    // 3. Step-by-step bounded execution
    const maxSteps = manifest.limits.maxSteps;
    const planSteps =
      steps.length > 0
        ? steps
        : this.generateDefaultSteps(task, manifest.allowedTools);

    let executedSteps = 0;
    let finalOutput: WorkerStructuredOutput | Record<string, any> | undefined;

    for (let i = 0; i < planSteps.length; i++) {
      if (executedSteps >= maxSteps) {
        task.status = 'PARTIAL';
        task.error = `Step limit reached: maximum allowed steps is ${maxSteps}.`;
        task.updatedAt = new Date().toISOString();
        await this.safeRecordWorkerRun(task, 'partial');
        return {
          task,
          success: false,
          executedSteps,
          output: finalOutput,
          error: task.error,
        };
      }

      const step = planSteps[i];
      task.currentStep = i + 1;

      // Policy engine evaluation before executing step action
      const policyDecision = workforcePolicyEngine.evaluateAction({
        workerId: task.workerId,
        toolName: step.action,
        payload: input?.parameters || {},
        approvalBinding,
      });

      if (policyDecision.decision === 'DENY') {
        task.status = 'FAILED';
        task.error = `Policy Denied step '${step.stepId}' (${step.action}): ${policyDecision.reason}`;
        task.updatedAt = new Date().toISOString();
        await this.safeRecordWorkerRun(task, 'failed');
        return { task, success: false, executedSteps, error: task.error };
      }

      if (policyDecision.decision === 'REQUIRE_APPROVAL') {
        task.status = 'WAITING_APPROVAL';
        task.error = `Approval Required for step '${step.stepId}' (${step.action}): ${policyDecision.reason}`;
        task.updatedAt = new Date().toISOString();
        await this.safeRecordWorkerRun(task, 'waiting_approval');
        return {
          task,
          success: false,
          executedSteps,
          error: task.error,
        };
      }

      // Step action authorized -> Execute step
      const startTime = Date.now();
      let toolStatus = 'success';
      let toolError: string | undefined;

      try {
        const workerInstance = this.workerRegistry.getWorker(task.workerId);
        if (workerInstance) {
          const taskInput: WorkerTaskInput = {
            task: task.objective,
            timeframe: input?.timeframe || '30d',
            parameters: {
              ...(input?.parameters || {}),
              stepId: step.stepId,
              action: step.action,
            },
            userId: input?.userId,
            userRole: input?.userRole,
            channel: input?.channel || 'text',
            dryRun: effectiveDryRun,
          };

          const workerResult = await workerInstance.execute(taskInput);
          finalOutput = workerResult;
          task.outputSummary =
            workerResult.executiveVoiceSummary || workerResult.requiredAction;
        } else {
          finalOutput = {
            executedAction: step.action,
            simulated: effectiveDryRun,
            timestamp: new Date().toISOString(),
          };
          task.outputSummary = `Executed action: ${step.action}`;
        }
      } catch (err: any) {
        toolStatus = 'error';
        toolError = err.message || String(err);
        task.status = 'FAILED';
        task.error = `Error executing step '${step.stepId}': ${toolError}`;
        task.updatedAt = new Date().toISOString();
        await this.safeRecordToolEvent(
          task,
          step.action,
          Date.now() - startTime,
          toolStatus,
          toolError
        );
        await this.safeRecordWorkerRun(task, 'failed');
        return { task, success: false, executedSteps, error: task.error };
      }

      const durationMs = Date.now() - startTime;
      await this.safeRecordToolEvent(task, step.action, durationMs, toolStatus);

      // Save step checkpoint
      const checkpoint: TaskCheckpoint = {
        stepIndex: task.currentStep,
        state: {
          stepId: step.stepId,
          action: step.action,
          executedAt: new Date().toISOString(),
          dryRun: effectiveDryRun,
        },
        timestamp: new Date().toISOString(),
      };
      task.checkpoints.push(checkpoint);
      executedSteps++;
    }

    // All steps executed successfully
    task.status = 'COMPLETED';
    task.updatedAt = new Date().toISOString();
    await this.safeRecordWorkerRun(task, 'completed');

    return {
      task,
      success: true,
      executedSteps,
      output: finalOutput,
    };
  }

  private generateDefaultSteps(
    task: WorkforceTask,
    allowedTools: string[]
  ): PlanStep[] {
    const readOnlyTool = allowedTools.find(
      (t) => workforcePolicyEngine.classifyActionRisk(t) === 'read_only'
    );
    const defaultAction = readOnlyTool || allowedTools[0] || 'analyze';
    return [
      {
        stepId: `${task.taskId}_step_1`,
        workerId: task.workerId,
        action: defaultAction,
        allowedTools,
        dependsOnStepIds: [],
        riskCategory: workforcePolicyEngine.classifyActionRisk(defaultAction),
        autonomyTier: task.tier,
        expectedOutputSchema: 'WorkerStructuredOutput',
        timeoutSeconds: 60,
      },
    ];
  }

  private async safeRecordWorkerRun(
    task: WorkforceTask,
    status:
      | 'running'
      | 'completed'
      | 'failed'
      | 'dead_letter'
      | 'cancelled'
      | 'waiting_approval'
      | 'partial'
  ): Promise<void> {
    try {
      const client = getCofounderDataClient();
      const payloadStatus: 'running' | 'completed' | 'failed' =
        status === 'completed'
          ? 'completed'
          : status === 'running'
            ? 'running'
            : 'failed';

      await client.recordWorkerRun({
        run_id: task.runId,
        worker_id: task.workerId,
        parent_worker_id: task.parentTaskId ? 'supervisor' : null,
        status: payloadStatus,
        output_summary: task.outputSummary || task.error,
      });
    } catch {
      // Telemetry error must not break business logic
    }
  }

  private async safeRecordToolEvent(
    task: WorkforceTask,
    toolName: string,
    durationMs: number,
    status: string,
    error?: string
  ): Promise<void> {
    try {
      const client = getCofounderDataClient();
      await client.recordToolEvent({
        run_id: task.runId,
        worker_id: task.workerId,
        tool_name: toolName,
        latency_ms: durationMs,
        success: status === 'success',
        error_code: error ? 'TOOL_EXECUTION_ERROR' : undefined,
      });
    } catch {
      // Fail-safe telemetry
    }
  }
}

export const workforceAgentRunner = new WorkforceAgentRunner();
