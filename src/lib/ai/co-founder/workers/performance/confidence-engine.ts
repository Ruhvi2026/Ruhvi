import 'server-only';
import { ConfidenceLevel, PerformanceEvent } from './types';
import { MINIMUM_SAMPLE_SIZE } from './kpi-definitions';

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  score: number; // 0.0 - 1.0
  reasons: string[];
  sampleSize: number;
  verificationRatio: number;
}

export class ConfidenceEngine {
  /**
   * Assesses the confidence of a performance evaluation based on factual evidence.
   * Never manufactures high confidence from small or unverified samples.
   */
  public static evaluateConfidence(
    events: PerformanceEvent[],
    weightedCoverage: number
  ): ConfidenceAssessment {
    const reasons: string[] = [];
    const completedTasks = events.filter(
      (e) =>
        e.eventType === 'TASK_COMPLETED' ||
        e.eventType === 'TASK_FAILED' ||
        e.eventType === 'TASK_TIMED_OUT'
    );

    const sampleSize = completedTasks.length;

    if (sampleSize === 0) {
      return {
        level: 'INSUFFICIENT',
        score: 0.0,
        reasons: ['No completed tasks found in evaluated period.'],
        sampleSize: 0,
        verificationRatio: 0,
      };
    }

    if (sampleSize < MINIMUM_SAMPLE_SIZE) {
      return {
        level: 'INSUFFICIENT',
        score: Math.round((sampleSize / MINIMUM_SAMPLE_SIZE) * 40) / 100,
        reasons: [
          `Sample size of ${sampleSize} is below minimum threshold of ${MINIMUM_SAMPLE_SIZE} completed tasks.`,
        ],
        sampleSize,
        verificationRatio: 0,
      };
    }

    // Measure verified task ratio
    const verifiedCount = completedTasks.filter(
      (e) => e.verificationStatus === 'verified'
    ).length;
    const verificationRatio = sampleSize > 0 ? verifiedCount / sampleSize : 0;

    let confidenceScore = 0.5; // baseline with >= MINIMUM_SAMPLE_SIZE

    // Sample size bonus
    if (sampleSize >= 15) {
      confidenceScore += 0.2;
      reasons.push(`High sample volume (${sampleSize} completed tasks).`);
    } else if (sampleSize >= 8) {
      confidenceScore += 0.1;
      reasons.push(`Adequate sample volume (${sampleSize} completed tasks).`);
    }

    // Verification ratio bonus / penalty
    if (verificationRatio >= 0.8) {
      confidenceScore += 0.2;
      reasons.push(
        `High verification rate (${Math.round(verificationRatio * 100)}% verified).`
      );
    } else if (verificationRatio < 0.5) {
      confidenceScore -= 0.2;
      reasons.push(
        `Low verification rate (${Math.round(verificationRatio * 100)}% unverified).`
      );
    }

    // Weighted coverage bonus / penalty
    if (weightedCoverage >= 0.9) {
      confidenceScore += 0.1;
    } else if (weightedCoverage < 0.7) {
      confidenceScore -= 0.2;
      reasons.push(
        `KPI coverage is only ${Math.round(weightedCoverage * 100)}%.`
      );
    }

    confidenceScore = Math.max(0.1, Math.min(1.0, confidenceScore));

    let level: ConfidenceLevel = 'LOW';
    if (confidenceScore >= 0.8) {
      level = 'HIGH';
    } else if (confidenceScore >= 0.6) {
      level = 'MEDIUM';
    } else if (confidenceScore >= 0.35) {
      level = 'LOW';
    } else {
      level = 'INSUFFICIENT';
    }

    return {
      level,
      score: Math.round(confidenceScore * 100) / 100,
      reasons,
      sampleSize,
      verificationRatio: Math.round(verificationRatio * 100) / 100,
    };
  }
}
