import 'server-only';

import { WorkerId, WorkerStructuredOutput, WorkerTaskInput } from './types';
import { workerRegistry } from './registry';
import { createApprovalRequest } from '@/lib/ai/co-founder/approvals';
import {
  CoFounderExecutionPlan,
  DecomposePlanOptions,
  GoalIntent,
  PlannedWorkerStep,
  decomposeGoalIntoPlan,
  validateExecutionPlan,
} from './intelligent-planner';
import { EventNormalizer, PerformanceDataAccess } from './performance';
import { getRsiCoordinator } from '../rsi';

export interface DispatchResponse {
  workerId: WorkerId;
  workerName: string;
  result: WorkerStructuredOutput;
  coFounderAnalysis: {
    problemStatement: string;
    evidenceSummary: string;
    strategicRecommendation: string;
    expectedImpact: string;
    approvalRequired: boolean;
    pendingApprovalId?: string;
  };
  summaryForVoice: string;
}

/**
 * AI Co-Founder Dynamic Worker Dispatcher
 *
 * Directs incoming tasks from the AI Co-Founder to the specialized Worker,
 * evaluates the returned structured findings, triggers human-in-the-loop
 * approval when business-impacting actions are recommended, and formats
 * executive voice/text responses.
 */
export async function dispatchWorkerTask(
  workerIdOrQuery: WorkerId | 'auto' | string,
  input: WorkerTaskInput
): Promise<DispatchResponse> {
  // 1. Resolve target worker (explicit ID vs dynamic semantic routing)
  let worker = workerRegistry.getWorker(workerIdOrQuery as WorkerId);

  if (!worker) {
    // Dynamic routing based on task text
    worker = workerRegistry.findWorkerForTask(
      workerIdOrQuery === 'auto'
        ? input.task
        : `${workerIdOrQuery} ${input.task}`
    );
  }

  // 2. Execute assigned task on worker with performance instrumentation
  const startTime = Date.now();
  let result: WorkerStructuredOutput;
  try {
    result = await worker.execute(input);
  } catch (executionErr: any) {
    const durationMs = Date.now() - startTime;
    // Asynchronously record failure event without interrupting error throw (PERF-06)
    try {
      const taskId =
        input.parameters?.taskId || `task_${worker.id}_${Date.now()}`;
      const perfEvent = EventNormalizer.normalizeAIWorkerEvent({
        workerId: worker.id,
        taskId,
        taskTitle: input.task,
        status: 'failed',
        durationMs,
        retryCount: 0,
        verificationPassed: false,
        evidenceRefs: [executionErr?.message || 'Execution error'],
      });
      await PerformanceDataAccess.recordEvent(perfEvent);
    } catch (perfErr) {
      console.error(
        '[Dispatcher] Performance failure event recording error:',
        perfErr
      );
    }

    // RSI Execution Observation Lifecycle Hook (RSI-01)
    try {
      const rsi = getRsiCoordinator();
      if (rsi.config.enabled && rsi.config.observerEnabled) {
        await rsi.observer.recordObservation({
          runId: `run_${worker.id}_${Date.now()}`,
          workerId: worker.id,
          taskType: input.task || 'worker_execution',
          latencyMs: durationMs,
          success: false,
          toolCallsCount: 0,
          errorClass: executionErr?.name || 'ExecutionError',
          metadata: {
            errorMessage: executionErr?.message,
          },
        });
      }
    } catch (rsiErr) {
      console.warn(
        '[RSI Coordinator] Lifecycle failure observation error:',
        rsiErr
      );
    }

    throw executionErr;
  }

  const durationMs = Date.now() - startTime;

  // Truthfully map execution outcomes (PERF-01: pending approval is NOT verified success)
  const isExecuted =
    result.executionStatus === 'executed' ||
    result.executionStatus === 'approved';
  const isPending =
    result.executionStatus === 'pending_approval' ||
    (result.requiredApproval && !isExecuted);
  const isFailed = result.executionStatus === 'failed';

  let workerStatus: 'succeeded' | 'failed' | 'blocked' = 'succeeded';
  let verificationPassed: boolean | undefined = undefined;

  if (isFailed) {
    workerStatus = 'failed';
    verificationPassed = false;
  } else if (isPending) {
    workerStatus = 'blocked';
    verificationPassed = undefined; // Human approval pending, NOT verified success!
  } else if (isExecuted) {
    workerStatus = 'succeeded';
    verificationPassed = true;
  }

  // Record completion event (PERF-06: await persistence)
  try {
    const taskId =
      input.parameters?.taskId || `task_${worker.id}_${Date.now()}`;
    const perfEvent = EventNormalizer.normalizeAIWorkerEvent({
      workerId: worker.id,
      taskId,
      taskTitle: input.task,
      status: workerStatus,
      durationMs,
      retryCount: 0,
      verificationPassed,
      approvalRequired: result.requiredApproval,
      approvalGranted: isExecuted,
      evidenceRefs: result.evidence || [],
      blockerReason: isPending ? 'AWAITING_HUMAN_APPROVAL' : undefined,
    });
    await PerformanceDataAccess.recordEvent(perfEvent);
  } catch (perfErr) {
    console.error(
      '[Dispatcher] Performance completion event recording error:',
      perfErr
    );
  }

  // RSI Execution Observation Lifecycle Hook (RSI-01)
  try {
    const rsi = getRsiCoordinator();
    if (rsi.config.enabled && rsi.config.observerEnabled) {
      await rsi.observer.recordObservation({
        runId: `run_${worker.id}_${Date.now()}`,
        workerId: worker.id,
        taskType: input.task || 'worker_execution',
        latencyMs: durationMs,
        success: isExecuted,
        toolCallsCount: 0,
        metadata: {
          executionStatus: result.executionStatus,
          requiredApproval: result.requiredApproval,
        },
      });
    }
  } catch (rsiErr) {
    console.warn(
      '[RSI Coordinator] Lifecycle completion observation error:',
      rsiErr
    );
  }

  // 3. Human-in-the-Loop Gating:
  // If worker recommends an action requiring approval, register approval request
  let pendingApprovalId: string | undefined;

  if (
    result.requiredApproval &&
    result.executionStatus === 'pending_approval'
  ) {
    try {
      const approval = await createApprovalRequest({
        actionType: (input.parameters?.action_type || 'worker_action') as any,
        actionPayload: {
          workerId: worker.id,
          task: input.task,
          requiredAction: result.requiredAction,
          parameters: input.parameters,
        },
        scopeDescription: result.expectedImpact || 'Worker execution approval',
        requestedBy: worker.name,
      });
      if (approval.success && approval.approvalId) {
        pendingApprovalId = approval.approvalId;
      } else {
        throw new Error(approval.error || 'Approval request creation failed');
      }
    } catch (err: any) {
      // Per Section 5.1 & WF-GAP-013: Fail closed! Never synthesize simulated approval ID.
      result.executionStatus = 'failed';
      result.problems = [
        ...(result.problems || []),
        `APPROVAL_CREATION_FAILED: ${err?.message || 'Could not register durable approval request'}`,
      ];
    }
  }

  // 4. Co-Founder Evaluation & Synthesis
  const problemStatement =
    result.problems.length > 0
      ? result.problems.join('; ')
      : 'No critical operational problems detected.';

  const evidenceSummary =
    result.evidence.length > 0
      ? result.evidence.join('; ')
      : 'Based on live database records and standard jewellery operational benchmarks.';

  const strategicRecommendation =
    result.recommendations.length > 0
      ? result.recommendations.join('; ')
      : 'Maintain current operational baseline.';

  const coFounderAnalysis = {
    problemStatement,
    evidenceSummary,
    strategicRecommendation,
    expectedImpact: result.expectedImpact,
    approvalRequired: result.requiredApproval,
    pendingApprovalId,
  };

  const summaryForVoice =
    result.executiveVoiceSummary ||
    `${worker.name} completed task "${input.task}". ${result.recommendations[0] || 'Findings recorded.'}`;

  return {
    workerId: worker.id,
    workerName: worker.name,
    result,
    coFounderAnalysis,
    summaryForVoice,
  };
}

