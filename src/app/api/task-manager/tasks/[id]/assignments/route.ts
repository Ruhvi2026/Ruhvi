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

    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select(
        '*, assigned_user:users!task_assignments_user_id_fkey(id, full_name, email, avatar_url, department), assigned_by_user:users!task_assignments_assigned_by_fkey(id, full_name, email)'
      )
      .eq('task_id', id)
      .order('assigned_at', { ascending: true });

    if (error) {
      console.error('[Assignments GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignments: assignments || [], success: true });
  } catch (err: any) {
    console.error('[Assignments GET] Error:', err);
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
    const { user_id, department_id } = await req.json();

    const supabase = getServiceClient();

    // Verify task exists
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id, title')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access - creator, assignee, manager, or admin can assign
    const canAssign =
      staffUser.role === 'super_admin' ||
      staffUser.id === task.created_by ||
      staffUser.id === task.assignee_id ||
      (staffUser.department_id &&
        task.department_id === staffUser.department_id &&
        staffUser.role === 'manager');

    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user_id) {
      // Direct staff assignment
      // Verify user exists and is staff
      const { data: targetUser } = await supabase
        .from('users')
        .select('id, role, full_name, email')
        .eq('id', user_id)
        .single();

      if (!targetUser || targetUser.role === 'customer') {
        return NextResponse.json(
          { error: 'Invalid assignee user' },
          { status: 400 }
        );
      }

      // Check if already assigned
      const { data: existing } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', id)
        .eq('user_id', user_id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'User already assigned to this task' },
          { status: 400 }
        );
      }

      // Add assignment
      const { error } = await supabase.from('task_assignments').insert({
        task_id: id,
        user_id,
        assigned_by: staffUser.id,
      });

      if (error) {
        console.error('[Assignments POST] Error:', error);
        return NextResponse.json(
          { error: 'Failed to assign task' },
          { status: 500 }
        );
      }

      // Update task's assignee_id if not set or if this is a direct assignment
      await supabase
        .from('tasks')
        .update({ assignee_id: user_id })
        .eq('id', id);

      // Log activity
      await supabase.from('task_activity').insert({
        task_id: id,
        user_id: staffUser.id,
        action: 'assigned',
        new_value: { user_id, assignee_name: targetUser.full_name },
      });

      // Notify assignee
      if (user_id !== staffUser.id) {
        await supabase.from('notifications').insert({
          user_id,
          title: 'New Task Assigned to You',
          message: `Task "${task.title}" has been assigned to you`,
          category: 'TASK_ASSIGNMENT',
          reference_type: 'task',
          reference_id: id,
          actor_id: staffUser.id,
        });
      }
    } else if (department_id) {
      // Department assignment - route to department manager
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', department_id)
        .single();

      if (!dept) {
        return NextResponse.json(
          { error: 'Invalid department' },
          { status: 400 }
        );
      }

      // Find department manager
      const { data: manager } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('department_id', department_id)
        .eq('role', 'manager')
        .eq('account_status', 'active')
        .single();

      // Update task department
      await supabase
        .from('tasks')
        .update({ department_id, assignee_id: manager?.id || null })
        .eq('id', id);

      // If manager found, assign to them
      if (manager) {
        const { data: existing } = await supabase
          .from('task_assignments')
          .select('id')
          .eq('task_id', id)
          .eq('user_id', manager.id)
          .single();

        if (!existing) {
          await supabase.from('task_assignments').insert({
            task_id: id,
            user_id: manager.id,
            assigned_by: staffUser.id,
          });

          // Notify manager
          await supabase.from('notifications').insert({
            user_id: manager.id,
            title: 'New Task Assigned to Your Department',
            message: `Task "${task.title}" has been assigned to ${dept.name} department`,
            category: 'TASK_ASSIGNMENT',
            reference_type: 'task',
            reference_id: id,
            actor_id: staffUser.id,
          });
        }
      }

      // Log activity
      await supabase.from('task_activity').insert({
        task_id: id,
        user_id: staffUser.id,
        action: 'department_assigned',
        new_value: {
          department_id,
          department_name: dept.name,
          manager_id: manager?.id,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Either user_id or department_id is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task assigned successfully',
    });
  } catch (err: any) {
    console.error('[Assignments POST] Error:', err);
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
    const assignmentId = searchParams.get('assignment_id');
    const userId = searchParams.get('user_id');

    const supabase = getServiceClient();

    // Verify task exists
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
    const canManage =
      staffUser.role === 'super_admin' ||
      staffUser.id === task.created_by ||
      (staffUser.department_id &&
        task.department_id === staffUser.department_id &&
        staffUser.role === 'manager');

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let deleteQuery = supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', id);

    if (assignmentId) {
      deleteQuery = deleteQuery.eq('id', assignmentId);
    } else if (userId) {
      deleteQuery = deleteQuery.eq('user_id', userId);
    } else {
      return NextResponse.json(
        { error: 'Assignment ID or User ID is required' },
        { status: 400 }
      );
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('[Assignments DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to remove assignment' },
        { status: 500 }
      );
    }

    // If removing the primary assignee, clear task.assignee_id
    if (userId && userId === task.assignee_id) {
      await supabase.from('tasks').update({ assignee_id: null }).eq('id', id);
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'assignment_removed',
      old_value: { user_id: userId, assignment_id: assignmentId },
    });

    return NextResponse.json({ success: true, message: 'Assignment removed' });
  } catch (err: any) {
    console.error('[Assignments DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
