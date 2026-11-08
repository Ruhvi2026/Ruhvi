import 'server-only';
import {
  AchievementPointTransaction,
  EntityType,
  TaskDifficulty,
  PerformanceEvent,
} from './types';

export class RecognitionEngine {
  private static DIFFICULTY_BASE_POINTS: Record<TaskDifficulty, number> = {
    easy: 5,
    normal: 10,
    complex: 20,
    critical: 30,
  };

  /**
   * Calculates points for a verified task deliverable.
   */
  public static calculatePointsForTask(params: {
    event: PerformanceEvent;
    qualityMultiplier?: number;
  }): AchievementPointTransaction | null {
    const { event, qualityMultiplier = 1.0 } = params;

    // Must be verified task completion
    if (
      event.eventType !== 'TASK_COMPLETED' ||
      event.verificationStatus !== 'verified'
    ) {
      return null;
    }

    const difficulty: TaskDifficulty = event.complexity || 'normal';
    const basePoints = this.DIFFICULTY_BASE_POINTS[difficulty] || 10;
    const finalPoints = Math.round(
      basePoints * Math.max(0.5, Math.min(1.5, qualityMultiplier))
    );

    return {
      id: `pt_${event.memberId}_${event.taskId}_${Date.now()}`,
      memberId: event.memberId,
      entityType: event.entityType,
      taskId: event.taskId,
      difficulty,
      basePoints,
      qualityMultiplier,
      finalPoints,
      isReversal: false,
      awardedAt: new Date().toISOString(),
      idempotencyKey: `pt_award_${event.memberId}_${event.taskId}`,
    };
  }

  /**
   * Creates an immutable reversal transaction for an erroneously awarded task.
   */
  public static createReversal(
    originalTransaction: AchievementPointTransaction,
    reason: string
  ): AchievementPointTransaction {
    return {
      id: `rev_${originalTransaction.id}_${Date.now()}`,
      memberId: originalTransaction.memberId,
      entityType: originalTransaction.entityType,
      taskId: originalTransaction.taskId,
      difficulty: originalTransaction.difficulty,
      basePoints: -originalTransaction.basePoints,
      qualityMultiplier: originalTransaction.qualityMultiplier,
      finalPoints: -originalTransaction.finalPoints,
      isReversal: true,
      reversalReason: reason,
      awardedAt: new Date().toISOString(),
      idempotencyKey: `pt_rev_${originalTransaction.id}`,
    };
  }
}
