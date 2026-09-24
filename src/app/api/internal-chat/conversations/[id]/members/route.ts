// src/app/api/internal-chat/conversations/[id]/members/route.ts
//
// POST   /api/internal-chat/conversations/[id]/members   → Add members to a group
// DELETE /api/internal-chat/conversations/[id]/members   → Remove a member (or self-leave)
//
// Security: Only the group creator or a group admin can add/remove others.
//           Any member can remove themselves (leave).

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
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

async function assertGroupAdmin(
  supabase: any,
  conversationId: string,
  userId: string,
  role: string
) {
  if (role === 'super_admin') return true;
  const { data: conv } = await supabase
    .from('chat_conversations')
    .select('created_by, type')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv || conv.type !== 'group') return false;
  if (conv.created_by === userId) return true;
  const { data: membership } = await supabase
    .from('chat_conversation_members')
    .select('is_admin')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  return membership?.is_admin === true;
}

// POST — add members
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await context.params;
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    const isAdmin = await assertGroupAdmin(
      supabase,
      conversationId,
      staffUser.id,
      staffUser.role
    );
    if (!isAdmin)
      return NextResponse.json(
        { error: 'Only group admins can add members' },
        { status: 403 }
      );

    const body = await req.json();
    const { user_ids } = body;
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'user_ids array is required' },
        { status: 400 }
      );
    }

    // Validate all are staff
    const { data: validUsers } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', user_ids)
      .neq('role', 'customer');

    if (!validUsers || validUsers.length !== user_ids.length) {
      return NextResponse.json(
        { error: 'One or more user_ids are invalid or non-staff' },
        { status: 400 }
      );
    }

    // Upsert members (re-add anyone who previously left)
    for (const uid of user_ids) {
      const { data: existing } = await supabase
        .from('chat_conversation_members')
        .select('id, left_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', uid)
        .maybeSingle();

      if (existing && existing.left_at !== null) {
        // Re-add
        await supabase
          .from('chat_conversation_members')
          .update({ left_at: null, joined_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else if (!existing) {
        await supabase
          .from('chat_conversation_members')
          .insert({
            conversation_id: conversationId,
            user_id: uid,
            is_admin: false,
          });
      }
      // already active — skip

      // System message
      const added = validUsers.find((u: any) => u.id === uid);
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: staffUser.id,
        message_type: 'system',
        system_action: 'member_added',
        text_content: `${staffUser.full_name || staffUser.email} added ${added?.full_name || uid}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Chat POST /members]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE — remove member or self-leave
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await context.params;
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    const body = await req.json();
    const { user_id } = body; // the user to remove

    if (!user_id)
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );

    const isSelf = user_id === staffUser.id;
    if (!isSelf) {
      // Must be group admin to remove others
      const isAdmin = await assertGroupAdmin(
        supabase,
        conversationId,
        staffUser.id,
        staffUser.role
      );
      if (!isAdmin)
        return NextResponse.json(
          { error: 'Only group admins can remove members' },
          { status: 403 }
        );
    }

    // Soft-remove by setting left_at
    await supabase
      .from('chat_conversation_members')
      .update({ left_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user_id);

    // Get removed user's name for system message
    const { data: removedUser } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user_id)
      .maybeSingle();

    const removedName = removedUser?.full_name || removedUser?.email || user_id;
    const action = isSelf ? 'member_left' : 'member_removed';
    const text = isSelf
      ? `${removedName} left the group`
      : `${staffUser.full_name || staffUser.email} removed ${removedName}`;

    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_id: staffUser.id,
      message_type: 'system',
      system_action: action,
      text_content: text,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Chat DELETE /members]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
