import 'server-only';
import {
  MemberScorecard,
  WorkforceAlert,
  PerformanceEvent,
  RootCauseCategory,
} from './types';

export class AnomalyDetector {
  /**
   * Scans a member scorecard and underlying events for operational regressions,
   * high rework rates, repeated failures, or exceptional performance.
   */
  public static detectAnomalies(
    scorecard: MemberScorecard,
    events: PerformanceEvent[]
  ): WorkforceAlert[] {
    const alerts: WorkforceAlert[] = [];
    const now = new Date().toISOString();

    // 1. Critical score drop alert
    if (scorecard.overallScore !== null && scorecard.overallScore < 60) {
      alerts.push({
        id: `alert_score_${scorecard.memberId}_${Date.now()}`,
        severity: 'CRITICAL',
        memberId: scorecard.memberId,
        entityType: scorecard.entityType,
        roleId: scorecard.roleId,
        title: `Performance Critical Attention: Score ${scorecard.overallScore}/100`,
        message: `Score for ${scorecard.memberId} fell to ${scorecard.overallScore}. Immediate attention required.`,
        rootCause: this.diagnosePrimaryRootCause(scorecard, events),
        evidenceRefs: scorecard.weaknesses,
        recommendedAction:
          'Conduct root-cause diagnostic and review recent task inputs and tool logs.',
        createdAt: now,
      });
    }

    // 2. High tool error alert (for AI workers)
    if (scorecard.entityType === 'AI_WORKER') {
      const toolKPI = scorecard.kpis.find(
        (k) => k.kpiId === 'kpi_ai_tool_correctness_rate'
      );
      if (toolKPI && toolKPI.value !== null && toolKPI.value < 80) {
        alerts.push({
          id: `alert_tool_${scorecard.memberId}_${Date.now()}`,
          severity: 'WARNING',
          memberId: scorecard.memberId,
          entityType: scorecard.entityType,
          roleId: scorecard.roleId,
          title: `Elevated Tool Error Rate (${toolKPI.value}%)`,
          message: `Worker ${scorecard.memberId} is encountering recurring tool call failures or schema validation errors.`,
          rootCause: 'TOOL_OR_PROVIDER_FAILURE',
          evidenceRefs: [toolKPI.kpiId],
          recommendedAction:
            'Verify downstream third-party APIs, tool parameters, and provider connectivity.',
          createdAt: now,
        });
      }
    }

    // 3. High rework rate
    if (scorecard.taskCounts.completed > 0) {
      const reworkRatio =
        scorecard.taskCounts.reworked / scorecard.taskCounts.completed;
      if (reworkRatio >= 0.3) {
        alerts.push({
          id: `alert_rework_${scorecard.memberId}_${Date.now()}`,
          severity: 'WARNING',
          memberId: scorecard.memberId,
          entityType: scorecard.entityType,
          roleId: scorecard.roleId,
          title: `High Rework Rate (${Math.round(reworkRatio * 100)}%)`,
          message: `${Math.round(reworkRatio * 100)}% of completed tasks required revision or retry before acceptance.`,
          rootCause:
            scorecard.entityType === 'AI_WORKER'
              ? 'UNCLEAR_REQUIREMENT'
              : 'MEMBER_EXECUTION',
          evidenceRefs: [`rework_count_${scorecard.taskCounts.reworked}`],
          recommendedAction:
            'Inspect prompt guidelines, brief clarity, and acceptance criteria.',
          createdAt: now,
        });
      }
    }

    // 4. Positive Recognition Alert (Outstanding performance)
    if (scorecard.overallScore !== null && scorecard.overallScore >= 90) {
      alerts.push({
        id: `alert_recognition_${scorecard.memberId}_${Date.now()}`,
        severity: 'POSITIVE',
        memberId: scorecard.memberId,
        entityType: scorecard.entityType,
        roleId: scorecard.roleId,
        title: `Outstanding Performance Achievement (${scorecard.overallScore}/100)`,
        message: `${scorecard.memberId} sustained outstanding quality and verified completion this period.`,
        rootCause: 'MEMBER_EXECUTION',
        evidenceRefs: scorecard.strengths,
        recommendedAction:
          'Award cumulative recognition points and log as benchmark pattern.',
        createdAt: now,
      });
    }

    return alerts;
  }

  /**
   * Evaluates evidence to categorize likely root causes rather than assuming member fault.
   */
  public static diagnosePrimaryRootCause(
    scorecard: MemberScorecard,
    events: PerformanceEvent[]
  ): RootCauseCategory {
    // Check for provider or system errors
    const hasToolFailures = events.some((e) => (e.toolErrorCount || 0) > 0);
    if (hasToolFailures) return 'TOOL_OR_PROVIDER_FAILURE';

    // Check for external blockers
    const hasExternalBlocker = events.some(
      (e) => e.blockerCode && e.blockerCode.toLowerCase().includes('external')
    );
    if (hasExternalBlocker) return 'EXTERNAL_PARTY_DELAY';

    // Check for deadline issues
    const timelinessKPI = scorecard.kpis.find(
      (k) => k.kpiId.includes('timeliness') || k.kpiId.includes('on_time')
    );
    if (
      timelinessKPI &&
      timelinessKPI.score !== null &&
      timelinessKPI.score < 50
    ) {
      return 'DEADLINE_OR_TARGET_ISSUE';
    }

    // Check for quality vs requirement clarity
    if (scorecard.taskCounts.reworked > 2) {
      return 'UNCLEAR_REQUIREMENT';
    }

    if (scorecard.taskCounts.completed >= 5) {
      return 'MEMBER_EXECUTION';
    }

    return 'NEEDS_MORE_EVIDENCE';
  }
}
