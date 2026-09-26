// src/app/api/internal-chat/conversations/route.ts
//
// GET  /api/internal-chat/conversations  → List conversations for current user
// POST /api/internal-chat/conversations  → Create a group conversation
//
// Security: Requires authenticated staff session (role != 'customer').
// Auth: Reads __session cookie, verifies with verifySessionToken(),
//       fetches role from public.users via service-role Supabase.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;

  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, full_name, email, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();

  if (!user || user.account_status !== 'active') return null;
  if (user.role === 'customer') return null;
  return user;
}

// GET — list all conversations the current user is a member of
export async function GET() {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Get all active conversation membership for the user
    const { data: memberships, error: membErr } = await supabase
      .from('chat_conversation_members')
      .select('conversation_id')
      .eq('user_id', staffUser.id)
      .is('left_at', null);

    if (membErr) throw membErr;
    const conversationIds = (memberships || []).map(
      (m: any) => m.conversation_id
    );

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Fetch conversations with last message and member info
    const { data: conversations, error: convErr } = await supabase
      .from('chat_conversations')
      .select(
        `
        id,
        type,
        group_name,
        group_topic,
        created_by,
        created_at,
        updated_at,
        archived_at,
        deleted_at,
        group_avatar_url,
        chat_conversation_members!inner (
          user_id,
          is_admin,
          last_read_at,
          left_at
        )
      `
      )
      .in('id', conversationIds)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (convErr) throw convErr;

    // For each conversation, fetch last message and member profiles
    const enriched = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        // Last message
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select(
            'id, text_content, message_type, sender_id, created_at, deleted_at'
          )
          .eq('conversation_id', conv.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Member profiles
        const memberUserIds = conv.chat_conversation_members
          .filter((m: any) => m.left_at === null)
          .map((m: any) => m.user_id);

        const { data: memberProfiles } = await supabase
          .from('users')
          .select('id, full_name, email, role, department')
          .in('id', memberUserIds);

        const members = conv.chat_conversation_members
          .filter((m: any) => m.left_at === null)
          .map((m: any) => ({
            ...m,
            user:
              (memberProfiles || []).find((p: any) => p.id === m.user_id) ||
              null,
          }));

        // Unread count
        const { count: unread } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', staffUser.id)
          .is('deleted_at', null)
          .not(
            'id',
            'in',
            supabase
              .from('chat_message_reads')
              .select('message_id')
              .eq('user_id', staffUser.id)
          );

        // Other user for direct chats
        let other_user = null;
        if (conv.type === 'direct') {
          const otherMember = members.find(
            (m: any) => m.user_id !== staffUser.id
          );
          other_user = otherMember?.user || null;
        }

        // Linked task (if this is a task group)
        let linked_task = null;
        if (conv.type === 'group') {
          const { data: task } = await supabase
            .from('tasks')
            .select(
              `
              id,
              task_id_text,
              title,
              status:task_statuses(name, color),
              priority:task_priorities(name, color)
            `
            )
            .eq('messenger_group_id', conv.id)
            .maybeSingle();
          linked_task = task || null;
        }

        return {
          ...conv,
          members,
          last_message: lastMsg || null,
          unread_count: unread || 0,
          other_user,
          linked_task,
        };
      })
    );

    return NextResponse.json({ conversations: enriched });
  } catch (err: any) {
    console.error('[Chat GET /conversations]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — create a group conversation
export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { group_name, group_topic, member_ids } = body;

    if (!group_name || typeof group_name !== 'string' || !group_name.trim()) {
      return NextResponse.json(
        { error: 'group_name is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json(
        { error: 'member_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Validate all member_ids are valid staff users
    const allMemberIds = [...new Set([staffUser.id, ...member_ids])];
    const { data: validUsers, error: userErr } = await supabase
      .from('users')
      .select('id, role')
      .in('id', allMemberIds)
      .neq('role', 'customer');

    if (userErr) throw userErr;
    if (!validUsers || validUsers.length !== allMemberIds.length) {
      return NextResponse.json(
        { error: 'One or more member IDs are invalid or not staff users' },
        { status: 400 }
      );
    }

    // Create the group conversation
    const { data: conv, error: convErr } = await supabase
      .from('chat_conversations')
      .insert({
        type: 'group',
        group_name: group_name.trim(),
        group_topic: group_topic?.trim() || null,
        created_by: staffUser.id,
      })
      .select()
      .single();

    if (convErr) throw convErr;

    // Add all members (creator is group admin)
    const memberRows = allMemberIds.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
      is_admin: uid === staffUser.id,
    }));

    const { error: membErr } = await supabase
      .from('chat_conversation_members')
      .insert(memberRows);

    if (membErr) throw membErr;

    // Insert system message
    await supabase.from('chat_messages').insert({
      conversation_id: conv.id,
      sender_id: staffUser.id,
      message_type: 'system',
      system_action: 'group_created',
      text_content: `${staffUser.full_name || staffUser.email} created the group "${group_name.trim()}"`,
    });

    return NextResponse.json({ conversation: conv }, { status: 201 });
  } catch (err: any) {
    console.error('[Chat POST /conversations]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
