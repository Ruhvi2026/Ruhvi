import 'server-only';

import { TaskVerificationResult, WorkforceTask } from './types';
import { getWorkerManifest } from './manifests';
import { measureAuthoritativeMetric } from '../closed-loop';
import { RsiReflectionEngine } from '../rsi/reflection-engine';
import { FailureClass } from '../rsi/types';

export interface Level1TaskCheckResult {
  taskVerified: boolean;
  reason: string;
  violations: string[];
}

export interface VerifyBusinessOutcomeParams {
  task: WorkforceTask;
  metricKey?: string;
  baselineValue?: number;
  targetValue?: number;
  direction?: 'increase' | 'decrease' | 'maintain';
  tolerancePercent?: number;
}

export class WorkforceVerifier {
  private rsiReflection = new RsiReflectionEngine();

  /**
   * Level 1: Task Verification.
   * Verifies execution conformance: status, checkpoints, output summary, and tool boundaries.
   */
  verifyTaskExecution(task: WorkforceTask): Level1TaskCheckResult {
    const violations: string[] = [];
    const manifest = getWorkerManifest(task.workerId);

    // 1. Completion status check
    if (task.status !== 'COMPLETED') {
      violations.push(`Task status is '${task.status}', expected 'COMPLETED'.`);
    }

    if (task.error) {
      violations.push(`Task contains error: ${task.error}`);
    }

    // 2. Output summary check
    if (!task.outputSummary || task.outputSummary.trim().length === 0) {
      violations.push('Task output summary is missing or empty.');
    }

    // 3. Tool boundary check against worker manifest
    if (manifest && task.checkpoints.length > 0) {
      for (const cp of task.checkpoints) {
        const action = cp.state?.action;
        if (action && !manifest.allowedTools.includes(action)) {
          violations.push(
            `Unauthorized tool executed: '${action}' is not in worker '${task.workerId}' allowlist.`
          );
        }
      }
    }

    const taskVerified = violations.length === 0;
    const reason = taskVerified
      ? 'Level 1 task verification passed: status, output, and tool boundaries conform to manifest.'
      : `Level 1 task verification failed with ${violations.length} violation(s).`;

    return {
      taskVerified,
      reason,
      violations,
    };
  }

  /**
   * Level 2: Business Outcome Verification.
   * Queries authoritative metric tables via closed-loop measurement, compares against baseline/target,
   * and dispatches candidate lessons to RSI Reflection Engine upon discrepancies.
   */
  async verifyBusinessOutcome(
    params: VerifyBusinessOutcomeParams
  ): Promise<TaskVerificationResult> {
    const {
      task,
      baselineValue = 0,
      targetValue,
      direction = 'increase',
      tolerancePercent = 10,
    } = params;

    const l1Result = this.verifyTaskExecution(task);
    const evaluatedAt = new Date().toISOString();

    if (!l1Result.taskVerified) {
      // Discard or record lesson for execution failure
      await this.safeRecordReflectionLesson(
        task,
        'tool_schema',
        `Task verification failed: ${l1Result.reason}`,
        l1Result.violations
      );

      return {
        taskId: task.taskId,
        taskVerified: false,
        businessOutcomeStatus: 'unresolved',
        reason: l1Result.reason,
        evaluatedAt,
      };
    }

    // Determine metricKey from input or worker owned KPIs
    const manifest = getWorkerManifest(task.workerId);
    const metricKey =
      params.metricKey || manifest?.ownedKpis?.[0]?.metricId || 'order_revenue';

    try {
      const measurement = await measureAuthoritativeMetric(metricKey);
      const measuredValue = measurement.currentValue;

      let status: 'verified' | 'unresolved' | 'conflicted' | 'pending' =
        'pending';
      let outcomeReason = '';

      if (targetValue !== undefined) {
        if (direction === 'increase') {
          if (measuredValue >= targetValue) {
            status = 'verified';
            outcomeReason = `Target achieved: measured ${measuredValue} >= target ${targetValue}.`;
          } else if (
            measuredValue <
            baselineValue * (1 - tolerancePercent / 100)
          ) {
            status = 'conflicted';
            outcomeReason = `Regressed below baseline tolerance: measured ${measuredValue} vs baseline ${baselineValue}.`;
          } else {
            status = 'pending';
            outcomeReason = `Progressing towards target: measured ${measuredValue}, target is ${targetValue}.`;
          }
        } else if (direction === 'decrease') {
          if (measuredValue <= targetValue) {
            status = 'verified';
            outcomeReason = `Target achieved: measured ${measuredValue} <= target ${targetValue}.`;
          } else if (
            measuredValue >
            baselineValue * (1 + tolerancePercent / 100)
          ) {
            status = 'conflicted';
            outcomeReason = `Exceeded baseline tolerance: measured ${measuredValue} vs baseline ${baselineValue}.`;
          } else {
            status = 'pending';
            outcomeReason = `Pending target reduction: measured ${measuredValue}, target is ${targetValue}.`;
          }
        } else {
          // Maintain
          const lower = baselineValue * (1 - tolerancePercent / 100);
          const upper = baselineValue * (1 + tolerancePercent / 100);
          if (measuredValue >= lower && measuredValue <= upper) {
            status = 'verified';
            outcomeReason = `Metric maintained within ±${tolerancePercent}%: measured ${measuredValue}.`;
          } else {
            status = 'conflicted';
            outcomeReason = `Metric deviated outside maintain tolerance: measured ${measuredValue}.`;
          }
        }
      } else {
        // Pure operational observation without strict numeric target
        status = 'verified';
        outcomeReason = `Authoritative metric '${metricKey}' measured at ${measuredValue}.`;
      }

      // If outcome conflicted or regressed, emit candidate lesson to RSI Reflection Engine
      if (status === 'conflicted') {
        await this.safeRecordReflectionLesson(
          task,
          'policy',
          `Business outcome conflicted for metric '${metricKey}': ${outcomeReason}`,
          [
            `task:${task.taskId}`,
            `metric:${metricKey}`,
            `measured:${measuredValue}`,
          ]
        );
      }

      return {
        taskId: task.taskId,
        taskVerified: true,
        businessOutcomeStatus: status,
        reason: outcomeReason,
        measuredData: {
          metricKey,
          measuredValue,
          details: measurement.details,
          sourceTable: measurement.sourceTable,
        },
        evaluatedAt,
      };
    } catch (err: any) {
      return {
        taskId: task.taskId,
        taskVerified: true,
        businessOutcomeStatus: 'unresolved',
        reason: `Failed to measure authoritative metric '${metricKey}': ${err.message || String(err)}`,
        evaluatedAt,
      };
    }
  }

  private async safeRecordReflectionLesson(
    task: WorkforceTask,
    failureClass: FailureClass,
    failureDescription: string,
    evidenceRefs: string[]
  ): Promise<void> {
    try {
      await this.rsiReflection.createCandidateLesson({
        failureClass,
        lesson: `Automated learning from task ${task.taskId} (${task.workerId}): ${failureDescription}`,
        observedFailure: failureDescription,
        hypothesis: `Adjust planning parameters or worker prompt constraints for ${task.workerId}.`,
        evidenceRefs: [`task:${task.taskId}`, ...evidenceRefs],
        initialConfidence: 0.5,
      });
    } catch {
      // Reflection logging must not fail verifier evaluation
    }
  }
}

export const workforceVerifier = new WorkforceVerifier();
