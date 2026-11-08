import 'server-only';
import {
  WorkforceAuditReport,
  MemberScorecard,
  WorkforceAlert,
  RootCauseCategory,
} from './types';
import { PERFORMANCE_SCORE_VERSION } from './kpi-definitions';

export class ReportBuilder {
  /**
   * Compiles member scorecards and alerts into an executive workforce briefing for the AI Co-Founder.
   */
  public static buildAuditReport(params: {
    reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
    period: { from: string; to: string };
    scorecards: MemberScorecard[];
    alerts: WorkforceAlert[];
    sourcesChecked: string[];
    missingSources?: string[];
  }): WorkforceAuditReport {
    const {
      reportType,
      period,
      scorecards,
      alerts,
      sourcesChecked,
      missingSources = [],
    } = params;

    const aiScorecards = scorecards.filter((s) => s.entityType === 'AI_WORKER');
    const humanScorecards = scorecards.filter(
      (s) => s.entityType === 'HUMAN_STAFF'
    );

    const aiWithValidScores = aiScorecards.filter(
      (s) => s.overallScore !== null
    ).length;
    const humanWithValidScores = humanScorecards.filter(
      (s) => s.overallScore !== null
    ).length;

    // Aggregate strengths & attention areas
    const topStrengths: string[] = [];
    const attentionRequired: string[] = [];

    scorecards.forEach((s) => {
      if (s.overallScore !== null && s.overallScore >= 85) {
        topStrengths.push(
          `${s.memberId} (${s.entityType}): Grade ${s.grade} (${s.overallScore}/100)`
        );
      }
      if (s.overallScore !== null && s.overallScore < 70) {
        attentionRequired.push(
          `${s.memberId} (${s.entityType}): Below target at ${s.overallScore}/100`
        );
      }
    });

    // Root-cause findings rollup
    const rootCauseMap: Record<
      RootCauseCategory,
      { count: number; members: Set<string> }
    > = {
      MEMBER_EXECUTION: { count: 0, members: new Set() },
      UNCLEAR_REQUIREMENT: { count: 0, members: new Set() },
      MISSING_INPUT: { count: 0, members: new Set() },
      TOOL_OR_PROVIDER_FAILURE: { count: 0, members: new Set() },
      SYSTEM_OR_BUG: { count: 0, members: new Set() },
      EXTERNAL_PARTY_DELAY: { count: 0, members: new Set() },
      WORKLOAD_OR_CAPACITY: { count: 0, members: new Set() },
      DEADLINE_OR_TARGET_ISSUE: { count: 0, members: new Set() },
      NEEDS_MORE_EVIDENCE: { count: 0, members: new Set() },
    };

    alerts.forEach((a) => {
      if (rootCauseMap[a.rootCause]) {
        rootCauseMap[a.rootCause].count += 1;
        rootCauseMap[a.rootCause].members.add(a.memberId);
      }
    });

    const rootCauseFindings = Object.entries(rootCauseMap)
      .filter(([_, data]) => data.count > 0)
      .map(([category, data]) => ({
        category: category as RootCauseCategory,
        count: data.count,
        membersAffected: Array.from(data.members),
      }));

    // Recognition candidates (Outstanding or High Points)
    const recognitionCandidates = scorecards
      .filter(
        (s) =>
          (s.overallScore !== null && s.overallScore >= 90) ||
          s.achievementPoints >= 50
      )
      .map((s) => ({
        memberId: s.memberId,
        entityType: s.entityType,
        reason: `Grade ${s.grade} with ${s.achievementPoints} achievement points`,
        points: s.achievementPoints,
      }));

    // Construct pragmatic recommendations
    const recommendations: string[] = [];
    if (alerts.some((a) => a.rootCause === 'TOOL_OR_PROVIDER_FAILURE')) {
      recommendations.push(
        'Inspect third-party API reliability and verify rate limits or tool input parameter schemas.'
      );
    }
    if (alerts.some((a) => a.rootCause === 'UNCLEAR_REQUIREMENT')) {
      recommendations.push(
        'Calibrate task prompt templates and tighten acceptance criteria to reduce retry/rework iterations.'
      );
    }
    if (
      aiScorecards.length > 0 &&
      aiWithValidScores < aiScorecards.length / 2
    ) {
      recommendations.push(
        'Increase sample size and ensure task outcomes are consistently routed to the verification engine.'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Workforce health is stable. Maintain current execution schedules and reward top performers.'
      );
    }

    const dataHealthStatus =
      missingSources.length === 0
        ? 'HEALTHY'
        : sourcesChecked.length > 0
          ? 'PARTIAL'
          : 'UNAVAILABLE';

    return {
      reportId: `war_${Date.now()}`,
      reportType,
      period,
      generatedAt: new Date().toISOString(),
      dataHealth: {
        status: dataHealthStatus,
        sourcesChecked,
        missingSources,
        lastSuccessfulAuditAt: new Date().toISOString(),
      },
      populationSummary: {
        aiWorkersTotal: aiScorecards.length,
        aiWorkersWithValidScores: aiWithValidScores,
        humanStaffTotal: humanScorecards.length,
        humanStaffWithValidScores: humanWithValidScores,
      },
      topStrengths,
      attentionRequired,
      trendChanges: [],
      rootCauseFindings,
      recognitionCandidates,
      recommendations,
      scorecards,
      alerts,
      scoreVersion: PERFORMANCE_SCORE_VERSION,
    };
  }
}
