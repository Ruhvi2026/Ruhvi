import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// One Supabase client per server process, created lazily so a missing env var
// fails at request time rather than at module evaluation.
let supabaseClient: ReturnType<typeof getServiceClient> | null = null;

function getClient() {
  if (!supabaseClient) {
    supabaseClient = getServiceClient();
  }
  return supabaseClient;
}

// Short-lived cache for manager dashboards. Every manager in a department sees
// identical numbers, so the key only needs the department. Admins and staff
// payloads are either unique per user or large enough that caching them is not
// worth the staleness.
const CACHE_TTL_SECONDS = 10;
const CACHE_MAX_ENTRIES = 200;
const managerCache = new Map<string, { value: unknown; expires: number }>();

function getFromCache(key: string) {
  const cached = managerCache.get(key);
  if (!cached) return null;
  if (cached.expires <= Date.now()) {
    managerCache.delete(key);
    return null;
  }
  return cached.value;
}

function setInCache(key: string, value: unknown) {
  if (managerCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = managerCache.keys().next();
    if (!oldest.done) managerCache.delete(oldest.value);
  }
  managerCache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL_SECONDS * 1000,
  });
}

// Cache-Control header values for different roles
const CACHE_HEADERS = {
  // Manager: public cache with stale-while-revalidate for edge caching
  // s-maxage=1 allows edge cache to serve for 1 second, stale-while-revalidate=59
  // allows serving stale content for up to 59 seconds while revalidating in background
  manager: 'public, s-maxage=1, stale-while-revalidate=59',
  // Admin: private, no-store since data is org-wide and may be sensitive
  admin: 'private, no-store, max-age=0',
  // Staff: private, no-store since data is user-specific
  staff: 'private, no-store, max-age=0',
} as const;

interface WorkloadRow {
  name: string;
  total?: number;
  open?: number;
  overdue?: number;
}

function toWorkloadMap(rows: WorkloadRow[] | null | undefined) {
  const map: Record<string, { total: number; open: number; overdue: number }> =
    {};
  for (const row of rows || []) {
    if (!row?.name) continue;
    map[row.name] = {
      total: row.total || 0,
      open: row.open || 0,
      overdue: row.overdue || 0,
    };
  }
  return map;
}

export async function GET() {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin =
      staffUser.role === 'super_admin' || staffUser.role === 'admin';
    const isManager = staffUser.role === 'manager';
    const cacheKey = isManager
      ? `manager-${staffUser.department_id || 'no-dept'}`
      : null;

    // Determine cache header based on role
    const cacheHeader = isManager
      ? CACHE_HEADERS.manager
      : isAdmin
        ? CACHE_HEADERS.admin
        : CACHE_HEADERS.staff;
    const headers = new Headers();
    headers.set('Cache-Control', cacheHeader);

    if (cacheKey) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { headers });
      }
    }

    const { data, error } = await getClient().rpc('get_task_dashboard_stats', {
      p_department_id: isManager ? staffUser.department_id || null : null,
      p_user_id: isAdmin || isManager ? null : staffUser.id,
    });

    if (error) {
      throw error;
    }

    const stats = (data || {}) as {
      totals?: Record<string, number>;
      department_workload?: WorkloadRow[];
      staff_workload?: WorkloadRow[];
      mine?: Record<string, number>;
    };
    const totals = stats.totals || {};

    let responseBody: unknown;

    if (isAdmin) {
      responseBody = {
        dashboard: {
          role: 'admin',
          total: totals.total || 0,
          open: totals.open || 0,
          in_progress: totals.in_progress || 0,
          completed: totals.completed || 0,
          overdue: totals.overdue || 0,
          completed_today: totals.completed_today || 0,
          sla_breached: totals.sla_breached || 0,
          department_workload: toWorkloadMap(stats.department_workload),
          staff_workload: toWorkloadMap(stats.staff_workload),
        },
        success: true,
      };
    } else if (isManager) {
      responseBody = {
        dashboard: {
          role: 'manager',
          department_tasks: totals.total || 0,
          pending_assignment: totals.unassigned || 0,
          unassigned: totals.unassigned || 0,
          high_priority: totals.high_priority || 0,
          overdue: totals.sla_breached || 0,
          completed_today: totals.completed_today || 0,
          sla_breached: totals.sla_breached || 0,
        },
        success: true,
      };

      if (cacheKey) {
        setInCache(cacheKey, responseBody);
      }
    } else {
      const mine = stats.mine || {};
      responseBody = {
        dashboard: {
          role: 'staff',
          my_open_tasks: mine.my_open_tasks || 0,
          due_today: mine.due_today || 0,
          due_soon: mine.due_soon || 0,
          overdue: mine.overdue || 0,
          supporting: mine.supporting || 0,
          spectating: mine.spectating || 0,
        },
        success: true,
      };
    }

    return NextResponse.json(responseBody, { headers });
  } catch (err) {
    console.error('[Dashboard GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
