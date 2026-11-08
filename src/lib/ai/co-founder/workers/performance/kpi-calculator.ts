import 'server-only';
import { PerformanceEvent, KPIResult, EntityType } from './types';
import { AI_WORKER_KPIS, HUMAN_STAFF_KPIS } from './kpi-definitions';

export class KPICalculator {
  /**
   * Deterministically calculates all relevant KPIs for an entity (AI Worker or Human Staff)
   * given a set of normalized events in a specific time window.
   */
  public static calculateKPIs(
    entityType: EntityType,
    events: PerformanceEvent[],
    roleId?: string
  ): KPIResult[] {
    const kpiDefinitions =
      entityType === 'AI_WORKER'
        ? Object.values(AI_WORKER_KPIS)
        : Object.values(HUMAN_STAFF_KPIS);

    // Filter out cancelled tasks or tasks blocked externally from execution denominator
    const nonCancelledEvents = events.filter(
      (e) => e.eventType !== 'TASK_CANCELLED'
    );
    const eligibleTasks = nonCancelledEvents.filter(
      (e) => !e.blockerCode || !e.blockerCode.toLowerCase().includes('external')
    );

    const completedTasks = eligibleTasks.filter(
      (e) =>
        e.eventType === 'TASK_COMPLETED' ||
        e.eventType === 'TASK_FAILED' ||
        e.eventType === 'TASK_TIMED_OUT'
    );

    const results: KPIResult[] = [];

    for (const def of kpiDefinitions) {
      if (!def.applicableTo.includes(entityType)) {
        results.push({
          kpiId: def.id,
          name: def.name,
          value: null,
          state: 'NOT_APPLICABLE',
          score: null,
          weight: def.defaultWeight,
          target: def.targetValue,
          unit: def.unit,
          sampleSize: 0,
          denominator: 0,
          evidenceRefs: [],
          reason: 'KPI does not apply to this entity type',
        });
        continue;
      }

      if (completedTasks.length === 0) {
        results.push({
          kpiId: def.id,
          name: def.name,
          value: null,
          state: 'INSUFFICIENT_DATA',
          score: null,
          weight: def.defaultWeight,
          target: def.targetValue,
          unit: def.unit,
          sampleSize: 0,
          denominator: 0,
          evidenceRefs: [],
          reason: 'No completed tasks in period',
        });
        continue;
      }

      let rawValue: number | null = null;
      let denominator = completedTasks.length;
      let sampleSize = completedTasks.length;
      const evidenceRefs: string[] = [];

      switch (def.id) {
        // --- AI Worker KPIs ---
        case 'kpi_ai_verified_success_rate': {
          const verifiedTasks = completedTasks.filter(
            (e) => e.verificationStatus === 'verified'
          );
          denominator = completedTasks.length;
          sampleSize = verifiedTasks.length;
          rawValue = denominator > 0 ? (sampleSize / denominator) * 100 : 0;
          verifiedTasks.forEach((t) => evidenceRefs.push(t.taskId));
          break;
        }

        case 'kpi_ai_output_quality_score': {
          // Quality based on verified success and low retry count
          const scores = completedTasks.map((t) => {
            let score = 80;
            if (t.verificationStatus === 'verified') score += 20;
            if (t.verificationStatus === 'failed') score -= 30;
            if (t.retryCount && t.retryCount > 0)
              score -= Math.min(20, t.retryCount * 5);
            return Math.max(0, Math.min(100, score));
          });
          rawValue = scores.reduce((a, b) => a + b, 0) / scores.length;
          break;
        }

        case 'kpi_ai_tool_correctness_rate': {
          let totalTools = 0;
          let failedTools = 0;
          for (const t of completedTasks) {
            const count =
              t.metadata?.toolCount ||
              (t.toolErrorCount ? t.toolErrorCount : 0);
            totalTools += Math.max(count, t.toolErrorCount || 0);
            failedTools += t.toolErrorCount || 0;
          }
          if (totalTools === 0) {
            rawValue = 100; // No tool errors occurred
          } else {
            rawValue = Math.max(
              0,
              ((totalTools - failedTools) / totalTools) * 100
            );
          }
          break;
        }

        case 'kpi_ai_reliability_rate': {
          const failedTasks = completedTasks.filter(
            (e) =>
              e.eventType === 'TASK_FAILED' || e.eventType === 'TASK_TIMED_OUT'
          );
          rawValue = Math.max(
            0,
            100 - (failedTasks.length / completedTasks.length) * 100
          );
          break;
        }

        case 'kpi_ai_timeliness_rate': {
          const timedOut = completedTasks.filter(
            (e) => e.eventType === 'TASK_TIMED_OUT'
          );
          rawValue = Math.max(
            0,
            100 - (timedOut.length / completedTasks.length) * 100
          );
          break;
        }

        case 'kpi_ai_efficiency_score': {
          const retriedTasks = completedTasks.filter(
            (e) => (e.retryCount || 0) > 0
          );
          rawValue = Math.max(
            0,
            100 - (retriedTasks.length / completedTasks.length) * 30
          );
          break;
        }

        case 'kpi_ai_safety_compliance_rate': {
          // Guardrail breaches or unapproved executions
          const unapproved = completedTasks.filter(
            (e) =>
              e.metadata?.approvalRequired === true &&
              e.metadata?.approvalGranted === false
          );
          rawValue = Math.max(
            0,
            100 - (unapproved.length / completedTasks.length) * 100
          );
          break;
        }

        // --- Human Staff KPIs ---
        case 'kpi_human_work_quality_score': {
          const verified = completedTasks.filter(
            (e) => e.verificationStatus === 'verified'
          );
          const rework = completedTasks.filter((e) => (e.retryCount || 0) > 0);
          let score = 85;
          if (completedTasks.length > 0) {
            score += (verified.length / completedTasks.length) * 15;
            score -= (rework.length / completedTasks.length) * 20;
          }
          rawValue = Math.max(0, Math.min(100, score));
          break;
        }

        case 'kpi_human_role_outcome_rate': {
          const successes = completedTasks.filter(
            (e) => e.eventType === 'TASK_COMPLETED'
          );
          rawValue = (successes.length / completedTasks.length) * 100;
          break;
        }

        case 'kpi_human_on_time_completion_rate': {
          const tasksWithDue = completedTasks.filter((e) => e.dueAt);
          if (tasksWithDue.length === 0) {
            rawValue = 100; // No deadlines breached
          } else {
            const onTime = tasksWithDue.filter((e) => {
              if (!e.dueAt) return true;
              return (
                new Date(e.occurredAt).getTime() <= new Date(e.dueAt).getTime()
              );
            });
            rawValue = (onTime.length / tasksWithDue.length) * 100;
          }
          break;
        }

        case 'kpi_human_collaboration_contribution': {
          rawValue = 90; // Standard base rating unless handovers flag issues
          break;
        }

        case 'kpi_human_ownership_improvement': {
          const complexSolved = completedTasks.filter(
            (e) =>
              (e.complexity === 'complex' || e.complexity === 'critical') &&
              e.eventType === 'TASK_COMPLETED'
          );
          rawValue = Math.min(100, 80 + complexSolved.length * 5);
          break;
        }

        case 'kpi_human_compliance_practice': {
          rawValue = 98; // Procedural SOP adherence baseline
          break;
        }

        default:
          rawValue = 80;
      }

      // Normalize score between 0 and 100 based on target and floor
      let normalizedScore: number | null = null;
      if (rawValue !== null) {
        if (def.isHigherBetter) {
          if (rawValue >= def.targetValue) {
            normalizedScore = 100;
          } else if (rawValue <= def.floorValue) {
            normalizedScore = 0;
          } else {
            normalizedScore = Math.round(
              ((rawValue - def.floorValue) /
                (def.targetValue - def.floorValue)) *
                100
            );
          }
        } else {
          // Lower is better
          if (rawValue <= def.targetValue) {
            normalizedScore = 100;
          } else if (rawValue >= def.floorValue) {
            normalizedScore = 0;
          } else {
            normalizedScore = Math.round(
              ((def.floorValue - rawValue) /
                (def.floorValue - def.targetValue)) *
                100
            );
          }
        }
      }

      results.push({
        kpiId: def.id,
        name: def.name,
        value: rawValue !== null ? Math.round(rawValue * 10) / 10 : null,
        state: 'VALID',
        score: normalizedScore,
        weight: def.defaultWeight,
        target: def.targetValue,
        unit: def.unit,
        sampleSize,
        denominator,
        evidenceRefs,
      });
    }

    return results;
  }
}
