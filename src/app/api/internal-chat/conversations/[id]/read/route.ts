// src/app/api/internal-chat/conversations/[id]/read/route.ts
//
// POST /api/internal-chat/conversations/[id]/read
// Marks all unread messages in a conversation as read for the current user.
// Also updates the member's last_read_at timestamp.

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
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await context.params;
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    // Verify membership
    const { data: membership } = await supabase
      .from('chat_conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', staffUser.id)
      .is('left_at', null)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all unread messages in this conversation (not sent by self, not already read)
    const { data: unreadMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', staffUser.id)
      .is('deleted_at', null)
      .not(
        'id',
        'in',
        `(SELECT message_id FROM chat_message_reads WHERE user_id = '${staffUser.id}')`
      );

    if (unreadMessages && unreadMessages.length > 0) {
      const readRows = unreadMessages.map((m: any) => ({
        message_id: m.id,
        user_id: staffUser.id,
      }));
      // Upsert to avoid duplicates
      await supabase
        .from('chat_message_reads')
        .upsert(readRows, { onConflict: 'message_id,user_id' });
    }

    // Update last_read_at on the membership
    await supabase
      .from('chat_conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', staffUser.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Chat POST /read]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
