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

    const { data: checklists, error } = await supabase
      .from('task_checklists')
      .select(
        '*, completed_by_user:users!task_checklists_completed_by_fkey(id, full_name, email)'
      )
      .eq('task_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[Checklists GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch checklists' },
        { status: 500 }
      );
    }

    return NextResponse.json({ checklists: checklists || [], success: true });
  } catch (err: any) {
    console.error('[Checklists GET] Error:', err);
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
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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

    // Verify access - creator, assignee, manager, or admin can add checklists
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

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from('task_checklists')
      .select('sort_order')
      .eq('task_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxOrder?.sort_order || 0) + 1;

    // Create checklist item
    const { data: checklist, error } = await supabase
      .from('task_checklists')
      .insert({
        task_id: id,
        title,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('[Checklists POST] Error:', error);
      return NextResponse.json(
        { error: 'Failed to add checklist item' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'checklist_added',
      new_value: { checklist_id: checklist.id, title },
    });

    return NextResponse.json({ checklist, success: true });
  } catch (err: any) {
    console.error('[Checklists POST] Error:', err);
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
    const { searchParams } = new URL(req.url);
    const checklistId = searchParams.get('checklist_id');
    const body = await req.json();

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Checklist ID is required' },
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

    // Verify access - creator, assignee, manager, or admin can update
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

    // Get existing checklist
    const { data: existing } = await supabase
      .from('task_checklists')
      .select('*')
      .eq('id', checklistId)
      .eq('task_id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.completed !== undefined) {
      updates.completed = body.completed;
      if (body.completed) {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = staffUser.id;
      } else {
        updates.completed_at = null;
        updates.completed_by = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from('task_checklists')
      .update(updates)
      .eq('id', checklistId)
      .eq('task_id', id)
      .select(
        '*, completed_by_user:users!task_checklists_completed_by_fkey(id, full_name, email)'
      )
      .single();

    if (error) {
      console.error('[Checklists PUT] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update checklist' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: body.completed
        ? 'checklist_completed'
        : body.completed === false
          ? 'checklist_reopened'
          : 'checklist_updated',
      old_value: existing,
      new_value: updates,
    });

    return NextResponse.json({ checklist: updated, success: true });
  } catch (err: any) {
    console.error('[Checklists PUT] Error:', err);
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
    const checklistId = searchParams.get('checklist_id');

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Checklist ID is required' },
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

    const { error } = await supabase
      .from('task_checklists')
      .delete()
      .eq('id', checklistId)
      .eq('task_id', id);

    if (error) {
      console.error('[Checklists DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to delete checklist' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'checklist_removed',
      old_value: { checklist_id: checklistId },
    });

    return NextResponse.json({ success: true, message: 'Checklist deleted' });
  } catch (err: any) {
    console.error('[Checklists DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;
