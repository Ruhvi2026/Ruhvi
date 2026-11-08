import 'server-only';
import {
  QualityEvaluation,
  EntityType,
  QualityEvaluationDimension,
} from './types';

export const QUALITY_RUBRIC_VERSION = '1.0.0';

export class QualityEvaluator {
  /**
   * Evaluates task execution quality against deterministic rubric dimensions:
   * 1. Correctness / Accuracy
   * 2. Completeness against task intent
   * 3. Tool & Resource validity
   * 4. Safety & Policy compliance
   *
   * Adheres strictly to the Zero Paid Dependency rule:
   * Uses deterministic validation logic first.
   */
  public static evaluateTaskQuality(params: {
    taskId: string;
    memberId: string;
    entityType: EntityType;
    taskTitle: string;
    findings?: string[];
    evidence?: string[];
    recommendations?: string[];
    isVerified?: boolean;
    hasToolErrors?: boolean;
    durationMs?: number | null;
  }): QualityEvaluation {
    const {
      taskId,
      memberId,
      entityType,
      findings = [],
      evidence = [],
      recommendations = [],
      isVerified = true,
      hasToolErrors = false,
    } = params;

    const dimensions: QualityEvaluationDimension[] = [];
    const requirementsMet: string[] = [];
    const requirementsMissed: string[] = [];

    // 1. Correctness dimension (weight 0.35)
    let correctnessScore = 85;
    if (isVerified) {
      correctnessScore = 95;
      requirementsMet.push('Outcome verified against business criteria');
    } else {
      correctnessScore = 50;
      requirementsMissed.push(
        'Outcome failed verification or returned ambiguous status'
      );
    }
    dimensions.push({
      name: 'correctness',
      score: correctnessScore,
      weight: 0.35,
      evidenceRefs: [taskId],
      reason: isVerified
        ? 'Verified successful outcome'
        : 'Verification missing or failed',
    });

    // 2. Completeness dimension (weight 0.25)
    let completenessScore = 70;
    if (findings.length > 0) {
      completenessScore += 15;
      requirementsMet.push('Clear findings generated');
    }
    if (recommendations.length > 0) {
      completenessScore += 15;
      requirementsMet.push('Actionable recommendations provided');
    }
    completenessScore = Math.min(100, completenessScore);
    dimensions.push({
      name: 'completeness',
      score: completenessScore,
      weight: 0.25,
      evidenceRefs: [taskId],
      reason: `Findings: ${findings.length}, Recommendations: ${recommendations.length}`,
    });

    // 3. Evidence grounding (weight 0.25)
    let evidenceScore = 60;
    if (evidence.length > 0) {
      evidenceScore = 95;
      requirementsMet.push('Evidence citations provided');
    } else {
      requirementsMissed.push('No direct evidence citations provided');
    }
    dimensions.push({
      name: 'evidence_grounding',
      score: evidenceScore,
      weight: 0.25,
      evidenceRefs: evidence,
      reason:
        evidence.length > 0
          ? `${evidence.length} evidence references`
          : 'Zero citations',
    });

    // 4. Operational Safety & Tool Health (weight 0.15)
    let safetyScore = 100;
    if (hasToolErrors) {
      safetyScore = 60;
      requirementsMissed.push('Experienced tool error during execution');
    } else {
      requirementsMet.push('Executed without unhandled tool exceptions');
    }
    dimensions.push({
      name: 'operational_safety',
      score: safetyScore,
      weight: 0.15,
      evidenceRefs: [taskId],
      reason: hasToolErrors
        ? 'Tool execution encountered faults'
        : 'Clean execution',
    });

    // Weighted Overall Quality
    const overallQuality = Math.round(
      dimensions.reduce((acc, dim) => acc + dim.score * dim.weight, 0)
    );

    const reviewRequired = overallQuality < 65 || !isVerified;

    return {
      evaluationId: `qe_${taskId}_${Date.now()}`,
      taskId,
      memberId,
      entityType,
      status: reviewRequired ? 'NEEDS_HUMAN_REVIEW' : 'VALID',
      overallQuality,
      dimensions,
      requirementsMet,
      requirementsMissed,
      possibleExternalFactors: [],
      reviewRequired,
      rubricVersion: QUALITY_RUBRIC_VERSION,
      evaluatedAt: new Date().toISOString(),
      evidenceRefs: evidence.length > 0 ? evidence : [taskId],
    };
  }
}
