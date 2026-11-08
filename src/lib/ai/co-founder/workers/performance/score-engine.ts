import 'server-only';
import {
  EntityType,
  PerformanceEvent,
  MemberScorecard,
  PerformanceGrade,
  DataCoverageState,
} from './types';
import { KPICalculator } from './kpi-calculator';
import { ConfidenceEngine } from './confidence-engine';
import {
  MINIMUM_SAMPLE_SIZE,
  MINIMUM_WEIGHTED_COVERAGE,
  PERFORMANCE_SCORE_VERSION,
} from './kpi-definitions';

export class ScoreEngine {
  /**
   * Calculates a periodic performance scorecard for an AI Worker or Human Staff member.
   * Strictly respects Section 8 of the blueprint:
   * - Does not fabricate scores when data is insufficient.
   * - Calculates weighted coverage.
   * - Returns explicit states and grade bands.
   */
  public static calculateMemberScorecard(params: {
    memberId: string;
    entityType: EntityType;
    roleId: string;
    events: PerformanceEvent[];
    period: { from: string; to: string };
    achievementPoints?: number;
  }): MemberScorecard {
    const {
      memberId,
      entityType,
      roleId,
      events,
      period,
      achievementPoints = 0,
    } = params;

    // 1. Calculate deterministic KPIs
    const kpis = KPICalculator.calculateKPIs(entityType, events, roleId);

    // 2. Count tasks
    const eligibleTasks = events.filter(
      (e) => e.eventType !== 'TASK_CANCELLED'
    );
    const completed = eligibleTasks.filter(
      (e) =>
        e.eventType === 'TASK_COMPLETED' ||
        e.eventType === 'TASK_FAILED' ||
        e.eventType === 'TASK_TIMED_OUT'
    );
    const verified = completed.filter(
      (e) => e.verificationStatus === 'verified'
    );
    const failed = completed.filter(
      (e) => e.eventType === 'TASK_FAILED' || e.eventType === 'TASK_TIMED_OUT'
    );
    const reworked = completed.filter((e) => (e.retryCount || 0) > 0);
    const excluded = events.length - eligibleTasks.length;

    const taskCounts = {
      total: events.length,
      completed: completed.length,
      verified: verified.length,
      failed: failed.length,
      reworked: reworked.length,
      excluded,
    };

    // 3. Calculate Weighted Coverage
    const applicableKPIs = kpis.filter((k) => k.state !== 'NOT_APPLICABLE');
    const totalApplicableWeight = applicableKPIs.reduce(
      (sum, k) => sum + k.weight,
      0
    );

    const validKPIs = applicableKPIs.filter(
      (k) => k.state === 'VALID' && k.score !== null
    );
    const validWeight = validKPIs.reduce((sum, k) => sum + k.weight, 0);

    const weightedCoverage =
      totalApplicableWeight > 0 ? validWeight / totalApplicableWeight : 0;

    // 4. Assess Confidence
    const confidenceAssessment = ConfidenceEngine.evaluateConfidence(
      eligibleTasks,
      weightedCoverage
    );

    // 5. Determine whether score is publishable
    const isPublishable =
      taskCounts.completed >= MINIMUM_SAMPLE_SIZE &&
      weightedCoverage >= MINIMUM_WEIGHTED_COVERAGE &&
      confidenceAssessment.level !== 'INSUFFICIENT';

    let overallScore: number | null = null;
    let grade: PerformanceGrade = 'Insufficient Data';
    let state: DataCoverageState = 'INSUFFICIENT_DATA';

    if (isPublishable) {
      // Calculate weighted score sum(valid_score * weight) / sum(weight)
      const weightedSum = validKPIs.reduce(
        (acc, k) => acc + (k.score as number) * k.weight,
        0
      );
      overallScore = Math.round(weightedSum / validWeight);
      state = 'VALID';

      if (overallScore >= 90) grade = 'Outstanding';
      else if (overallScore >= 80) grade = 'Excellent';
      else if (overallScore >= 70) grade = 'Good';
      else if (overallScore >= 60) grade = 'Needs Improvement';
      else grade = 'Critical Attention';
    } else {
      if (taskCounts.completed === 0) {
        state = 'INSUFFICIENT_DATA';
      } else if (weightedCoverage < MINIMUM_WEIGHTED_COVERAGE) {
        state = 'DATA_UNAVAILABLE';
      } else {
        state = 'INSUFFICIENT_DATA';
      }
    }

    // 6. Strengths and Weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const k of validKPIs) {
      if (k.score !== null && k.score >= 85) {
        strengths.push(
          `${k.name} (${k.value}${k.unit === 'percentage' ? '%' : ''})`
        );
      } else if (k.score !== null && k.score < 70) {
        weaknesses.push(
          `${k.name} (${k.value}${k.unit === 'percentage' ? '%' : ''} vs target ${k.target})`
        );
      }
    }

    return {
      memberId,
      entityType,
      roleId,
      period,
      overallScore,
      grade,
      state,
      confidence: confidenceAssessment.level,
      confidenceScore: confidenceAssessment.score,
      weightedCoverage: Math.round(weightedCoverage * 100) / 100,
      kpis,
      taskCounts,
      strengths,
      weaknesses,
      achievementPoints,
      calculatedAt: new Date().toISOString(),
      scoreVersion: PERFORMANCE_SCORE_VERSION,
    };
  }
}
