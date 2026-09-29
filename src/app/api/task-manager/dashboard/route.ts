import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

// Simple in-memory cache for dashboard data (for manager role)
const dashboardCache = new Map();
const CACHE_TTL_SECONDS = 10;

// Initialize Supabase client outside the handler for connection reuse
const supabase = getServiceClient();

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

    const role = staffUser.role;
    const today = new Date().toISOString().split('T')[0];

    // Set edge caching headers
    const headers = new Headers();
    headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');

    if (role === 'super_admin' || role === 'admin') {
      // Fetch all initial counts in parallel
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

      // Process department workload in parallel
      const departments = deptWorkloadRes.data || [];
      const departmentWorkloadPromises = departments.map(async (dept) => {
        const [
          { count: totalCount },
          { count: openCount },
          { count: overdueCount },
        ] = await Promise.all([
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('department_id', dept.id),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('department_id', dept.id)
            .eq('status_id', (await getStatusId(supabase, 'Open')) || ''),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('department_id', dept.id)
            .lt('due_date', today)
            .in(
              'status_id',
              await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
            ),
        ]);

        return [
          dept.name,
          {
            total: totalCount || 0,
            open: openCount || 0,
            overdue: overdueCount || 0,
          },
        ];
      });

      const departmentWorkloadEntries = await Promise.all(
        departmentWorkloadPromises
      );
      const departmentWorkload = Object.fromEntries(departmentWorkloadEntries);

      // Process staff workload in parallel
      const staffMembers = staffWorkloadRes.data || [];
      const staffWorkloadPromises = staffMembers.map(async (member) => {
        const [
          { count: totalCount },
          { count: openCount },
          { count: overdueCount },
        ] = await Promise.all([
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .or(`assignee_id.eq.${member.id},created_by.eq.${member.id}`),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('assignee_id', member.id)
            .eq('status_id', (await getStatusId(supabase, 'Open')) || ''),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('assignee_id', member.id)
            .lt('due_date', today)
            .in(
              'status_id',
              await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
            ),
        ]);

        return [
          member.full_name || member.id,
          {
            total: totalCount || 0,
            open: openCount || 0,
            overdue: overdueCount || 0,
          },
        ];
      });

      const staffWorkloadEntries = await Promise.all(staffWorkloadPromises);
      const staffWorkload = Object.fromEntries(staffWorkloadEntries);

      const responseBody = {
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
      };

      return NextResponse.json(responseBody, { headers });
    }

    if (role === 'manager') {
      const deptId = staffUser.department_id;
      const cacheKey = `dashboard-manager-${deptId || 'no-dept'}`;
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData, { headers });
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

      // Fetch all status and priority ids in parallel
      const [
        openStatusId,
        inProgressStatusId,
        blockedStatusId,
        completedStatusId,
        closedStatusId,
        highPriorityId,
        importantPriorityId,
        immediatePriorityId,
      ] = await Promise.all([
        getCachedStatusId('Open'),
        getCachedStatusId('In Progress'),
        getCachedStatusId('Blocked'),
        getCachedStatusId('Completed'),
        getCachedStatusId('Closed'),
        getCachedPriorityId('High'),
        getCachedPriorityId('Important'),
        getCachedPriorityId('Immediate'),
      ]);

      // Filter out null ids
      const validOpenStatusId = openStatusId ?? '';
      const validInProgressStatusId = inProgressStatusId ?? '';
      const validBlockedStatusId = blockedStatusId ?? '';
      const validCompletedStatusId = completedStatusId ?? '';
      const validClosedStatusId = closedStatusId ?? '';
      const validHighPriorityId = highPriorityId ?? '';
      const validImportantPriorityId = importantPriorityId ?? '';
      const validImmediatePriorityId = immediatePriorityId ?? '';

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
            [
              validHighPriorityId,
              validImportantPriorityId,
              validImmediatePriorityId,
            ].filter((id) => id !== '')
          ),

        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || '')
          .lt('due_date', today)
          .in(
            'status_id',
            [
              validOpenStatusId,
              validInProgressStatusId,
              validBlockedStatusId,
            ].filter((id) => id !== '')
          ),

        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('department_id', deptId || '')
          .eq('due_date', today)
          .in(
            'status_id',
            [validCompletedStatusId, validClosedStatusId].filter(
              (id) => id !== ''
            )
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
      return NextResponse.json(responseBody, { headers });
    }

    // Staff role - parallelize all queries
    const [
      myOpenRes,
      dueTodayRes,
      dueSoonRes,
      overdueRes,
      supportingRes,
      spectatingRes,
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
        .in(
          'status_id',
          await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
        ),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
        .eq('due_date', today)
        .in(
          'status_id',
          await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
        ),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
        .gt('due_date', today)
        .in(
          'status_id',
          await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
        ),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
        .lt('due_date', today)
        .in(
          'status_id',
          await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
        ),
      supabase
        .from('task_assignments')
        .select('task_id', { count: 'exact', head: true })
        .eq('user_id', staffUser.id),
      supabase
        .from('task_spectators')
        .select('task_id', { count: 'exact', head: true })
        .eq('user_id', staffUser.id),
    ]);

    const responseBody = {
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
    };

    return NextResponse.json(responseBody, { headers });
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
