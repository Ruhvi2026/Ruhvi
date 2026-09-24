// src/app/api/internal-chat/conversations/[id]/messages/[msgId]/react/route.ts

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

    // Verify membership
    if (staffUser.role !== 'super_admin') {
      const { data: membership } = await supabase
        .from('chat_conversation_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', staffUser.id)
        .is('left_at', null)
        .maybeSingle();
      if (!membership)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { emoji } = await req.json();
    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('chat_message_reactions')
      .select('id')
      .eq('message_id', msgId)
      .eq('user_id', staffUser.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Toggle off (delete)
      await supabase
        .from('chat_message_reactions')
        .delete()
        .eq('id', existing.id);
      return NextResponse.json({ action: 'removed' });
    } else {
      // Toggle on (insert)
      const { data: reaction, error } = await supabase
        .from('chat_message_reactions')
        .insert({
          message_id: msgId,
          user_id: staffUser.id,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ action: 'added', reaction });
    }
  } catch (err: any) {
    console.error('[Chat POST /react]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
