import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

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
          .eq('deleted_at', null),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('status_id', (await getStatusId(supabase, 'Open')) || ''),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('status_id', (await getStatusId(supabase, 'In Progress')) || ''),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Completed', 'Closed'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .lt('due_date', today)
          .not(
            'status_id',
            'in',
            `(${await getStatusIds(supabase, ['Completed', 'Closed']).then((ids) => ids.join(','))})`
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Completed', 'Closed'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
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
          .eq('deleted_at', null)
          .eq('department_id', dept.id);
        const { count: openCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', dept.id)
          .eq('status_id', (await getStatusId(supabase, 'Open')) || '');
        const { count: overdueCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
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
          .eq('deleted_at', null)
          .or(`assignee_id.eq.${member.id},created_by.eq.${member.id}`);
        const { count: openCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('assignee_id', member.id)
          .eq('status_id', (await getStatusId(supabase, 'Open')) || '');
        const { count: overdueCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
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
      const [
        deptTasksRes,
        pendingRes,
        unassignedRes,
        highPriorityRes,
        overdueRes,
        completedTodayRes,
        slaBreachedRes,
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || ''),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || '')
          .is('assignee_id', null),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || '')
          .is('assignee_id', null),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || '')
          .in(
            'priority_id',
            await getPriorityIds(supabase, ['High', 'Important', 'Immediate'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || '')
          .lt('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || '')
          .eq('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Completed', 'Closed'])
          ),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deleted_at', null)
          .eq('department_id', deptId || '')
          .lt('due_date', today)
          .in(
            'status_id',
            await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
          ),
      ]);

      return NextResponse.json({
        dashboard: {
          role: 'manager',
          department_tasks: deptTasksRes.count || 0,
          pending_assignment: pendingRes.count || 0,
          unassigned: unassignedRes.count || 0,
          high_priority: highPriorityRes.count || 0,
          overdue: overdueRes.count || 0,
          completed_today: completedTodayRes.count || 0,
          sla_breached: slaBreachedRes.count || 0,
        },
        success: true,
      });
    }

    const myOpenRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const dueTodayRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .eq('due_date', today)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const dueSoonRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('deleted_at', null)
      .or(`assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`)
      .gt('due_date', today)
      .in(
        'status_id',
        await getStatusIds(supabase, ['Open', 'In Progress', 'Blocked'])
      );

    const overdueRes = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('deleted_at', null)
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
