import 'server-only';
import {
  PerformanceEvent,
  WorkforceAlert,
  AchievementPointTransaction,
  EntityType,
} from './types';
import { getServiceClient } from '@/lib/supabase/service';

function getDb() {
  try {
    return getServiceClient();
  } catch {
    return null;
  }
}

// In-memory fallback ledger for tests and initial bootstrap
const IN_MEMORY_EVENTS: PerformanceEvent[] = [];
const IN_MEMORY_POINTS: AchievementPointTransaction[] = [];
const IN_MEMORY_ALERTS: WorkforceAlert[] = [];

export class PerformanceDataAccess {
  /**
   * Persists a normalized performance event.
   */
  public static async recordEvent(event: PerformanceEvent): Promise<boolean> {
    try {
      const db = getDb();
      if (db) {
        const { error } = await db.from('workforce_task_events').insert({
          event_id: event.eventId,
          event_type: event.eventType,
          entity_type: event.entityType,
          member_id: event.memberId,
          role_id: event.roleId,
          task_id: event.taskId,
          parent_task_id: event.parentTaskId || null,
          occurred_at: event.occurredAt,
          recorded_at: event.recordedAt,
          source_system: event.sourceSystem,
          correlation_id: event.correlationId || null,
          priority: event.priority || 'normal',
          complexity: event.complexity || 'normal',
          due_at: event.dueAt || null,
          duration_ms: event.durationMs || null,
          retry_count: event.retryCount || 0,
          tool_error_count: event.toolErrorCount || 0,
          blocker_code: event.blockerCode || null,
          verification_status: event.verificationStatus || 'pending',
          evidence_refs: event.evidenceRefs || [],
          metadata: event.metadata || {},
          schema_version: event.schemaVersion,
        });

        if (!error) return true;
        if (process.env.NODE_ENV !== 'test') {
          console.error(
            '[PerformanceDataAccess] workforce_task_events insert error:',
            error
          );
          return false;
        }
      } else if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Supabase client unavailable in non-test environment (PERF-02)'
        );
        return false;
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Database recordEvent failure:',
          err
        );
        return false;
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      return false;
    }

    // In-memory fallback allowed only in test environment (PERF-02)
    const exists = IN_MEMORY_EVENTS.some((e) => e.eventId === event.eventId);
    if (!exists) {
      IN_MEMORY_EVENTS.push(event);
    }
    return true;
  }

  /**
   * Retrieves events for a specific member or all members in a given timeframe.
   */
  public static async getEvents(params: {
    memberId?: string;
    entityType?: EntityType;
    from?: string;
    to?: string;
  }): Promise<PerformanceEvent[]> {
    const { memberId, entityType, from, to } = params;

    try {
      const db = getDb();
      if (db) {
        let query = db.from('workforce_task_events').select('*');
        if (memberId) query = query.eq('member_id', memberId);
        if (entityType) query = query.eq('entity_type', entityType);
        if (from) query = query.gte('occurred_at', from);
        if (to) query = query.lte('occurred_at', to);

        const { data, error } = await query;
        if (error) {
          if (process.env.NODE_ENV !== 'test') {
            console.error(
              '[PerformanceDataAccess] Database getEvents error:',
              error
            );
            return [];
          }
        } else if (data) {
          // Authoritative result from DB, even if 0 rows (PERF-03)
          return data.map((d: any) => ({
            eventId: d.event_id,
            eventType: d.event_type,
            entityType: d.entity_type,
            memberId: d.member_id,
            roleId: d.role_id,
            taskId: d.task_id,
            parentTaskId: d.parent_task_id,
            occurredAt: d.occurred_at,
            recordedAt: d.recorded_at,
            sourceSystem: d.source_system,
            correlationId: d.correlation_id,
            priority: d.priority,
            complexity: d.complexity,
            dueAt: d.due_at,
            durationMs: d.duration_ms,
            retryCount: d.retry_count,
            toolErrorCount: d.tool_error_count,
            blockerCode: d.blocker_code,
            verificationStatus: d.verification_status,
            evidenceRefs: d.evidence_refs || [],
            metadata: d.metadata || {},
            schemaVersion: d.schema_version,
          }));
        }
      } else if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Supabase client unavailable in non-test mode'
        );
        return [];
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Database getEvents exception:',
          err
        );
        return [];
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      return [];
    }

    return IN_MEMORY_EVENTS.filter((e) => {
      if (memberId && e.memberId !== memberId) return false;
      if (entityType && e.entityType !== entityType) return false;
      if (from && new Date(e.occurredAt).getTime() < new Date(from).getTime())
        return false;
      if (to && new Date(e.occurredAt).getTime() > new Date(to).getTime())
        return false;
      return true;
    });
  }

  /**
   * Persists achievement point transactions.
   */
  public static async recordPointTransaction(
    txn: AchievementPointTransaction
  ): Promise<boolean> {
    try {
      const db = getDb();
      if (db) {
        const { error } = await db.from('workforce_score_ledger').insert({
          id: txn.id,
          member_id: txn.memberId,
          entity_type: txn.entityType,
          task_id: txn.taskId,
          difficulty: txn.difficulty,
          base_points: txn.basePoints,
          quality_multiplier: txn.qualityMultiplier,
          final_points: txn.finalPoints,
          is_reversal: txn.isReversal,
          reversal_reason: txn.reversalReason || null,
          awarded_at: txn.awardedAt,
          idempotency_key: txn.idempotencyKey,
        });
        if (!error) return true;
        if (process.env.NODE_ENV !== 'test') {
          console.error(
            '[PerformanceDataAccess] workforce_score_ledger insert error:',
            error
          );
          return false;
        }
      } else if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Supabase client unavailable in non-test mode'
        );
        return false;
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Point transaction failure:',
          err
        );
        return false;
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      return false;
    }

    // Fallback to in-memory only in test environment
    const exists = IN_MEMORY_POINTS.some(
      (p) => p.idempotencyKey === txn.idempotencyKey
    );
    if (!exists) {
      IN_MEMORY_POINTS.push(txn);
    }
    return true;
  }

  /**
   * Gets total cumulative points for a member.
   */
  public static async getMemberPoints(memberId: string): Promise<number> {
    try {
      const db = getDb();
      if (db) {
        const { data, error } = await db
          .from('workforce_score_ledger')
          .select('final_points')
          .eq('member_id', memberId);

        if (!error && data) {
          return data.reduce(
            (sum: number, row: any) => sum + (row.final_points || 0),
            0
          );
        }
      }
    } catch {
      // fallback
    }

    if (process.env.NODE_ENV !== 'test') {
      return 0;
    }

    return IN_MEMORY_POINTS.filter((p) => p.memberId === memberId).reduce(
      (sum, p) => sum + p.finalPoints,
      0
    );
  }

  /**
   * Persists alerts. (PERF-04: Inspect and propagate Supabase error)
   */
  public static async saveAlerts(alerts: WorkforceAlert[]): Promise<boolean> {
    try {
      const db = getDb();
      if (db && alerts.length > 0) {
        const rows = alerts.map((a) => ({
          id: a.id,
          severity: a.severity,
          member_id: a.memberId,
          entity_type: a.entityType,
          role_id: a.roleId,
          title: a.title,
          message: a.message,
          root_cause: a.rootCause,
          evidence_refs: a.evidenceRefs,
          recommended_action: a.recommendedAction,
          created_at: a.createdAt,
        }));
        const { error } = await db.from('workforce_alerts').upsert(rows);
        if (error) {
          console.error(
            '[PerformanceDataAccess] workforce_alerts upsert error:',
            error
          );
          if (process.env.NODE_ENV !== 'test') return false;
        } else {
          return true;
        }
      } else if (db && alerts.length === 0) {
        return true;
      } else if (!db && process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Supabase client unavailable in non-test mode'
        );
        return false;
      }
    } catch (err) {
      console.error('[PerformanceDataAccess] saveAlerts failure:', err);
      if (process.env.NODE_ENV !== 'test') return false;
    }

    if (process.env.NODE_ENV !== 'test') {
      return false;
    }

    alerts.forEach((a) => {
      const exists = IN_MEMORY_ALERTS.some((ex) => ex.id === a.id);
      if (!exists) IN_MEMORY_ALERTS.push(a);
    });
    return true;
  }

  /**
   * Fetches active alerts.
   */
  public static async getActiveAlerts(): Promise<WorkforceAlert[]> {
    try {
      const db = getDb();
      if (db) {
        const { data, error } = await db
          .from('workforce_alerts')
          .select('*')
          .is('resolved_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          if (process.env.NODE_ENV !== 'test') {
            console.error(
              '[PerformanceDataAccess] Database getActiveAlerts error:',
              error
            );
            return [];
          }
        } else if (data) {
          return data.map((d: any) => ({
            id: d.id,
            severity: d.severity,
            memberId: d.member_id,
            entityType: d.entity_type,
            roleId: d.role_id,
            title: d.title,
            message: d.message,
            rootCause: d.root_cause,
            evidenceRefs: d.evidence_refs || [],
            recommendedAction: d.recommended_action,
            createdAt: d.created_at,
            acknowledgedAt: d.acknowledged_at,
            resolvedAt: d.resolved_at,
          }));
        }
      } else if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Supabase client unavailable in non-test mode'
        );
        return [];
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(
          '[PerformanceDataAccess] Database getActiveAlerts exception:',
          err
        );
        return [];
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      return [];
    }

    return IN_MEMORY_ALERTS.filter((a) => !a.resolvedAt);
  }
}
