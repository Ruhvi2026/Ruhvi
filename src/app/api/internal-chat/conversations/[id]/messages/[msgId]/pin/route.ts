// src/app/api/internal-chat/conversations/[id]/messages/[msgId]/pin/route.ts

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
    .select('id, role, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const { id: conversationId, msgId } = await context.params;
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    // Verify membership or admin status
    let isMember = false;
    let isAdmin = false;

    if (staffUser.role === 'super_admin') {
      isMember = true;
      isAdmin = true;
    } else {
      const { data: membership } = await supabase
        .from('chat_conversation_members')
        .select('is_admin')
        .eq('conversation_id', conversationId)
        .eq('user_id', staffUser.id)
        .is('left_at', null)
        .maybeSingle();
      if (membership) {
        isMember = true;
        isAdmin = membership.is_admin;
      }
    }

    if (!isMember)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { action } = await req.json(); // 'pin' or 'unpin'
    if (action !== 'pin' && action !== 'unpin') {
      return NextResponse.json(
        { error: 'Invalid action. Must be pin or unpin.' },
        { status: 400 }
      );
    }

    if (action === 'pin' && !isAdmin) {
      return NextResponse.json(
        { error: 'Only group admins can pin messages' },
        { status: 403 }
      );
    }
    if (action === 'unpin' && !isAdmin) {
      return NextResponse.json(
        { error: 'Only group admins can unpin messages' },
        { status: 403 }
      );
    }

    const updates =
      action === 'pin'
        ? { pinned_at: new Date().toISOString(), pinned_by: staffUser.id }
        : { pinned_at: null, pinned_by: null };

    const { data: message, error } = await supabase
      .from('chat_messages')
      .update(updates)
      .eq('id', msgId)
      .eq('conversation_id', conversationId)
      .select()
      .single();

    if (error) throw error;

    // Also emit a system message so the chat sees "User pinned a message"
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_id: staffUser.id,
      message_type: 'system',
      system_action: action === 'pin' ? 'pinned_message' : 'unpinned_message',
    });

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error('[Chat POST /pin]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
