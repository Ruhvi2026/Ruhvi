import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

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

    // Get task with all relations
    const { data: task, error } = (await supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, email, department_id, role, avatar_url),
        creator:users!tasks_created_by_fkey(id, full_name, email, avatar_url),
        priority_name:task_priorities(name, level, color),
        status_name:task_statuses(name, display_order, color),
        type_name:task_types(name, icon),
        department_name:departments(name),
        order:orders(id, order_number, status, total, payment_method, payment_status, created_at, user_id),
        product:products(id, name, slug, sku, price, mrp, stock_quantity, status),
        ticket:support_tickets(id, ticket_number, title, description, status, priority, customer_email, guest_name, created_at),
        recurrence:task_recurrences(*),
        
        // Aggregates
        assignments:task_assignments(*, assigned_user:users!task_assignments_user_id_fkey(id, full_name, email, avatar_url)),
        spectators:task_spectators(*, spectator:users!task_spectators_user_id_fkey(id, full_name, email, avatar_url)),
        comments:task_comments(*, user:users(id, full_name, email, avatar_url)),
        checklists:task_checklists(*),
        attachments:task_attachments(*),
        activity:task_activity(*, user:users(id, full_name, email, avatar_url))
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single()) as { data: any; error: any };

    if (error) {
      console.error('[Task GET /:id] Error:', error);
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Validate access
    if (staffUser.role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Staff can only see tasks in their department or assigned to them or created by them or spectating
    const canView =
      staffUser.role === 'super_admin' ||
      task.created_by === staffUser.id ||
      task.assignee_id === staffUser.id ||
      (staffUser.department_id &&
        task.department_id === staffUser.department_id) ||
      task.assignments?.some((a: any) => a.assigned_user.id === staffUser.id) ||
      task.spectators?.some((s: any) => s.spectator.id === staffUser.id);

    if (!canView) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Normalize department_name: Supabase join returns {name: string}
    // If not directly present on task, fetch automatically from assignee's department
    let departmentName = task.department_name?.name ?? null;
    if (!departmentName && task.assignee?.department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', task.assignee.department_id)
        .maybeSingle();
      if (dept) departmentName = dept.name;
    }

    const normalizedTask = {
      ...task,
      department_name: departmentName,
    };

    return NextResponse.json({ task: normalizedTask, success: true });
  } catch (err: any) {
    console.error('[Task GET /:id] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Map request fields to database fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status_id !== undefined) updates.status_id = body.status_id;
    if (body.priority_id !== undefined) updates.priority_id = body.priority_id;
    if (body.assignee_id !== undefined) updates.assignee_id = body.assignee_id;
    if (body.department_id !== undefined)
      updates.department_id = body.department_id;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.due_time !== undefined) updates.due_time = body.due_time;
    if (body.expected_duration !== undefined)
      updates.expected_duration = body.expected_duration;
    if (body.start_time !== undefined) updates.start_time = body.start_time;
    if (body.type_id !== undefined) updates.type_id = body.type_id;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.schedule_type !== undefined)
      updates.schedule_type = body.schedule_type;
    if (body.schedule_time !== undefined)
      updates.schedule_time = body.schedule_time;
    if (body.is_recurring !== undefined)
      updates.is_recurring = body.is_recurring;
    if (body.related_order_id !== undefined)
      updates.related_order_id = body.related_order_id;
    if (body.related_product_id !== undefined)
      updates.related_product_id = body.related_product_id;
    if (body.related_ticket_id !== undefined)
      updates.related_ticket_id = body.related_ticket_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Check if user has permission to update
    const { data: existingTask, error: fetchErr } = await supabase
      .from('tasks')
      .select('*, assignee_id, department_id, created_by, status_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check
    const canUpdate =
      staffUser.role === 'super_admin' ||
      staffUser.id === existingTask.assignee_id ||
      staffUser.id === existingTask.created_by ||
      (staffUser.department_id &&
        staffUser.department_id === existingTask.department_id &&
        staffUser.role === 'manager');

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle status change to completed/closed - set timestamps
    let reachedFinalStatus = false;
    if (body.status_id) {
      const { data: newStatus } = await supabase
        .from('task_statuses')
        .select('name')
        .eq('id', body.status_id)
        .single();

      if (newStatus?.name === 'Completed' && !existingTask.completed_at) {
        updates.completed_at = new Date().toISOString();
        if (
          existingTask.created_by &&
          existingTask.created_by !== staffUser.id
        ) {
          await supabase.from('notifications').insert({
            user_id: existingTask.created_by,
            title: 'Task Completed',
            message: `Task "${existingTask.title}" has been marked as Completed and is ready for your review.`,
            category: 'TASK_STATUS_UPDATE',
            reference_type: 'task',
            reference_id: id,
            actor_id: staffUser.id,
          });
        }
      }
      if (newStatus?.name === 'Closed' && !existingTask.closed_at) {
        updates.closed_at = new Date().toISOString();
      }
      if (newStatus?.name === 'Completed' || newStatus?.name === 'Closed') {
        reachedFinalStatus = true;
      }
    }

    // Update task
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, email, department, avatar_url),
        creator:users!tasks_created_by_fkey(id, full_name, email),
        priority_name:task_priorities(name, level, color),
        status_name:task_statuses(name, display_order, color),
        type_name:task_types(name, icon),
        department_name:departments(name)
      `
      )
      .single();

    if (error) {
      console.error('[Task PUT] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }

    // Sync group name if title changed
    if (
      updates.title &&
      existingTask.messenger_group_id &&
      updates.title !== existingTask.title
    ) {
      const groupName =
        `Task: ${existingTask.task_id_text} - ${updates.title}`.substring(
          0,
          100
        );
      await supabase
        .from('chat_conversations')
        .update({ group_name: groupName })
        .eq('id', existingTask.messenger_group_id);

      // Optionally insert a system message in the chat about the rename
      await supabase.from('chat_messages').insert({
        conversation_id: existingTask.messenger_group_id,
        sender_id: staffUser.id,
        message_type: 'system',
        system_action: 'group_renamed',
        text_content: `Task renamed to "${updates.title}". Group name synced automatically.`,
      });
    }

    // If assignee changed, create assignment record
    if (body.assignee_id && body.assignee_id !== existingTask.assignee_id) {
      await supabase.from('task_assignments').insert({
        task_id: id,
        user_id: body.assignee_id,
        assigned_by: staffUser.id,
      });

      if (body.assignee_id !== staffUser.id) {
        await supabase.from('notifications').insert({
          user_id: body.assignee_id,
          title: 'Task Reassigned to You',
          message: `Task "${updatedTask.title}" has been reassigned to you`,
          category: 'TASK_ASSIGNMENT',
          reference_type: 'task',
          reference_id: id,
          actor_id: staffUser.id,
        });
      }
    }

    // Handle Suspector / Inspector update
    const spectatorId =
      body.spectator_id !== undefined
        ? body.spectator_id
        : body.inspector_id !== undefined
          ? body.inspector_id
          : body.suspector_id;
    if (spectatorId !== undefined) {
      await supabase.from('task_spectators').delete().eq('task_id', id);
      if (
        spectatorId &&
        typeof spectatorId === 'string' &&
        spectatorId.trim()
      ) {
        await supabase.from('task_spectators').insert({
          task_id: id,
          user_id: spectatorId.trim(),
          added_by: staffUser.id,
        });

        if (spectatorId.trim() !== staffUser.id) {
          await supabase.from('notifications').insert({
            user_id: spectatorId.trim(),
            title: 'Assigned as Task Inspector/Suspector',
            message: `You have been assigned as an inspector/suspector to task "${updatedTask.title}"`,
            category: 'TASK_SPECTATOR',
            reference_type: 'task',
            reference_id: id,
            actor_id: staffUser.id,
          });
        }
      }
    }

    // If schedule_type changed or recurrence configured
    if (body.schedule_type !== undefined) {
      if (body.schedule_type && body.schedule_type !== 'none') {
        const { data: existingRec } = await supabase
          .from('task_recurrences')
          .select('id')
          .eq('task_id', id)
          .maybeSingle();

        const recPayload = {
          task_id: id,
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
          updated_at: new Date().toISOString(),
        };

        if (existingRec) {
          await supabase
            .from('task_recurrences')
            .update(recPayload)
            .eq('id', existingRec.id);
        } else {
          await supabase.from('task_recurrences').insert(recPayload);
        }
      } else {
        await supabase
          .from('task_recurrences')
          .update({ is_active: false })
          .eq('task_id', id);
      }
    }

    // Log activity
    const changes: Record<string, unknown> = {};
    Object.keys(updates).forEach((key) => {
      changes[key] = updates[key];
    });
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'updated',
      old_value: existingTask,
      new_value: changes,
    });

    // Task dependencies: mark waiting dependencies on this task as ready
    // once this task reaches a final status (Completed / Closed).
    if (reachedFinalStatus) {
      const { data: pendingDeps } = await supabase
        .from('task_dependencies')
        .select('id, task_id')
        .eq('depends_on_task_id', id)
        .neq('status', 'ready');

      if (pendingDeps && pendingDeps.length > 0) {
        await supabase
          .from('task_dependencies')
          .update({ status: 'ready', updated_at: new Date().toISOString() })
          .eq('depends_on_task_id', id)
          .neq('status', 'ready');

        for (const dep of pendingDeps) {
          await supabase.from('task_activity').insert({
            task_id: dep.task_id,
            user_id: staffUser.id,
            action: 'dependency_ready',
            new_value: { depends_on_task_id: id },
          });
        }
      }
    }

    return NextResponse.json({
      task: {
        ...updatedTask,
        department_name: (updatedTask as any)?.department_name?.name ?? null,
      },
      success: true,
      message: 'Task updated successfully',
    });
  } catch (err: any) {
    console.error('[Task PUT] Error:', err);
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
    const supabase = getServiceClient();

    // Check if user has permission to delete (creator or admin)
    const { data: existingTask, error: fetchErr } = await supabase
      .from('tasks')
      .select('created_by, assignee_id, department_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check - only creator or super_admin can delete
    const canDelete =
      staffUser.role === 'super_admin' ||
      staffUser.id === existingTask.created_by;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Task DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'deleted',
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err: any) {
    console.error('[Task DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
