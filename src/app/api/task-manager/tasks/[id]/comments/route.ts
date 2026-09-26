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
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    const {
      data: comments,
      error,
      count,
    } = await supabase
      .from('task_comments')
      .select('*, user:users(id, full_name, email, avatar_url)', {
        count: 'exact',
      })
      .eq('task_id', id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Comment GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: comments || [],
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      has_more: offset + limit < (count || 0),
    });
  } catch (err: any) {
    console.error('[Comment GET] Error:', err);
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
    const { content, is_progress_update } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
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
    const canComment =
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

    if (!canComment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: id,
        user_id: staffUser.id,
        content,
        is_progress_update: is_progress_update || false,
      })
      .select('*, user:users(id, full_name, email, avatar_url)')
      .single();

    if (error) {
      console.error('[Comment POST] Error:', error);
      return NextResponse.json(
        { error: 'Failed to add comment' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'comment_added',
      metadata: { comment_id: comment.id, is_progress_update },
    });

    // Notification to assignee if different from commenter
    if (task.assignee_id && task.assignee_id !== staffUser.id) {
      await supabase.from('notifications').insert({
        user_id: task.assignee_id,
        title: 'New Comment on Your Task',
        message: `"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
        category: 'TASK_COMMENT',
        reference_type: 'task',
        reference_id: id,
        actor_id: staffUser.id,
      });
    }

    return NextResponse.json({ comment, success: true });
  } catch (err: any) {
    console.error('[Comment POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
