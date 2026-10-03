import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

/**
 * GET/POST/DELETE /api/task-manager/tasks/[id]/collaborators
 *
 * Any staff member involved with a task (creator, assignee, existing
 * collaborator, spectator, or dept member) may add collaborators.
 * This is globally accessible — no hierarchy restriction applies.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

async function canAccessTask(
  supabase: ReturnType<typeof getServiceClient>,
  taskId: string,
  staffUser: { id: string; role: string; department_id: string | null }
): Promise<{
  allowed: boolean;
  task: {
    id: string;
    title: string;
    assigned_type: string;
    assignee_id: string | null;
    department_id: string | null;
    created_by: string;
  } | null;
}> {
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, assigned_type, assignee_id, department_id, created_by')
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!task) return { allowed: false, task: null };

  if (staffUser.role === 'super_admin') return { allowed: true, task };

  // Check direct involvement
  if (task.created_by === staffUser.id || task.assignee_id === staffUser.id)
    return { allowed: true, task };

  // Check department membership
  if (staffUser.department_id && task.department_id === staffUser.department_id)
    return { allowed: true, task };

  // Check if already a collaborator or spectator
  const [collabRes, spectatorRes, assignmentRes] = await Promise.all([
    supabase
      .from('task_collaborators')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', staffUser.id)
      .maybeSingle(),
    supabase
      .from('task_spectators')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', staffUser.id)
      .maybeSingle(),
    supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', staffUser.id)
      .maybeSingle(),
  ]);

  if (collabRes.data || spectatorRes.data || assignmentRes.data)
    return { allowed: true, task };

  return { allowed: false, task };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

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

    const { allowed } = await canAccessTask(supabase, id, staffUser);
    if (!allowed)
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const { data: collaborators, error } = await supabase
      .from('task_collaborators')
      .select(
        '*, collaborator:users!task_collaborators_user_id_fkey(id, full_name, email, avatar_url, department_id, role), added_by_user:users!task_collaborators_added_by_fkey(id, full_name, email)'
      )
      .eq('task_id', id)
      .order('added_at', { ascending: true });

    if (error) {
      console.error('[Collaborators GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collaborators' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      collaborators: collaborators || [],
      success: true,
    });
  } catch (err: any) {
    console.error('[Collaborators GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { user_id } = body;
    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { allowed, task } = await canAccessTask(supabase, id, staffUser);
    if (!allowed || !task)
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Validate target user — must be active staff
    const { data: targetUser, error: userErr } = await supabase
      .from('users')
      .select('id, full_name, email, account_status, role')
      .eq('id', user_id)
      .neq('role', 'customer')
      .eq('account_status', 'active')
      .maybeSingle();

    if (userErr || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found or is not an active staff member' },
        { status: 400 }
      );
    }

    // Prevent adding primary assignee or creator as collaborator (they already have full access)
    if (user_id === task.assignee_id) {
      return NextResponse.json(
        {
          error:
            'This staff member is already the primary assignee of this task',
        },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('task_collaborators')
      .select('id')
      .eq('task_id', id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This staff member is already a collaborator on this task' },
        { status: 400 }
      );
    }

    // Insert collaborator
    const { error: insertErr } = await supabase
      .from('task_collaborators')
      .insert({
        task_id: id,
        user_id,
        added_by: staffUser.id,
      });

    if (insertErr) {
      console.error('[Collaborators POST] Error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to add collaborator' },
        { status: 500 }
      );
    }

    // Notify the new collaborator
    if (user_id !== staffUser.id) {
      await supabase.from('notifications').insert({
        user_id,
        title: 'Added as Task Collaborator',
        message: `You have been added as a collaborator on task "${task.title}". You now have access to view and contribute to this task.`,
        category: 'TASK_COLLABORATOR',
        reference_type: 'task',
        reference_id: id,
        actor_id: staffUser.id,
      });
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'collaborator_added',
      new_value: {
        collaborator_id: user_id,
        collaborator_name: targetUser.full_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${targetUser.full_name} has been added as a collaborator`,
    });
  } catch (err: any) {
    console.error('[Collaborators POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

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
    const collaboratorUserId = searchParams.get('user_id');
    const collaboratorId = searchParams.get('collaborator_id');

    if (!collaboratorUserId && !collaboratorId) {
      return NextResponse.json(
        { error: 'user_id or collaborator_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify task access
    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, created_by, assignee_id, department_id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (taskErr || !task)
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Only admin, task creator, assignee, or dept-manager can remove collaborators
    const canRemove =
      staffUser.role === 'super_admin' ||
      staffUser.id === task.created_by ||
      staffUser.id === task.assignee_id ||
      (staffUser.role === 'manager' &&
        staffUser.department_id === task.department_id);

    if (!canRemove) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let deleteQuery = supabase
      .from('task_collaborators')
      .delete()
      .eq('task_id', id);

    if (collaboratorId) {
      deleteQuery = deleteQuery.eq('id', collaboratorId);
    } else if (collaboratorUserId) {
      deleteQuery = deleteQuery.eq('user_id', collaboratorUserId);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('[Collaborators DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to remove collaborator' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'collaborator_removed',
      old_value: {
        collaborator_user_id: collaboratorUserId,
        collaborator_id: collaboratorId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Collaborator removed',
    });
  } catch (err: any) {
    console.error('[Collaborators DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
