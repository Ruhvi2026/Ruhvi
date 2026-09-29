import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

// Simple in-memory cache for dashboard data
const dashboardCache = new Map();
const CACHE_TTL_SECONDS = 10;

function getFromCache(key: string) {
  const cached = dashboardCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  dashboardCache.delete(key);
  return null;
}

function setInCache(key: string, value: any) {
  dashboardCache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL_SECONDS * 1000,
  });
}

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    const role = staffUser.role;

    const today = new Date().toISOString().split('T')[0];

    if (role === 'super_admin' || role === 'admin') {
      const [
        totalRes,
        openRes,
        inProgressRes,
        completedRes,
        overdueRes,
        completedTodayRes,
        slaBreachedRes,
        deptWorkloadRes,
        staffWorkloadRes,
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status_id', (await getStatusId(supabase, 'Open')) || ''),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status_id', (await getStatusId(supabase, 'In Progress')) || ''),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Completed', 'Closed'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .lt('due_date', today)
          .not(
            'status_id',
            'in',
            `(${await getStatusIds(supabase, ['Completed', 'Closed']).then((ids) => ids.join(','))})`
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Completed', 'Closed'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .lt('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
          ),
        supabase.from('departments').select('id, name'),
        supabase
          .from('users')
          .select('id, full_name, role')
          .neq('role', 'customer')
          .eq('account_status', 'active'),
      ]);

      const departments = deptWorkloadRes.data || [];
      const staffMembers = staffWorkloadRes.data || [];

      const departmentWorkload: Record<
        string,
        { total: number; open: number; overdue: number }
      > = {};
      for (const dept of departments) {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', dept.id);
        const { count: openCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', dept.id)
          .eq('status_id', (await getStatusId(supabase, 'Open')) || '');
        const { count: overdueCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', dept.id)
          .lt('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
          );
        departmentWorkload[dept.name] = {
          total: count || 0,
          open: openCount || 0,
          overdue: overdueCount || 0,
        };
      }

      const staffWorkload: Record<
        string,
        { total: number; open: number; overdue: number }
      > = {};
      for (const member of staffMembers) {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .or(`assignee_id.eq.${member.id},created_by.eq.${member.id}`);
        const { count: openCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('assignee_id', member.id)
          .eq('status_id', (await getStatusId(supabase, 'Open')) || '');
        const { count: overdueCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('assignee_id', member.id)
          .lt('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
          );
        staffWorkload[member.full_name || member.id] = {
          total: count || 0,
          open: openCount || 0,
          overdue: overdueCount || 0,
        };
      }

      return NextResponse.json({
        dashboard: {
          role: 'admin',
          total: totalRes.count || 0,
          open: openRes.count || 0,
          in_progress: inProgressRes.count || 0,
          completed: completedRes.count || 0,
          overdue: overdueRes.count || 0,
          completed_today: completedTodayRes.count || 0,
          sla_breached: slaBreachedRes.count || 0,
          department_workload: departmentWorkload,
          staff_workload: staffWorkload,
        },
        success: true,
      });
    }

    if (role === 'manager') {
      const deptId = staffUser.department_id;
      const cacheKey = `dashboard-manager-${deptId || 'no-dept'}`;
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }

      // Request-specific cache for status and priority lookups
      const statusIdCache = new Map();
      const getCachedStatusId = async (name: string) => {
        if (statusIdCache.has(name)) {
          return statusIdCache.get(name);
        }
        const id = await getStatusId(supabase, name);
        statusIdCache.set(name, id);
        return id;
      };

      const priorityIdCache = new Map();
      const getCachedPriorityId = async (name: string) => {
        if (priorityIdCache.has(name)) {
          return priorityIdCache.get(name);
        }
        const id = await getPriorityId(supabase, name);
        priorityIdCache.set(name, id);
        return id;
      };

      // Get status ids
      const [
        openStatusId,
        inProgressStatusId,
        blockedStatusId,
        completedStatusId,
        closedStatusId,
      ] = await Promise.all([
        getCachedStatusId('Open'),
        getCachedStatusId('In Progress'),
        getCachedStatusId('Blocked'),
        getCachedStatusId('Completed'),
        getCachedStatusId('Closed'),
      ]);

      // Get priority ids
      const [highPriorityId, importantPriorityId, immediatePriorityId] =
        await Promise.all([
          getCachedPriorityId('High'),
          getCachedPriorityId('Important'),
          getCachedPriorityId('Immediate'),
        ]);

      // Run the five unique queries in parallel
      const [
        deptTasksRes,
        pendingRes, // for pending_assignment and unassigned
        highPriorityRes,
        overdueRes, // for overdue and sla_breached
        completedTodayRes,
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || ''),

        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || '')
          .is('assignee_id', null),

        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || '')
          .in(
            'priority_id',
            [highPriorityId, importantPriorityId, immediatePriorityId].filter(
              (id) => id !== null
            )
          ),

        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || '')
          .lt('due_date', today)
          .in(
            'status_id',
            [openStatusId, inProgressStatusId, blockedStatusId].filter(
              (id) => id !== null
            )
          ),

        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || '')
          .eq('due_date', today)
          .in(
            'status_id',
            [completedStatusId, closedStatusId].filter((id) => id !== null)
          ),
      ]);

      const responseBody = {
        dashboard: {
          role: 'manager',
          department_tasks: deptTasksRes.count || 0,
          pending_assignment: pendingRes.count || 0,
          unassigned: pendingRes.count || 0, // same as pending_assignment
          high_priority: highPriorityRes.count || 0,
          overdue: overdueRes.count || 0,
          completed_today: completedTodayRes.count || 0,
          sla_breached: overdueRes.count || 0, // same as overdue
        },
        success: true,
      };

      setInCache(cacheKey, responseBody);
      return NextResponse.json(responseBody);
    }

    const myOpenRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const dueTodayRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .eq('due_date', today)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const dueSoonRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .gt('due_date', today)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const overdueRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .lt('due_date', today)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const supportingRes = await supabase
      .from('task_assignments')
      .select('task_id', { count: 'exact', head: true })
      .eq('user_id', staffUser.id);

    const spectatingRes = await supabase
      .from('task_spectators')
      .select('task_id', { count: 'exact', head: true })
      .eq('user_id', staffUser.id);

    return NextResponse.json({
      dashboard: {
        role: 'staff',
        my_open_tasks: myOpenRes.count || 0,
        due_today: dueTodayRes.count || 0,
        due_soon: dueSoonRes.count || 0,
        overdue: overdueRes.count || 0,
        supporting: supportingRes.count || 0,
        spectating: spectatingRes.count || 0,
      },
      success: true,
    });
  } catch (err: any) {
    console.error('[Dashboard GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getStatusId(
  supabase: any,
  name: string
): Promise<string | null> {
  const { data } = await supabase
    .from('task_statuses')
    .select('id')
    .eq('name', name)
    .single();
  return data?.id || null;
}

async function getStatusIds(supabase: any, names: string[]): Promise<string[]> {
  const { data } = await supabase
    .from('task_statuses')
    .select('id')
    .in('name', names);
  return (data || []).map((s: any) => s.id);
}

async function getPriorityIds(
  supabase: any,
  names: string[]
): Promise<string[]> {
  const { data } = await supabase
    .from('task_priorities')
    .select('id')
    .in('name', names);
  return (data || []).map((p: any) => p.id);
}

async function getPriorityId(
  supabase: any,
  name: string
): Promise<string | null> {
  const { data } = await supabase
    .from('task_priorities')
    .select('id')
    .eq('name', name)
    .single();
  return data?.id || null;
}
