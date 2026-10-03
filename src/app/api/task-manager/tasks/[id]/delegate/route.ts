import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

/**
 * POST /api/task-manager/tasks/[id]/delegate
 *
 * Allows a Department Manager to re-delegate a department-assigned task to a
 * specific staff member within their department.
 *
 * Strict Guard: This endpoint is ONLY available when the task was originally
 * assigned via the Department route (assigned_type = 'department').
 * If the task was assigned directly to the manager as an individual
 * (assigned_type = 'direct_user'), this endpoint returns 403.
 */
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

    const { staff_id } = body;
    if (!staff_id || typeof staff_id !== 'string') {
      return NextResponse.json(
        { error: 'staff_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Fetch task
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select(
        'id, title, assigned_type, assignee_id, department_id, created_by, status_name:task_statuses(name)'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ── Guard 1: Only available for department-assigned tasks ──────────────
    if (task.assigned_type !== 'department') {
      return NextResponse.json(
        {
          error:
            'Delegation is only available for tasks originally assigned to a department. ' +
            'This task was assigned directly to an individual.',
        },
        { status: 403 }
      );
    }

    // ── Guard 1.5: Task must be accepted first ─────────────────────────────
    const currentStatus = (task as any).status_name?.name || 'Open';
    if (currentStatus === 'Open') {
      return NextResponse.json(
        {
          error:
            'You must accept the task before you can delegate it to your staff.',
        },
        { status: 403 }
      );
    }

    // ── Guard 2: Only the manager of the task's department may delegate ────
    const isAdmin = staffUser.role === 'super_admin';
    const isDeptManager =
      staffUser.role === 'manager' &&
      staffUser.department_id !== null &&
      staffUser.department_id === task.department_id;

    if (!isAdmin && !isDeptManager) {
      return NextResponse.json(
        {
          error:
            'Only the Department Manager can delegate department-assigned tasks.',
        },
        { status: 403 }
      );
    }

    // ── Guard 3: Target staff must be active, non-customer ────────────────
    const { data: targetStaff, error: staffErr } = await supabase
      .from('users')
      .select('id, full_name, email, department_id, role, account_status')
      .eq('id', staff_id)
      .neq('role', 'customer')
      .eq('account_status', 'active')
      .maybeSingle();

    if (staffErr || !targetStaff) {
      return NextResponse.json(
        { error: 'Target staff member not found or inactive' },
        { status: 400 }
      );
    }

    // ── Guard 4: Target must belong to the same department ────────────────
    if (!isAdmin && targetStaff.department_id !== task.department_id) {
      return NextResponse.json(
        {
          error:
            'You can only delegate to staff members within your own department.',
        },
        { status: 403 }
      );
    }

    const previousAssigneeId = task.assignee_id;

    // Update task: new assignee, keep assigned_type = 'department' so the
    // delegation chain stays intact.
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({
        assignee_id: staff_id,
        // assigned_type intentionally left as 'department'
      })
      .eq('id', id);

    if (updateErr) {
      console.error('[Delegate POST] Error updating task:', updateErr);
      return NextResponse.json(
        { error: 'Failed to delegate task' },
        { status: 500 }
      );
    }

    // Record in task_assignments
    const { data: existingAssignment } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', id)
      .eq('user_id', staff_id)
      .maybeSingle();

    if (!existingAssignment) {
      await supabase.from('task_assignments').insert({
        task_id: id,
        user_id: staff_id,
        assigned_by: staffUser.id,
      });
    }

    // Notify the newly delegated staff member
    if (staff_id !== staffUser.id) {
      await supabase.from('notifications').insert({
        user_id: staff_id,
        title: 'Task Delegated to You',
        message: `Task "${task.title}" has been delegated to you by your manager.`,
        category: 'TASK_ASSIGNMENT',
        reference_type: 'task',
        reference_id: id,
        actor_id: staffUser.id,
      });
    }

    // Notify the previous assignee (manager) that task was delegated away
    if (
      previousAssigneeId &&
      previousAssigneeId !== staffUser.id &&
      previousAssigneeId !== staff_id
    ) {
      await supabase.from('notifications').insert({
        user_id: previousAssigneeId,
        title: 'Task Delegated',
        message: `Task "${task.title}" has been delegated to ${targetStaff.full_name}.`,
        category: 'TASK_ASSIGNMENT',
        reference_type: 'task',
        reference_id: id,
        actor_id: staffUser.id,
      });
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'delegated',
      old_value: { assignee_id: previousAssigneeId },
      new_value: {
        assignee_id: staff_id,
        assignee_name: targetStaff.full_name,
        delegated_by: staffUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Task successfully delegated to ${targetStaff.full_name}`,
    });
  } catch (err: any) {
    console.error('[Delegate POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
