import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateTaskIdText() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TM-${ts}-${rand}`;
}

class ValidationError extends Error {}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalUuid(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new ValidationError(`${label} must be a valid UUID`);
  }
  return value;
}

const TASK_SELECT = `
  *,
  assignee:users!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
  creator:users!tasks_created_by_fkey(id, full_name, email, avatar_url),
  spectators:task_spectators(*, spectator:users!task_spectators_user_id_fkey(id, full_name, email, avatar_url)),
  collaborators:task_collaborators(*, collaborator:users!task_collaborators_user_id_fkey(id, full_name, email, avatar_url, department_id, role)),
  priority_name:task_priorities(name, level, color),
  status_name:task_statuses(name, display_order, color),
  type_name:task_types(name, icon),
  department_name:departments(name),
  order:orders(id, order_number, status, total, payment_method, payment_status, created_at, user_id),
  product:products(id, name, slug, sku, price, mrp, stock_quantity, status),
  ticket:support_tickets(id, ticket_number, title, description, status, priority, customer_email, guest_name, created_at),
  recurrence:task_recurrences(*)
`;

// Fall back to default priority ('Normal'/'Medium' or lowest level)
// and default status ('Open' or lowest display_order).
async function resolveDefaultStatusId(
  supabase: ReturnType<typeof getServiceClient>
): Promise<string | null> {
  const { data } = await supabase
    .from('task_statuses')
    .select('id')
    .ilike('name', 'Open')
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: fallback, error } = await supabase
    .from('task_statuses')
    .select('id')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Tasks POST] Error resolving default status:', error);
    return null;
  }
  return fallback?.id ?? null;
}

async function resolveDefaultPriorityId(
  supabase: ReturnType<typeof getServiceClient>
): Promise<string | null> {
  const { data } = await supabase
    .from('task_priorities')
    .select('id')
    .or('name.ilike.Normal,name.ilike.Medium,name.ilike.Low')
    .limit(1)
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: fallback, error } = await supabase
    .from('task_priorities')
    .select('id')
    .order('level', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Tasks POST] Error resolving default priority:', error);
    return null;
  }
  return fallback?.id ?? null;
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
    const allMyTasks = searchParams.get('all_my_tasks') === 'true';
    const assignedByMe = searchParams.get('assigned_by_me') === 'true';
    const supporting = searchParams.get('supporting') === 'true';
    const spectating = searchParams.get('spectating') === 'true';
    const dueToday = searchParams.get('due_today') === 'true';
    const overdue = searchParams.get('overdue') === 'true';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortDir = searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc';

    const supabase = getServiceClient();
    const isAdmin =
      staffUser.role === 'super_admin' || staffUser.role === 'admin';

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

    if (
      !isAdmin &&
      !allMyTasks &&
      !myTasks &&
      !assignedByMe &&
      !supporting &&
      !spectating
    ) {
      const orParts = [
        `created_by.eq.${staffUser.id}`, // Always include creator's tasks
        `assignee_id.eq.${staffUser.id}`,
      ];
      if (staffUser.department_id) {
        orParts.push(`department_id.eq.${staffUser.department_id}`);
      }

      const { data: directTasks } = await supabase
        .from('tasks')
        .select('id')
        .is('deleted_at', null)
        .or(orParts.join(','));

      const [assignmentsRes, spectatorsRes, collaboratorsRes] =
        await Promise.all([
          supabase
            .from('task_assignments')
            .select('task_id')
            .eq('user_id', staffUser.id),
          supabase
            .from('task_spectators')
            .select('task_id')
            .or(`user_id.eq.${staffUser.id},spectator_id.eq.${staffUser.id}`),
          supabase
            .from('task_collaborators')
            .select('task_id')
            .eq('user_id', staffUser.id),
        ]);

      const idSet = new Set<string>();
      (directTasks || []).forEach((t: any) => idSet.add(t.id));
      (assignmentsRes.data || []).forEach((a: any) => idSet.add(a.task_id));
      (spectatorsRes.data || []).forEach((s: any) => idSet.add(s.task_id));
      (collaboratorsRes.data || []).forEach((c: any) => idSet.add(c.task_id));
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
      .select(TASK_SELECT, { count: 'exact' })
      .is('deleted_at', null);

    if (accessibleIds !== null) {
      query = query.in('id', accessibleIds);
    }

    if (myTasks) {
      const [assignmentsRes, spectatorsRes] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('task_id')
          .eq('user_id', staffUser.id),
        supabase
          .from('task_spectators')
          .select('task_id')
          .or(`user_id.eq.${staffUser.id},spectator_id.eq.${staffUser.id}`),
      ]);

      const myIdSet = new Set<string>();
      (assignmentsRes.data || []).forEach((a: any) => myIdSet.add(a.task_id));
      (spectatorsRes.data || []).forEach((s: any) => myIdSet.add(s.task_id));
      const myTaskIds = Array.from(myIdSet);

      if (myTaskIds.length > 0) {
        query = query.or(
          `assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id},id.in.(${myTaskIds.join(',')})`
        );
      } else {
        query = query.or(
          `assignee_id.eq.${staffUser.id},created_by.eq.${staffUser.id}`
        );
      }
    }

    if (allMyTasks) {
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
        .ilike('name', status)
        .maybeSingle();
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

    if (searchParams.get('my_open_tasks') === 'true') {
      const { data: statuses } = await supabase
        .from('task_statuses')
        .select('id')
        .neq('name', 'Completed')
        .neq('name', 'Closed');
      const nonFinalIds = (statuses || []).map((s: any) => s.id);
      if (nonFinalIds.length > 0) {
        query = query.in('status_id', nonFinalIds);
      }
    }

    if (searchParams.get('due_soon') === 'true') {
      const today = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(today.getDate() + 3);
      query = query
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', threeDaysLater.toISOString().split('T')[0]);
      const { data: statuses } = await supabase
        .from('task_statuses')
        .select('id')
        .neq('name', 'Completed')
        .neq('name', 'Closed');
      const nonFinalIds = (statuses || []).map((s: any) => s.id);
      if (nonFinalIds.length > 0) {
        query = query.in('status_id', nonFinalIds);
      }
    }

    if (
      searchParams.get('unassigned') === 'true' ||
      searchParams.get('pending_assignment') === 'true'
    ) {
      query = query.is('assignee_id', null);
    }

    if (searchParams.get('high_priority') === 'true') {
      const { data: priorityRows } = await supabase
        .from('task_priorities')
        .select('id')
        .in('name', ['High', 'Important', 'Immediate']);
      const priorityIds = (priorityRows || []).map((p: any) => p.id);
      if (priorityIds.length > 0) {
        query = query.in('priority_id', priorityIds);
      }
    }

    if (searchParams.get('completed_today') === 'true') {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: completedStatus } = await supabase
        .from('task_statuses')
        .select('id')
        .eq('name', 'Completed')
        .maybeSingle();
      if (completedStatus) {
        query = query
          .eq('status_id', completedStatus.id)
          .gte('updated_at', `${todayStr}T00:00:00.000Z`);
      }
    }

    if (searchParams.get('sla_breached') === 'true') {
      const todayStr = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', todayStr);
      const { data: statuses } = await supabase
        .from('task_statuses')
        .select('id')
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

    // Normalize department_name: Supabase join returns {name: string} but
    // the client Task type expects string | null.
    const normalizedTasks = (tasks || []).map((t: any) => ({
      ...t,
      department_name: t.department_name?.name ?? null,
    }));

    return NextResponse.json(
      {
        tasks: normalizedTasks,
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        has_more: (count || 0) > offset + limit,
        success: true,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[Tasks GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';

    if (!title)
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!description)
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );

    const supabase = getServiceClient();

    let assigneeId: string | null;
    let typeId: string | null;
    let departmentId: string | null;
    let relatedOrderId: string | null;
    let relatedProductId: string | null;
    let relatedTicketId: string | null;
    let priorityId: string | null;
    let statusId: string | null;

    // Gracefully resolve human identifiers (e.g. ORD-..., SKU, TKT-...) if not UUID
    let rawOrderId = body.related_order_id;
    if (
      rawOrderId &&
      typeof rawOrderId === 'string' &&
      !UUID_RE.test(rawOrderId.trim())
    ) {
      const { data: ord } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', rawOrderId.trim())
        .maybeSingle();
      if (ord) rawOrderId = ord.id;
    }

    let rawProductId = body.related_product_id;
    if (
      rawProductId &&
      typeof rawProductId === 'string' &&
      !UUID_RE.test(rawProductId.trim())
    ) {
      const { data: prd } = await supabase
        .from('products')
        .select('id')
        .or(`sku.eq.${rawProductId.trim()},slug.eq.${rawProductId.trim()}`)
        .maybeSingle();
      if (prd) rawProductId = prd.id;
    }

    let rawTicketId = body.related_ticket_id;
    if (
      rawTicketId &&
      typeof rawTicketId === 'string' &&
      !UUID_RE.test(rawTicketId.trim())
    ) {
      const { data: tkt } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('ticket_number', rawTicketId.trim())
        .maybeSingle();
      if (tkt) rawTicketId = tkt.id;
    }

    try {
      assigneeId = optionalUuid(body.assignee_id, 'Assignee');
      typeId = optionalUuid(body.type_id, 'Task type');
      departmentId = optionalUuid(body.department_id, 'Department');
      relatedOrderId = optionalUuid(rawOrderId, 'Related order');
      relatedProductId = optionalUuid(rawProductId, 'Related product');
      relatedTicketId = optionalUuid(rawTicketId, 'Related support ticket');
      priorityId = optionalUuid(body.priority_id, 'Priority');
      statusId = optionalUuid(body.status_id, 'Status');
    } catch (err) {
      if (err instanceof ValidationError)
        return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    const dueDate =
      typeof body.due_date === 'string' && body.due_date
        ? body.due_date.slice(0, 10)
        : null;
    if (dueDate && isNaN(Date.parse(dueDate))) {
      return NextResponse.json(
        { error: 'Due date is invalid' },
        { status: 400 }
      );
    }

    if (!priorityId) priorityId = await resolveDefaultPriorityId(supabase);
    if (!priorityId) {
      return NextResponse.json(
        { error: 'No task priorities are configured' },
        { status: 500 }
      );
    }

    if (!statusId) statusId = await resolveDefaultStatusId(supabase);
    if (!statusId) {
      return NextResponse.json(
        { error: 'No task statuses are configured' },
        { status: 500 }
      );
    }

    // An assignee must be an active staff member, never a customer.
    if (assigneeId) {
      const { data: assignee, error: assigneeErr } = await supabase
        .from('users')
        .select('id, department_id, role')
        .eq('id', assigneeId)
        .neq('role', 'customer')
        .eq('account_status', 'active')
        .maybeSingle();

      if (assigneeErr) {
        console.error('[Tasks POST] Error validating assignee:', assigneeErr);
        return NextResponse.json(
          { error: 'Failed to validate assignee' },
          { status: 500 }
        );
      }
      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee is not an active staff member' },
          { status: 400 }
        );
      }

      // Automatically fetch assignee's department if departmentId is not explicitly set
      if (!departmentId && assignee.department_id) {
        departmentId = assignee.department_id;
      }
    }

    if (!assigneeId && !departmentId) {
      return NextResponse.json(
        { error: 'Assignment (Assignee or Department) is required' },
        { status: 400 }
      );
    }

    // Determine assignment type:
    //   'department' = task routed to a department (assignee is dept manager)
    //   'direct_user' = task assigned directly to a specific individual
    const assignedType: 'department' | 'direct_user' =
      body.assigned_type === 'department'
        ? 'department'
        : body.department_id && !body.assignee_id
          ? 'department'
          : 'direct_user';

    const payload: Record<string, unknown> = {
      task_id_text: generateTaskIdText(),
      title,
      description,
      created_by: staffUser.id,
      priority_id: priorityId,
      status_id: statusId,
      department_id: departmentId ?? staffUser.department_id ?? null,
      assignee_id: assigneeId,
      assigned_type: assignedType,
      type_id: typeId,
      due_date: dueDate,
      due_time:
        typeof body.due_time === 'string' && body.due_time
          ? body.due_time.slice(0, 5)
          : null,
      start_time:
        typeof body.start_time === 'string' && body.start_time
          ? body.start_time.slice(0, 10)
          : null,
      expected_duration:
        typeof body.expected_duration === 'string' && body.expected_duration
          ? body.expected_duration.trim()
          : null,
      related_order_id: relatedOrderId,
      related_product_id: relatedProductId,
      related_ticket_id: relatedTicketId,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t: unknown) => typeof t === 'string' && t.trim())
        : [],
      is_recurring: Boolean(
        body.is_recurring ||
        (body.schedule_type &&
          body.schedule_type !== 'none' &&
          body.schedule_type !== 'fixed')
      ),
      schedule_type:
        typeof body.schedule_type === 'string' ? body.schedule_type : 'none',
      schedule_time:
        typeof body.schedule_time === 'string' && body.schedule_time
          ? body.schedule_time.slice(0, 5)
          : null,
    };

    const { data: firstRow, error: insertError } = await supabase
      .from('tasks')
      .insert(payload)
      .select(TASK_SELECT)
      .single();

    let createdTask: any = firstRow;

    // task_id_text carries a unique constraint, so a collision gets one retry.
    if (insertError?.code === '23505' && !createdTask) {
      payload.task_id_text = generateTaskIdText();
      const retry = await supabase
        .from('tasks')
        .insert(payload)
        .select(TASK_SELECT)
        .single();

      if (retry.error) {
        console.error('[Tasks POST] Error:', retry.error);
        return NextResponse.json(
          { error: 'Failed to create task' },
          { status: 500 }
        );
      }
      createdTask = retry.data;
    } else if (insertError) {
      console.error('[Tasks POST] Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    if (!createdTask) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    // Mirror the assignee onto the assignment history table.
    if (assigneeId) {
      await supabase.from('task_assignments').insert({
        task_id: createdTask.id,
        user_id: assigneeId,
        assigned_by: staffUser.id,
      });

      if (assigneeId !== staffUser.id) {
        await supabase.from('notifications').insert({
          user_id: assigneeId,
          title: 'New Task Assigned to You',
          message: `Task "${title}" has been assigned to you`,
          category: 'TASK_ASSIGNMENT',
          reference_type: 'task',
          reference_id: createdTask.id,
          actor_id: staffUser.id,
        });
      }
    }

    // Insert Suspector / Inspector if selected
    const spectatorId =
      body.spectator_id || body.inspector_id || body.suspector_id;
    if (
      spectatorId &&
      typeof spectatorId === 'string' &&
      UUID_RE.test(spectatorId.trim())
    ) {
      await supabase.from('task_spectators').insert({
        task_id: createdTask.id,
        user_id: spectatorId.trim(),
        added_by: staffUser.id,
      });

      if (spectatorId.trim() !== staffUser.id) {
        await supabase.from('notifications').insert({
          user_id: spectatorId.trim(),
          title: 'Assigned as Task Inspector/Suspector',
          message: `You have been added as an inspector/suspector to task "${title}"`,
          category: 'TASK_SPECTATOR',
          reference_type: 'task',
          reference_id: createdTask.id,
          actor_id: staffUser.id,
        });
      }
    }

    // Persist recurrence definition if scheduled
    if (body.schedule_type && body.schedule_type !== 'none') {
      try {
        await supabase.from('task_recurrences').insert({
          task_id: createdTask.id,
          recurrence_pattern: body.schedule_type,
          recurrence_interval: 1,
          recurrence_days: Array.isArray(body.schedule_days)
            ? body.schedule_days
            : body.schedule_days
              ? [body.schedule_days]
              : null,
          trigger_time: body.schedule_time
            ? `${body.schedule_time}:00`
            : '09:00:00',
          due_time: body.due_time ? `${body.due_time}:00` : null,
          day_of_month: body.schedule_day_of_month
            ? parseInt(body.schedule_day_of_month, 10)
            : null,
          remind_overdue: body.remind_overdue !== false,
          is_active: true,
        });
      } catch (recErr) {
        console.error('[Tasks POST] Recurrence creation error:', recErr);
      }
    }

    await supabase.from('task_activity').insert({
      task_id: createdTask.id,
      user_id: staffUser.id,
      action: 'created',
      new_value: {
        title,
        status_id: statusId,
        priority_id: priorityId,
        assignee_id: assigneeId,
        department_id: payload.department_id,
      },
    });

    return NextResponse.json(
      {
        task: {
          ...createdTask,
          department_name: (createdTask as any)?.department_name?.name ?? null,
        },
        success: true,
        message: 'Task created successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Tasks POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
