import 'server-only';

import { randomUUID } from 'crypto';
import { CandidateGoal, PlanStep, WorkforcePlan } from './types';
import { getWorkerManifest } from './manifests';
import { workforcePolicyEngine } from './policy-engine';

export class WorkforcePlanner {
  /**
   * Validates a planned DAG to ensure acyclic dependencies and valid worker tool bindings.
   */
  validatePlanDAG(steps: PlanStep[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const stepMap = new Map<string, PlanStep>();

    for (const step of steps) {
      if (stepMap.has(step.stepId)) {
        errors.push(`Duplicate stepId '${step.stepId}'.`);
      }
      stepMap.set(step.stepId, step);
    }

    // 1. Check for dependency cycles using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycle = (currId: string): boolean => {
      visited.add(currId);
      recStack.add(currId);

      const step = stepMap.get(currId);
      if (step) {
        for (const depId of step.dependsOnStepIds) {
          if (!stepMap.has(depId)) {
            errors.push(`Step '${currId}' depends on unknown step '${depId}'.`);
            continue;
          }
          if (!visited.has(depId) && checkCycle(depId)) {
            return true;
          } else if (recStack.has(depId)) {
            errors.push(
              `Circular dependency detected involving step '${currId}' and '${depId}'.`
            );
            return true;
          }
        }
      }

      recStack.delete(currId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.stepId)) {
        checkCycle(step.stepId);
      }
    }

    // 2. Verify worker exists and tools are in allowlist
    for (const step of steps) {
      const manifest = getWorkerManifest(step.workerId);
      if (!manifest) {
        errors.push(
          `Step '${step.stepId}' references non-existent worker '${step.workerId}'.`
        );
        continue;
      }

      for (const tool of step.allowedTools) {
        if (!manifest.allowedTools.includes(tool)) {
          errors.push(
            `Step '${step.stepId}' requested tool '${tool}' which is not in worker '${step.workerId}' allowlist.`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates plan steps (alias for backward compatibility).
   */
  validatePlan(steps: PlanStep[]): { valid: boolean; errors: string[] } {
    const res = this.validatePlanDAG(steps);
    return {
      valid: res.isValid,
      errors: res.errors,
    };
  }

  /**
   * Creates a structured, typed task plan for an accepted goal.
   */
  createPlan(params: {
    goal: CandidateGoal;
    steps: PlanStep[];
    estimatedCostMinorUnits?: number;
  }): WorkforcePlan {
    const { goal, steps, estimatedCostMinorUnits = 100 } = params;

    const validation = this.validatePlanDAG(steps);

    // Assess overall risk
    let maxRiskLevel: 'low' | 'medium' | 'high' = 'low';
    for (const step of steps) {
      const risk = workforcePolicyEngine.classifyActionRisk(step.action);
      if (risk === 'destructive' || risk === 'financial') {
        maxRiskLevel = 'high';
        break;
      } else if (risk === 'external_side_effect') {
        maxRiskLevel = 'medium';
      }
    }

    return {
      planId: randomUUID(),
      goalId: goal.goalId,
      steps,
      totalEstimatedCost: estimatedCostMinorUnits,
      riskClassification: maxRiskLevel,
      validationStatus: validation.isValid ? 'valid' : 'invalid',
      validationErrors:
        validation.errors.length > 0 ? validation.errors : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Automatically derives a default bounded plan for a candidate goal.
   */
  createPlanForGoal(goal: CandidateGoal): WorkforcePlan {
    const manifest = getWorkerManifest(goal.workerId);
    const readOnlyTool = manifest?.allowedTools.find(
      (t) => workforcePolicyEngine.classifyActionRisk(t) === 'read_only'
    );
    const defaultTool =
      readOnlyTool || manifest?.allowedTools?.[0] || 'read_analytics';
    const allowedTools = manifest?.allowedTools || [defaultTool];

    const steps: PlanStep[] = [
      {
        stepId: `${goal.goalId}_step_1`,
        workerId: goal.workerId,
        action: defaultTool,
        allowedTools,
        dependsOnStepIds: [],
        riskCategory: workforcePolicyEngine.classifyActionRisk(defaultTool),
        autonomyTier: goal.suggestedTier,
        expectedOutputSchema: 'WorkerStructuredOutput',
        timeoutSeconds: manifest?.limits?.timeoutSeconds || 60,
      },
    ];

    return this.createPlan({
      goal,
      steps,
      estimatedCostMinorUnits: manifest?.limits?.maxCostMinorUnits || 100,
    });
  }
}

export const workforcePlanner = new WorkforcePlanner();
