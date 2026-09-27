import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

type StaffUser = NonNullable<Awaited<ReturnType<typeof getAuthenticatedStaff>>>;

async function fetchTaskForAccess(
  supabase: ReturnType<typeof getServiceClient>,
  id: string
) {
  const { data: task, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, created_by, assignee_id, department_id')
    .eq('id', id)
    .eq('deleted_at', null)
    .single();

  if (fetchErr || !task) return null;
  return task;
}

function canManageTask(
  staffUser: StaffUser,
  task: {
    created_by: string;
    assignee_id: string | null;
    department_id: string | null;
  }
) {
  return (
    staffUser.role === 'super_admin' ||
    staffUser.id === task.created_by ||
    staffUser.id === task.assignee_id ||
    (staffUser.department_id &&
      task.department_id === staffUser.department_id &&
      staffUser.role === 'manager') ||
    false
  );
}

async function canViewTask(
  supabase: ReturnType<typeof getServiceClient>,
  staffUser: StaffUser,
  task: {
    id: string;
    created_by: string;
    assignee_id: string | null;
    department_id: string | null;
  }
) {
  if (staffUser.role === 'super_admin') return true;
  if (task.created_by === staffUser.id || task.assignee_id === staffUser.id)
    return true;
  if (staffUser.department_id && task.department_id === staffUser.department_id)
    return true;

  const [assignmentRes, spectatorRes] = await Promise.all([
    supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', task.id)
      .eq('user_id', staffUser.id)
      .limit(1),
    supabase
      .from('task_spectators')
      .select('id')
      .eq('task_id', task.id)
      .eq('user_id', staffUser.id)
      .limit(1),
  ]);
  return Boolean(assignmentRes.data?.length || spectatorRes.data?.length);
}

// Load dependency rows plus the tasks they depend on (two-step query — no fragile embeds)
async function loadDependencies(
  supabase: ReturnType<typeof getServiceClient>,
  taskId: string
) {
  const { data: rows, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const depIds = [...new Set(rows.map((r) => r.depends_on_task_id))];
  const { data: depTasks } = await supabase
    .from('tasks')
    .select(
      'id, task_id_text, title, deleted_at, status_id, status_name:task_statuses(name, color)'
    )
    .in('id', depIds);

  const byId = new Map((depTasks || []).map((t: any) => [t.id, t]));
  return rows.map((row) => {
    const depTask: any = byId.get(row.depends_on_task_id) || null;
    const statusName = depTask?.status_name?.name || null;
    const isDone = statusName === 'Completed' || statusName === 'Closed';
    // Keep the stored status in sync with the dependency task's real state
    const status = isDone
      ? 'ready'
      : row.status === 'ready'
        ? 'waiting'
        : row.status;
    return {
      ...row,
      status,
      task: depTask
        ? {
            id: depTask.id,
            task_id_text: depTask.task_id_text,
            title: depTask.title,
            is_done: isDone,
            deleted: Boolean(depTask.deleted_at),
          }
        : null,
    };
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = getServiceClient();

    const task = await fetchTaskForAccess(supabase, id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const viewable = await canViewTask(supabase, staffUser, task);
    if (!viewable) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dependencies = await loadDependencies(supabase, id);
    return NextResponse.json({ dependencies, success: true });
  } catch (err: any) {
    console.error('[Dependencies GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { depends_on_task_id } = await req.json();

    if (!depends_on_task_id) {
      return NextResponse.json(
        { error: 'depends_on_task_id is required' },
        { status: 400 }
      );
    }

    if (depends_on_task_id === id) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const task = await fetchTaskForAccess(supabase, id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canManageTask(staffUser, task)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Dependency target must be a real, non-deleted task the user can at least see
    const { data: depTask } = await supabase
      .from('tasks')
      .select('id, deleted_at, status_id')
      .eq('id', depends_on_task_id)
      .maybeSingle();

    if (!depTask || depTask.deleted_at) {
      return NextResponse.json(
        { error: 'Dependency task not found' },
        { status: 404 }
      );
    }

    let depStatusName: string | null = null;
    if (depTask.status_id) {
      const { data: depStatus } = await supabase
        .from('task_statuses')
        .select('name')
        .eq('id', depTask.status_id)
        .maybeSingle();
      depStatusName = depStatus?.name || null;
    }

    const initialStatus =
      depStatusName === 'Completed' || depStatusName === 'Closed'
        ? 'ready'
        : 'waiting';

    const { data: created, error } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: id,
        depends_on_task_id,
        status: initialStatus,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This dependency already exists' },
          { status: 409 }
        );
      }
      console.error('[Dependencies POST] Error:', error);
      return NextResponse.json(
        { error: 'Failed to add dependency' },
        { status: 500 }
      );
    }

    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'dependency_added',
      new_value: { dependency_id: created.id, depends_on_task_id },
    });

    const dependencies = await loadDependencies(supabase, id);
    return NextResponse.json({
      dependency: created,
      dependencies,
      success: true,
    });
  } catch (err: any) {
    console.error('[Dependencies POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const dependencyId = searchParams.get('dependency_id');

    if (!dependencyId) {
      return NextResponse.json(
        { error: 'dependency_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const task = await fetchTaskForAccess(supabase, id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canManageTask(staffUser, task)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Make sure the dependency row actually belongs to this task
    const { data: existing } = await supabase
      .from('task_dependencies')
      .select('id, task_id, depends_on_task_id')
      .eq('id', dependencyId)
      .eq('task_id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: 'Dependency not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('id', dependencyId)
      .eq('task_id', id);

    if (error) {
      console.error('[Dependencies DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to remove dependency' },
        { status: 500 }
      );
    }

    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'dependency_removed',
      old_value: {
        dependency_id: dependencyId,
        depends_on_task_id: existing.depends_on_task_id,
      },
    });

    const dependencies = await loadDependencies(supabase, id);
    return NextResponse.json({ dependencies, success: true });
  } catch (err: any) {
    console.error('[Dependencies DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
