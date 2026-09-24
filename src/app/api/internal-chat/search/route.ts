// src/app/api/internal-chat/search/route.ts
//
// GET /api/internal-chat/search?q=<query>&conversation_id=<optional>
//
// Full-text search across chat messages the caller has access to.
// Uses the GIN index on chat_messages.text_content.
// Returns: array of messages with conversation + sender context.

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

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const query = url.searchParams.get('q')?.trim();
    const conversationId = url.searchParams.get('conversation_id');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Get conversations the user is a member of (super_admin sees all)
    let allowedConversationIds: string[] = [];
    if (staffUser.role !== 'super_admin') {
      const { data: memberships } = await supabase
        .from('chat_conversation_members')
        .select('conversation_id')
        .eq('user_id', staffUser.id)
        .is('left_at', null);
      allowedConversationIds = (memberships || []).map(
        (m: any) => m.conversation_id
      );
      if (allowedConversationIds.length === 0)
        return NextResponse.json({ results: [] });
    }

    // Build message search query
    let msgQuery = supabase
      .from('chat_messages')
      .select(
        'id, conversation_id, sender_id, text_content, message_type, created_at'
      )
      .is('deleted_at', null)
      .neq('message_type', 'system')
      .ilike('text_content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (conversationId) {
      msgQuery = msgQuery.eq('conversation_id', conversationId);
    } else if (staffUser.role !== 'super_admin') {
      msgQuery = msgQuery.in('conversation_id', allowedConversationIds);
    }

    const { data: messages, error } = await msgQuery;
    if (error) throw error;

    // Enrich with sender + conversation name
    const enriched = await Promise.all(
      (messages || []).map(async (msg: any) => {
        const [senderRes, convRes] = await Promise.all([
          supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', msg.sender_id)
            .maybeSingle(),
          supabase
            .from('chat_conversations')
            .select('id, type, group_name')
            .eq('id', msg.conversation_id)
            .maybeSingle(),
        ]);

        // For direct chats, find the other member's name
        let convLabel = convRes.data?.group_name || 'Direct Message';
        if (convRes.data?.type === 'direct') {
          const { data: members } = await supabase
            .from('chat_conversation_members')
            .select('user_id, users(full_name, email)')
            .eq('conversation_id', msg.conversation_id)
            .neq('user_id', msg.sender_id)
            .limit(1)
            .maybeSingle();
          if (members) {
            const u = (members as any).users;
            convLabel = u?.full_name || u?.email || 'Direct Message';
          }
        }

        return {
          ...msg,
          sender: senderRes.data,
          conversation_label: convLabel,
          conversation_type: convRes.data?.type,
        };
      })
    );

    return NextResponse.json({ results: enriched });
  } catch (err: any) {
    console.error('[Chat GET /search]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
