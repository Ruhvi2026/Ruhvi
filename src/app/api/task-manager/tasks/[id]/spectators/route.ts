import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const supabase = getServiceClient();

    // Verify access to task
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access
    const canView =
      staffUser.role === 'super_admin' ||
      task.created_by === staffUser.id ||
      task.assignee_id === staffUser.id ||
      (staffUser.department_id &&
        task.department_id === staffUser.department_id) ||
      (
        await supabase
          .from('task_assignments')
          .select('id')
          .eq('task_id', id)
          .eq('user_id', staffUser.id)
          .single()
      ).data ||
      (
        await supabase
          .from('task_spectators')
          .select('id')
          .eq('task_id', id)
          .eq('user_id', staffUser.id)
          .single()
      ).data;

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: spectators, error } = await supabase
      .from('task_spectators')
      .select(
        '*, spectator:users(id, full_name, email, avatar_url, department)'
      )
      .eq('task_id', id)
      .order('added_at', { ascending: true });

    if (error) {
      console.error('[Spectator GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch spectators' },
        { status: 500 }
      );
    }

    return NextResponse.json({ spectators: spectators || [], success: true });
  } catch (err: any) {
    console.error('[Spectator GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify access to task
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access - only creator, assignee, manager, or admin can add spectators
    const canManage =
      staffUser.role === 'super_admin' ||
      staffUser.id === task.created_by ||
      staffUser.id === task.assignee_id ||
      (staffUser.department_id &&
        task.department_id === staffUser.department_id &&
        staffUser.role === 'manager');

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify spectator is not assignee or creator
    if (user_id === task.assignee_id || user_id === task.created_by) {
      return NextResponse.json(
        { error: 'Cannot add assignee or creator as spectator' },
        { status: 400 }
      );
    }

    // Check if already spectator
    const { data: existing } = await supabase
      .from('task_spectators')
      .select('id')
      .eq('task_id', id)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already a spectator' },
        { status: 400 }
      );
    }

    // Verify user exists and is staff
    const { data: spectatorUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user_id)
      .single();

    if (!spectatorUser || spectatorUser.role === 'customer') {
      return NextResponse.json(
        { error: 'Invalid spectator user' },
        { status: 400 }
      );
    }

    // Add spectator
    const { error } = await supabase.from('task_spectators').insert({
      task_id: id,
      user_id,
      added_by: staffUser.id,
    });

    if (error) {
      console.error('[Spectator POST] Error:', error);
      return NextResponse.json(
        { error: 'Failed to add spectator' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'spectator_added',
      new_value: { user_id },
    });

    // Notify spectator
    await supabase.from('notifications').insert({
      user_id,
      title: 'Added as Spectator to Task',
      message: `You have been added as a spectator to task "${task.id}"`,
      category: 'TASK_SPECTATOR',
      reference_type: 'task',
      reference_id: id,
      actor_id: staffUser.id,
    });

    return NextResponse.json({ success: true, message: 'Spectator added' });
  } catch (err: any) {
    console.error('[Spectator POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify access to task
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access - only creator, assignee, manager, or admin can remove spectators
    const canManage =
      staffUser.role === 'super_admin' ||
      staffUser.id === task.created_by ||
      staffUser.id === task.assignee_id ||
      (staffUser.department_id &&
        task.department_id === staffUser.department_id &&
        staffUser.role === 'manager') ||
      staffUser.id === userId; // Users can remove themselves as spectators

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove spectator
    const { error } = await supabase
      .from('task_spectators')
      .delete()
      .eq('task_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[Spectator DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to remove spectator' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'spectator_removed',
      old_value: { user_id: userId },
    });

    return NextResponse.json({ success: true, message: 'Spectator removed' });
  } catch (err: any) {
    console.error('[Spectator DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
