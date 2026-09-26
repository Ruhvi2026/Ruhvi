import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

function generateTaskIdText() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TM-${ts}-${rand}`;
}

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');
    const assignee = searchParams.get('assignee');
    const creator = searchParams.get('creator');
    const dueBefore = searchParams.get('due_before');
    const dueAfter = searchParams.get('due_after');
    const search = searchParams.get('search');
    const myTasks = searchParams.get('my_tasks') === 'true';
    const assignedByMe = searchParams.get('assigned_by_me') === 'true';
    const supporting = searchParams.get('supporting') === 'true';
    const spectating = searchParams.get('spectating') === 'true';
    const dueToday = searchParams.get('due_today') === 'true';
    const overdue = searchParams.get('overdue') === 'true';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortDir = searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc';

    const supabase = getServiceClient();
    const isAdmin = staffUser.role === 'super_admin';

    const validSortColumns = [
      'created_at',
      'updated_at',
      'due_date',
      'priority_id',
      'status_id',
      'title',
    ];
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : 'created_at';

    let accessibleIds: string[] | null = null;

    if (!isAdmin && !myTasks && !assignedByMe && !supporting && !spectating) {
      const orParts = [
        `created_by.eq.${staffUser.id}`,
        `assignee_id.eq.${staffUser.id}`,
      ];
      if (staffUser.department_id) {
        orParts.push(`department_id.eq.${staffUser.department_id}`);
      }

      const { data: directTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('deleted_at', null)
        .or(orParts.join(','));

      const [assignmentsRes, spectatorsRes] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('task_id')
          .eq('user_id', staffUser.id),
        supabase
          .from('task_spectators')
          .select('task_id')
          .eq('user_id', staffUser.id),
      ]);

      const idSet = new Set<string>();
      (directTasks || []).forEach((t: any) => idSet.add(t.id));
      (assignmentsRes.data || []).forEach((a: any) => idSet.add(a.task_id));
      (spectatorsRes.data || []).forEach((s: any) => idSet.add(s.task_id));
      accessibleIds = [...idSet];

      if (accessibleIds.length === 0) {
        return NextResponse.json({
          tasks: [],
          total: 0,
          page: 1,
          limit,
          has_more: false,
          success: true,
        });
      }
    }

    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
        creator:users!tasks_created_by_fkey(id, full_name, email),
        priority_name:task_priorities(name, level, color),
        status_name:task_statuses(name, display_order, color),
        type_name:task_types(name, icon),
        department_name:departments(name),
        order:orders(order_number, id),
        product:products(id, name, slug),
        ticket:support_tickets(id, ticket_number)
      `,
        { count: 'exact' }
      )
      .eq('deleted_at', null);

    if (accessibleIds !== null) {
      query = query.in('id', accessibleIds);
    }

    if (myTasks) {
      query = query.or(
        `created_by.eq.${staffUser.id},assignee_id.eq.${staffUser.id}`
      );
    }

    if (assignedByMe) {
      const { data: myAssignments } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('assigned_by', staffUser.id);
      const taskIds = (myAssignments || []).map((a: any) => a.task_id);
      if (taskIds.length > 0) {
        query = query.in('id', taskIds);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (supporting) {
      const { data: mySupporting } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', staffUser.id);
      const taskIds = (mySupporting || []).map((a: any) => a.task_id);
      if (taskIds.length > 0) {
        query = query.in('id', taskIds);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (spectating) {
      const { data: mySpectating } = await supabase
        .from('task_spectators')
        .select('task_id')
        .eq('user_id', staffUser.id);
      const taskIds = (mySpectating || []).map((s: any) => s.task_id);
      if (taskIds.length > 0) {
        query = query.in('id', taskIds);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (status) {
      const { data: statusRow } = await supabase
        .from('task_statuses')
        .select('id')
        .eq('name', status)
        .single();
      if (statusRow) query = query.eq('status_id', statusRow.id);
    }

    if (priority) {
      const { data: priorityRow } = await supabase
        .from('task_priorities')
        .select('id')
        .eq('name', priority)
        .single();
      if (priorityRow) query = query.eq('priority_id', priorityRow.id);
    }

    if (department && isAdmin) {
      query = query.eq('department_id', department);
    }

    if (assignee) {
      query = query.eq('assignee_id', assignee);
    }

    if (creator) {
      query = query.eq('created_by', creator);
    }

    if (dueBefore) query = query.lte('due_date', dueBefore);
    if (dueAfter) query = query.gte('due_date', dueAfter);

    if (dueToday) {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('due_date', today);
    }

    if (overdue) {
      query = query.lt('due_date', new Date().toISOString().split('T')[0]);
      const { data: statuses } = await supabase
        .from('task_statuses')
        .select('id, name')
        .neq('name', 'Completed')
        .neq('name', 'Closed');
      const nonFinalIds = (statuses || []).map((s: any) => s.id);
      if (nonFinalIds.length > 0) {
        query = query.in('status_id', nonFinalIds);
      }
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,task_id_text.ilike.%${search}%`
      );
    }

    const {
      data: tasks,
      error,
      count,
    } = await query
      .order(sortColumn, { ascending: sortDir === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Tasks GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tasks: tasks || [],
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      has_more: (count || 0) > offset + limit,
      success: true,
    });
  } catch (err: any) {
    console.error('[Tasks GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
