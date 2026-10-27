import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  type UnifiedActionItem,
  type ActionCategory,
  type ActionPriority,
  type ActionStatus,
  type ActionSourceType,
  fromAnomalyRecord,
  fromSystemAlert,
} from '@/lib/intelligence/action-contract';
import { getAnomalyLifecycleRegistry } from '@/lib/intelligence/anomaly-lifecycle';
import {
  detectBusinessAnomalies,
  ENABLED_ANOMALY_RULES,
} from '@/lib/intelligence/anomaly-detector';

/**
 * ============================================================================
 * GET /api/action-center (TRACK D - PHASE 24)
 * ============================================================================
 * Unified Action Center read API aggregating eligible action items across:
 * 1. Business anomaly lifecycle records (Track C)
 * 2. Administrative audit logs & critical events (Track A/B)
 * 3. AI infrastructure failure diagnostics (Track B)
 * 4. Pending customer return authorizations (Track B)
 *
 * Guarantees:
 * 1. Role-Aware RBAC: Staff cannot view financial/security items; managers
 *    cannot view sensitive security actions; super_admins view all.
 * 2. Source-of-Truth Integrity: Reuses existing authoritative records; zero
 *    duplicate database copies.
 * 3. Graceful Degradation: Queries disjunct upstream sources via Promise.allSettled();
 *    intermittent database timeouts in one table do not crash the endpoint.
 * 4. Pagination & Filtering: Clean pagination with category, priority, and status filters.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const categoryFilter =
      (searchParams.get('category') as ActionCategory | 'all') || 'all';
    const priorityFilter =
      (searchParams.get('priority') as ActionPriority | 'all') || 'all';
    const statusFilter =
      (searchParams.get('status') as ActionStatus | 'all') || 'all';
    const sourceFilter =
      (searchParams.get('source') as ActionSourceType | 'all') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    );
    const fresh = searchParams.get('fresh') === 'true';

    const degradedSources: string[] = [];
    const aggregatedItems: UnifiedActionItem[] = [];
    const callerRole = auth.role.toLowerCase();

    // ─── SOURCE A: Business Anomalies (Track C) ─────────────────────────────
    const fetchAnomalies = async (): Promise<UnifiedActionItem[]> => {
      const registry = getAnomalyLifecycleRegistry();
      let records = registry.getRecords();

      if (records.length === 0 || fresh) {
        const scan = await detectBusinessAnomalies({
          callerRole: auth.role!,
          preset: 'last_7_days',
          fresh,
        });
        const result = registry.reconcileWithScan(scan.anomalies, {
          evaluatedRuleIds: Object.keys(ENABLED_ANOMALY_RULES),
        });
        records = result.records;
      }

      return records.map(fromAnomalyRecord);
    };

    // ─── SOURCE B: System Audit Logs ─────────────────────────────────────────
    const fetchAuditAlerts = async (): Promise<UnifiedActionItem[]> => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select(
          'id, actor_email, action, entity_type, entity_id, changes, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(15);

      if (error || !data) {
        throw new Error(error?.message || 'audit_logs query returned empty');
      }

      const items: UnifiedActionItem[] = [];
      for (const log of data) {
        const isCriticalAction =
          log.action.includes('delete') ||
          log.action.includes('permission') ||
          log.action.includes('secret') ||
          log.action.includes('role');

        const isWarningAction =
          log.action.includes('update') || log.action.includes('config');

        if (isCriticalAction || isWarningAction) {
          items.push(
            fromSystemAlert({
              id: `audit_${log.id}`,
              title: `Administrative Audit Event: ${log.action}`,
              message: `Action '${log.action}' performed on ${log.entity_type || 'entity'} (${log.entity_id || 'system'}) by ${log.actor_email || 'staff'}.`,
              severity: isCriticalAction ? 'critical' : 'medium',
              category: 'security',
              createdAt: log.created_at || new Date().toISOString(),
              source: 'supabase:audit_logs',
              deepLink: '/admin/system-alerts',
            })
          );
        }
      }

      return items;
    };

    // ─── SOURCE C: AI Failure Diagnostics ────────────────────────────────────
    const fetchAiDiagnostics = async (): Promise<UnifiedActionItem[]> => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('ai_failure_diagnostics')
        .select('id, provider, model, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data) {
        throw new Error(error?.message || 'ai_failure_diagnostics unavailable');
      }

      return data.map((diag) =>
        fromSystemAlert({
          id: `aifail_${diag.id}`,
          title: `AI Provider Service Degradation (${diag.provider})`,
          message: `Model ${diag.model || 'ai'} failed with error: ${diag.error_message || 'Timeout'}. Fallback circuit breaker engaged.`,
          severity: 'high',
          createdAt: diag.created_at || new Date().toISOString(),
          source: 'supabase:ai_failure_diagnostics',
          deepLink: '/admin/system-alerts',
        })
      );
    };

    // ─── SOURCE D: Pending Return Requests ───────────────────────────────────
    const fetchReturnRequests = async (): Promise<UnifiedActionItem[]> => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('returns')
        .select('id, order_id, reason, status, created_at')
        .eq('status', 'requested')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data) {
        throw new Error(error?.message || 'returns query unavailable');
      }

      return data.map((ret) => ({
        id: `act_ret_${ret.id}`,
        sourceType: 'system_alert' as const,
        sourceId: ret.id,
        title: `Customer Return Authorization Needed: Order #${ret.order_id?.slice(0, 8)}`,
        summary: `Customer initiated return for reason: '${ret.reason || 'Not specified'}'. Requires inspection and approval.`,
        category: 'operations' as const,
        priority: 'high' as const,
        status: 'pending' as const,
        isExecutable: false,
        executionType: 'deep_link_workflow' as const,
        requiredApprovalType: 'staff' as const,
        assignedRole: 'staff' as const,
        evidence: {
          description: `Return claim requested by customer for order ${ret.order_id}.`,
          deepLink: '/admin/refunds',
          rawSourceId: ret.id,
          rawSourceType: 'returns',
        },
        createdAt: ret.created_at || new Date().toISOString(),
        updatedAt: ret.created_at || new Date().toISOString(),
      }));
    };

    // Dispatch all upstream sources in parallel
    const [anomaliesResult, auditResult, aiDiagResult, returnsResult] =
      await Promise.allSettled([
        fetchAnomalies(),
        fetchAuditAlerts(),
        fetchAiDiagnostics(),
        fetchReturnRequests(),
      ]);

    // Handle results with graceful degradation
    if (anomaliesResult.status === 'fulfilled') {
      aggregatedItems.push(...anomaliesResult.value);
    } else {
      console.warn(
        '[ActionCenterAPI] Anomaly source degraded:',
        anomaliesResult.reason
      );
      degradedSources.push('anomaly');
    }

    if (auditResult.status === 'fulfilled') {
      aggregatedItems.push(...auditResult.value);
    } else {
      degradedSources.push('audit_logs');
    }

    if (aiDiagResult.status === 'fulfilled') {
      aggregatedItems.push(...aiDiagResult.value);
    } else {
      degradedSources.push('ai_failure_diagnostics');
    }

    if (returnsResult.status === 'fulfilled') {
      aggregatedItems.push(...returnsResult.value);
    } else {
      degradedSources.push('returns');
    }

    // ─── Deduplication by Unique ID ──────────────────────────────────────────
    const deduplicatedMap = new Map<string, UnifiedActionItem>();
    for (const item of aggregatedItems) {
      if (!deduplicatedMap.has(item.id)) {
        deduplicatedMap.set(item.id, item);
      }
    }
    let allItems = Array.from(deduplicatedMap.values());

    // ─── Role-Aware Filtering (RBAC Data Protection) ─────────────────────────
    allItems = allItems.filter((item) => {
      // Financial items restricted to Admin & Manager
      if (item.category === 'financial') {
        return (
          callerRole === 'admin' ||
          callerRole === 'super_admin' ||
          callerRole === 'manager'
        );
      }

      // Security items restricted to Admin
      if (item.category === 'security') {
        return callerRole === 'admin' || callerRole === 'super_admin';
      }

      // Operational, Inventory, Support, Infrastructure, Quality: accessible to all staff
      return true;
    });

    // ─── Query Parameters Filtering ──────────────────────────────────────────
    if (categoryFilter !== 'all') {
      allItems = allItems.filter((i) => i.category === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      allItems = allItems.filter((i) => i.priority === priorityFilter);
    }
    if (statusFilter !== 'all') {
      allItems = allItems.filter((i) => i.status === statusFilter);
    }
    if (sourceFilter !== 'all') {
      allItems = allItems.filter((i) => i.sourceType === sourceFilter);
    }

    // ─── Deterministic Sorting ───────────────────────────────────────────────
    // Critical > High > Medium > Low
    // Pending > In Progress > Completed > Dismissed
    // Then newest createdAt first
    const priorityWeights: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const statusWeights: Record<string, number> = {
      pending: 0,
      in_progress: 1,
      completed: 2,
      dismissed: 3,
      expired: 4,
    };

    allItems.sort((a, b) => {
      const pw =
        (priorityWeights[a.priority] ?? 2) - (priorityWeights[b.priority] ?? 2);
      if (pw !== 0) return pw;

      const sw =
        (statusWeights[a.status] ?? 0) - (statusWeights[b.status] ?? 0);
      if (sw !== 0) return sw;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // ─── Counts & Summary ────────────────────────────────────────────────────
    const totalCount = allItems.length;
    const counts = {
      total: totalCount,
      critical: allItems.filter(
        (i) =>
          i.priority === 'critical' &&
          i.status !== 'completed' &&
          i.status !== 'dismissed'
      ).length,
      high: allItems.filter(
        (i) =>
          i.priority === 'high' &&
          i.status !== 'completed' &&
          i.status !== 'dismissed'
      ).length,
      pending: allItems.filter((i) => i.status === 'pending').length,
      in_progress: allItems.filter((i) => i.status === 'in_progress').length,
      completed: allItems.filter((i) => i.status === 'completed').length,
      dismissed: allItems.filter((i) => i.status === 'dismissed').length,
    };

    // ─── Pagination ──────────────────────────────────────────────────────────
    const startIndex = (page - 1) * limit;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
        counts,
        degradedSources,
        callerRole,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[ActionCenterAPI] GET failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