/**
 * Returns complete operational register of all 14 AI Agent Workers
 * Returns truthful REGISTERED state per Section 5.5 / WF-GAP-016
 */
export function getWorkerRegistryStatus() {
  const workers = workerRegistry.getAllWorkers();
  return {
    totalWorkers: workers.length,
    workers: workers.map((w) => {
      const def = w.getDefinition();
      return {
        id: def.id,
        name: def.name,
        role: def.role,
        priority: def.priority,
        isSystemWorker: def.isSystemWorker,
        responsibilitiesCount: def.responsibilities.length,
        requiredTools: def.requiredTools,
        status: 'REGISTERED',
        runtimeState: 'NOT_YET_RUN',
      };
    }),
  };
}

export interface MultiWorkerStepExecutionRecord {
  stepId: string;
  workerId: WorkerId;
  workerName: string;
  title: string;
  stageIndex: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING_APPROVAL' | 'SKIPPED';
  output?: WorkerStructuredOutput;
  error?: string;
  pendingApprovalId?: string;
}

export interface MultiWorkerPlanExecutionResult {
  planId: string;
  userGoal: string;
  intent: GoalIntent;
  status: 'COMPLETED' | 'PAUSED_FOR_APPROVAL' | 'FAILED' | 'PARTIAL';
  stagesCompleted: number;
  totalStages: number;
  stepsExecuted: MultiWorkerStepExecutionRecord[];
  aggregatedFindings: string[];
  aggregatedProblems: string[];
  aggregatedRecommendations: string[];
  approvalRequired: boolean;
  pendingApprovalIds: string[];
  summaryForVoice: string;
  executiveSummary: string;
  timestamp: string;
}

