import 'server-only';
import {
  PerformanceEvent,
  EventStatus,
  EntityType,
  TaskDifficulty,
} from './types';

export interface RawWorkerExecutionPayload {
  workerId: string;
  taskId: string;
  taskTitle?: string;
  status: 'succeeded' | 'failed' | 'timeout' | 'blocked' | 'cancelled';
  durationMs?: number;
  retryCount?: number;
  toolCalls?: Array<{
    toolName: string;
    success: boolean;
    durationMs?: number;
    error?: string;
  }>;
  verificationPassed?: boolean;
  approvalRequired?: boolean;
  approvalGranted?: boolean;
  blockerReason?: string;
  occurredAt?: string;
  evidenceRefs?: string[];
  complexity?: TaskDifficulty;
}

export interface RawHumanTaskPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  roleId?: string;
  status: 'Open' | 'In Progress' | 'Blocked' | 'Completed' | 'Closed';
  dueAt?: string | null;
  completedAt?: string | null;
  startedAt?: string | null;
  reworkCount?: number;
  blockerReason?: string | null;
  verifiedPassed?: boolean;
  evidenceRefs?: string[];
  complexity?: TaskDifficulty;
}

export class EventNormalizer {
  private static SCHEMA_VERSION = '1.0.0';

  /**
   * Normalizes an AI Worker execution lifecycle event.
   */
  public static normalizeAIWorkerEvent(
    payload: RawWorkerExecutionPayload
  ): PerformanceEvent {
    const occurredAt = payload.occurredAt || new Date().toISOString();
    const recordedAt = new Date().toISOString();

    let eventType: EventStatus = 'TASK_COMPLETED';
    if (payload.status === 'failed') eventType = 'TASK_FAILED';
    if (payload.status === 'timeout') eventType = 'TASK_TIMED_OUT';
    if (payload.status === 'blocked') eventType = 'TASK_BLOCKED';
    if (payload.status === 'cancelled') eventType = 'TASK_CANCELLED';

    const toolErrorCount = payload.toolCalls
      ? payload.toolCalls.filter((t) => !t.success).length
      : 0;

    let verificationStatus:
      'verified' | 'failed' | 'pending' | 'not_applicable' = 'pending';
    if (payload.verificationPassed === true) verificationStatus = 'verified';
    if (payload.verificationPassed === false) verificationStatus = 'failed';

    return {
      eventId: `pe_ai_${payload.workerId}_${payload.taskId}_${Date.now()}`,
      eventType,
      entityType: 'AI_WORKER',
      memberId: payload.workerId,
      roleId: payload.workerId,
      taskId: payload.taskId,
      parentTaskId: null,
      occurredAt,
      recordedAt,
      sourceSystem: 'worker_dispatcher',
      durationMs:
        payload.durationMs !== undefined && payload.durationMs >= 0
          ? payload.durationMs
          : null,
      retryCount: payload.retryCount || 0,
      toolErrorCount,
      blockerCode: payload.blockerReason || null,
      verificationStatus,
      complexity: payload.complexity || 'normal',
      evidenceRefs: payload.evidenceRefs || [],
      metadata: {
        taskTitle: payload.taskTitle,
        toolCount: payload.toolCalls?.length || 0,
        approvalRequired: payload.approvalRequired,
        approvalGranted: payload.approvalGranted,
      },
      schemaVersion: this.SCHEMA_VERSION,
    };
  }

  /**
   * Normalizes a Human Staff Task event from Supabase Task Manager.
   */
  public static normalizeHumanTaskEvent(
    payload: RawHumanTaskPayload
  ): PerformanceEvent {
    const occurredAt = payload.completedAt || new Date().toISOString();
    const recordedAt = new Date().toISOString();

    let eventType: EventStatus = 'TASK_COMPLETED';
    if (payload.status === 'Blocked') eventType = 'TASK_BLOCKED';
    else if (payload.status === 'In Progress') eventType = 'TASK_STARTED';
    else if (payload.status === 'Open') eventType = 'TASK_ASSIGNED';

    let durationMs: number | null = null;
    if (payload.startedAt && payload.completedAt) {
      const start = new Date(payload.startedAt).getTime();
      const end = new Date(payload.completedAt).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        durationMs = end - start;
      }
    }

    let verificationStatus:
      'verified' | 'failed' | 'pending' | 'not_applicable' = 'pending';
    if (payload.verifiedPassed === true) verificationStatus = 'verified';
    if (payload.verifiedPassed === false) verificationStatus = 'failed';

    return {
      eventId: `pe_human_${payload.assigneeId}_${payload.taskId}_${Date.now()}`,
      eventType,
      entityType: 'HUMAN_STAFF',
      memberId: payload.assigneeId,
      roleId: payload.roleId || 'staff_member',
      taskId: payload.taskId,
      parentTaskId: null,
      occurredAt,
      recordedAt,
      sourceSystem: 'supabase_task_manager',
      dueAt: payload.dueAt || null,
      durationMs,
      retryCount: payload.reworkCount || 0,
      toolErrorCount: 0,
      blockerCode: payload.blockerReason || null,
      verificationStatus,
      complexity: payload.complexity || 'normal',
      evidenceRefs: payload.evidenceRefs || [payload.taskId],
      metadata: {
        taskTitle: payload.taskTitle,
        taskStatus: payload.status,
      },
      schemaVersion: this.SCHEMA_VERSION,
    };
  }
}
