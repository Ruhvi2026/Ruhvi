import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const supabase = getServiceClient();

    // 1. Fetch the task details to ensure it exists and get its title, and to check if a group already exists.
    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select(
        'id, title, messenger_group_id, task_id_text, created_by, assignee_id'
      )
      .eq('id', taskId)
      .eq('deleted_at', null)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.messenger_group_id) {
      return NextResponse.json(
        { error: 'Task already has a messenger group' },
        { status: 400 }
      );
    }

    // 2. Fetch assignments and spectators to auto-add them
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('assigned_user_id')
      .eq('task_id', taskId);

    const { data: spectators } = await supabase
      .from('task_spectators')
      .select('spectator_id')
      .eq('task_id', taskId);

    // 3. Compile all members (creator, assignee, assignees, spectators, and the person creating the group)
    const memberIdsSet = new Set<string>();
    memberIdsSet.add(staffUser.id);
    if (task.created_by) memberIdsSet.add(task.created_by);
    if (task.assignee_id) memberIdsSet.add(task.assignee_id);
    if (assignments) {
      assignments.forEach((a: any) => memberIdsSet.add(a.assigned_user_id));
    }
    if (spectators) {
      spectators.forEach((s: any) => memberIdsSet.add(s.spectator_id));
    }

    const memberIds = Array.from(memberIdsSet);

    // Validate they are staff
    const { data: validUsers } = await supabase
      .from('users')
      .select('id')
      .in('id', memberIds)
      .neq('role', 'customer');

    const validMemberIds = validUsers?.map((u: any) => u.id) || [];

    // 4. Create the group
    const groupName = `Task: ${task.task_id_text} - ${task.title}`.substring(
      0,
      100
    );
    const { data: conv, error: convErr } = await supabase
      .from('chat_conversations')
      .insert({
        type: 'group',
        group_name: groupName,
        group_topic: `Task discussion for ${task.task_id_text}`,
        created_by: staffUser.id,
      })
      .select()
      .single();

    if (convErr) throw convErr;

    // 5. Add members
    const memberRows = validMemberIds.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
      is_admin: uid === staffUser.id || uid === task.created_by, // Creator of group or task gets admin
    }));

    const { error: membErr } = await supabase
      .from('chat_conversation_members')
      .insert(memberRows);

    if (membErr) throw membErr;

    // 6. Insert system message
    await supabase.from('chat_messages').insert({
      conversation_id: conv.id,
      sender_id: staffUser.id,
      message_type: 'system',
      system_action: 'group_created',
      text_content: `${staffUser.full_name || staffUser.email} created this group for task ${task.task_id_text}`,
    });

    // 7. Link to task
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({ messenger_group_id: conv.id })
      .eq('id', taskId);

    if (updateErr) throw updateErr;

    // 8. Add task activity
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: staffUser.id,
      activity_type: 'custom',
      content: `Created Messenger Group: ${groupName}`,
    });

    return NextResponse.json({ conversation: conv }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /tasks/:id/messenger-group]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