/**
 * Executes a multi-worker, dependency-ordered CoFounderExecutionPlan
 * across the AI workforce, running parallel-safe stages concurrently and
 * pausing on human-in-the-loop approval boundaries.
 */
export async function executeMultiWorkerPlan(
  planOrGoal: CoFounderExecutionPlan | string,
  options?: DecomposePlanOptions
): Promise<MultiWorkerPlanExecutionResult> {
  const plan: CoFounderExecutionPlan =
    typeof planOrGoal === 'string'
      ? decomposeGoalIntoPlan(planOrGoal, options)
      : planOrGoal;

  // Section 5.2 & WF-GAP-008: Validate execution plan before dispatch; fail closed if conflicts or cycles detected
  const validation = validateExecutionPlan(plan);
  if (!validation.valid) {
    return {
      planId: plan.planId,
      userGoal: plan.userGoal,
      intent: plan.intent,
      status: 'FAILED',
      stagesCompleted: 0,
      totalStages: plan.stages.length,
      stepsExecuted: (plan.allSteps || []).map((step) => ({
        stepId: step.stepId,
        workerId: step.workerId,
        workerName: step.workerName,
        title: step.title,
        stageIndex: step.stageIndex,
        status: 'FAILED',
        error: `Plan validation failed: ${validation.errors.join('; ')}`,
      })),
      aggregatedFindings: [],
      aggregatedProblems: validation.errors,
      aggregatedRecommendations: [
        'Refine execution plan to resolve dependency/safety conflicts.',
      ],
      approvalRequired: false,
      pendingApprovalIds: [],
      summaryForVoice: `Execution rejected: plan contains ${validation.errors.length} safety conflict(s).`,
      executiveSummary: `Multi-worker execution halted before launch due to plan validation failure:\n- ${validation.errors.join('\n- ')}`,
      timestamp: new Date().toISOString(),
    };
  }

  const recordsMap = new Map<string, MultiWorkerStepExecutionRecord>();
  const pendingApprovalIds: string[] = [];
  let stagesCompleted = 0;
  let hasApprovalPause = false;

  for (const stage of plan.stages) {
    if (hasApprovalPause) {
      for (const step of stage.steps) {
        recordsMap.set(step.stepId, {
          stepId: step.stepId,
          workerId: step.workerId,
          workerName: step.workerName,
          title: step.title,
          stageIndex: step.stageIndex,
          status: 'SKIPPED',
          error: 'Skipped pending prior stage human approval',
        });
      }
      continue;
    }

    const executeSingleStep = async (
      step: PlannedWorkerStep
    ): Promise<MultiWorkerStepExecutionRecord> => {
      // 1. Check prerequisite dependencies
      for (const depId of step.dependsOn) {
        const depRecord = recordsMap.get(depId);
        if (
          !depRecord ||
          depRecord.status === 'FAILED' ||
          depRecord.status === 'PENDING_APPROVAL' ||
          depRecord.status === 'SKIPPED'
        ) {
          return {
            stepId: step.stepId,
            workerId: step.workerId,
            workerName: step.workerName,
            title: step.title,
            stageIndex: step.stageIndex,
            status: 'SKIPPED',
            error: `Prerequisite step ${depId} was not completed (${depRecord?.status || 'missing'}).`,
          };
        }
      }

      // 2. Gating: Step requiring approval before execution
      if (step.requiresApproval) {
        let pendingApprovalId: string | undefined;
        try {
          const approval = await createApprovalRequest({
            actionType: (step.actionType || 'worker_action') as any,
            actionPayload: {
              workerId: step.workerId,
              stepId: step.stepId,
              title: step.title,
              task: step.task,
              parameters: step.parameters || options?.parameters,
            },
            scopeDescription: step.title,
            requestedBy: step.workerName,
          });
          if (approval.success && approval.approvalId) {
            pendingApprovalId = approval.approvalId;
          } else {
            throw new Error(
              approval.error || 'Approval request creation failed'
            );
          }
        } catch (err: any) {
          // Fail closed! Never synthesize a fake approval ID.
          return {
            stepId: step.stepId,
            workerId: step.workerId,
            workerName: step.workerName,
            title: step.title,
            stageIndex: step.stageIndex,
            status: 'FAILED',
            error: `APPROVAL_CREATION_FAILED: ${err?.message || 'Failed to create durable approval request'}`,
          };
        }

        if (pendingApprovalId) {
          pendingApprovalIds.push(pendingApprovalId);
        }

        return {
          stepId: step.stepId,
          workerId: step.workerId,
          workerName: step.workerName,
          title: step.title,
          stageIndex: step.stageIndex,
          status: 'PENDING_APPROVAL',
          pendingApprovalId,
        };
      }

      // 3. Worker execution
      const worker =
        workerRegistry.getWorker(step.workerId) ||
        workerRegistry.findWorkerForTask(step.task);

      try {
        const output = await worker.execute({
          task: step.task,
          timeframe: options?.timeframe,
          parameters: step.parameters || options?.parameters,
          userId: options?.userId,
          userRole: options?.userRole,
          channel: options?.channel,
          dryRun: options?.dryRun,
        });

        let pendingApprovalId: string | undefined;
        if (
          output.requiredApproval &&
          output.executionStatus === 'pending_approval'
        ) {
          try {
            const approval = await createApprovalRequest({
              actionType: (step.actionType || 'worker_action') as any,
              actionPayload: {
                workerId: worker.id,
                stepId: step.stepId,
                title: step.title,
                requiredAction: output.requiredAction,
                parameters: step.parameters || options?.parameters,
              },
              scopeDescription: output.expectedImpact || step.title,
              requestedBy: worker.name,
            });
            if (approval.success && approval.approvalId) {
              pendingApprovalId = approval.approvalId;
            } else {
              throw new Error(
                approval.error || 'Approval request creation failed'
              );
            }
          } catch (err: any) {
            return {
              stepId: step.stepId,
              workerId: step.workerId,
              workerName: worker.name,
              title: step.title,
              stageIndex: step.stageIndex,
              status: 'FAILED',
              output,
              error: `APPROVAL_CREATION_FAILED: ${err?.message || 'Failed to register approval request'}`,
            };
          }

          if (pendingApprovalId) {
            pendingApprovalIds.push(pendingApprovalId);
          }

          return {
            stepId: step.stepId,
            workerId: step.workerId,
            workerName: worker.name,
            title: step.title,
            stageIndex: step.stageIndex,
            status: 'PENDING_APPROVAL',
            output,
            pendingApprovalId,
          };
        }

        return {
          stepId: step.stepId,
          workerId: step.workerId,
          workerName: worker.name,
          title: step.title,
          stageIndex: step.stageIndex,
          status: 'SUCCESS',
          output,
        };
      } catch (err: any) {
        return {
          stepId: step.stepId,
          workerId: step.workerId,
          workerName: worker.name,
          title: step.title,
          stageIndex: step.stageIndex,
          status: 'FAILED',
          error: err?.message || 'Worker execution failed',
        };
      }
    };

    if (stage.isParallelStage && stage.steps.length > 1) {
      // Bound stage concurrency to max 2 concurrent runs per Section 5.3 / WF-GAP-019
      const concurrencyLimit = 2;
      for (let i = 0; i < stage.steps.length; i += concurrencyLimit) {
        const chunk = stage.steps.slice(i, i + concurrencyLimit);
        const results = await Promise.allSettled(
          chunk.map((s) => executeSingleStep(s))
        );
        for (let j = 0; j < chunk.length; j++) {
          const step = chunk[j];
          const res = results[j];
          if (res.status === 'fulfilled') {
            recordsMap.set(step.stepId, res.value);
            if (res.value.status === 'PENDING_APPROVAL') {
              hasApprovalPause = true;
            }
          } else {
            recordsMap.set(step.stepId, {
              stepId: step.stepId,
              workerId: step.workerId,
              workerName: step.workerName,
              title: step.title,
              stageIndex: step.stageIndex,
              status: 'FAILED',
              error: res.reason?.message || 'Parallel execution failed',
            });
          }
        }
      }
    } else {
      for (const step of stage.steps) {
        const record = await executeSingleStep(step);
        recordsMap.set(step.stepId, record);
        if (record.status === 'PENDING_APPROVAL') {
          hasApprovalPause = true;
        }
      }
    }

    stagesCompleted++;
  }

  // Synthesize outputs
  const allExecuted = Array.from(recordsMap.values());
  const successfulSteps = allExecuted.filter(
    (r) => r.status === 'SUCCESS' && r.output
  );

  const rawFindings = successfulSteps.flatMap((r) => r.output!.findings);
  const rawProblems = successfulSteps.flatMap((r) => r.output!.problems);
  const rawRecommendations = successfulSteps.flatMap(
    (r) => r.output!.recommendations
  );

  const aggregatedFindings = Array.from(new Set(rawFindings)).slice(0, 10);
  const aggregatedProblems = Array.from(new Set(rawProblems)).slice(0, 10);
  const aggregatedRecommendations = Array.from(
    new Set(rawRecommendations)
  ).slice(0, 10);

  const anyFailed = allExecuted.some((r) => r.status === 'FAILED');
  const anyPaused = pendingApprovalIds.length > 0;

  const status = anyPaused
    ? 'PAUSED_FOR_APPROVAL'
    : anyFailed
      ? successfulSteps.length > 0
        ? 'PARTIAL'
        : 'FAILED'
      : 'COMPLETED';

  const approvalRequired = pendingApprovalIds.length > 0;

  const summaryForVoice = anyPaused
    ? `Completed initial analysis across ${successfulSteps.length} workers. Step "${allExecuted.find((s) => s.status === 'PENDING_APPROVAL')?.title || 'action'}" requires your approval before proceeding.`
    : `Completed multi-worker plan for "${plan.userGoal}". ${aggregatedRecommendations[0] || 'Findings synthesized.'}`;

  const executiveSummary = [
    `### Multi-Worker Execution Plan (${plan.intent})`,
    `**Goal:** ${plan.userGoal}`,
    `**Status:** ${status} (${stagesCompleted}/${plan.stages.length} stages)`,
    '',
    '**Steps:**',
    ...allExecuted.map(
      (s) =>
        `- [${s.status}] **${s.workerName}**: ${s.title}${s.pendingApprovalId ? ` *(Pending Approval: ${s.pendingApprovalId})*` : ''}`
    ),
    '',
    aggregatedProblems.length > 0
      ? `**Detected Problems:**\n${aggregatedProblems.map((p) => `- ${p}`).join('\n')}\n`
      : '',
    aggregatedRecommendations.length > 0
      ? `**Strategic Recommendations:**\n${aggregatedRecommendations.map((r) => `- ${r}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    planId: plan.planId,
    userGoal: plan.userGoal,
    intent: plan.intent,
    status,
    stagesCompleted,
    totalStages: plan.stages.length,
    stepsExecuted: allExecuted,
    aggregatedFindings,
    aggregatedProblems,
    aggregatedRecommendations,
    approvalRequired,
    pendingApprovalIds,
    summaryForVoice,
    executiveSummary,
    timestamp: new Date().toISOString(),
  };
}
