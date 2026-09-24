// src/app/api/internal-chat/conversations/[id]/messages/route.ts
//
// GET  /api/internal-chat/conversations/[id]/messages  → Paginated message history
// POST /api/internal-chat/conversations/[id]/messages  → Send a new message
//
// Security: Caller must be an active staff member AND a member of the conversation.

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

async function assertMembership(
  supabase: any,
  conversationId: string,
  userId: string
) {
  const { data } = await supabase
    .from('chat_conversation_members')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  return !!data;
}

// GET — paginated message history (newest first, client reverses for display)
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await context.params;
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    // Check membership (super_admin bypasses)
    if (staffUser.role !== 'super_admin') {
      const isMember = await assertMembership(
        supabase,
        conversationId,
        staffUser.id
      );
      if (!isMember)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(_req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      100
    );
    const before = url.searchParams.get('before'); // cursor: created_at ISO string

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // Enrich with sender profiles, attachments, mentions, entity refs
    const enriched = await Promise.all(
      (messages || []).map(async (msg: any) => {
        const [senderRes, attachRes, mentionRes, entityRes, reactionRes] =
          await Promise.all([
            supabase
              .from('users')
              .select('id, full_name, email, role, department')
              .eq('id', msg.sender_id)
              .maybeSingle(),
            supabase
              .from('chat_attachments')
              .select('*')
              .eq('message_id', msg.id),
            supabase
              .from('chat_message_mentions')
              .select('*, user:users(id, full_name, email)')
              .eq('message_id', msg.id),
            supabase
              .from('chat_entity_references')
              .select('*')
              .eq('message_id', msg.id),
            supabase
              .from('chat_message_reactions')
              .select('*, user:users(id, full_name, email)')
              .eq('message_id', msg.id),
          ]);

        return {
          ...msg,
          sender: senderRes.data || null,
          attachments: attachRes.data || [],
          mentions: mentionRes.data || [],
          entity_refs: entityRes.data || [],
          reactions: reactionRes.data || [],
        };
      })
    );

    return NextResponse.json({ messages: enriched });
  } catch (err: any) {
    console.error('[Chat GET /messages]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — send a message
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

    // Must be member
    const isMember = await assertMembership(
      supabase,
      conversationId,
      staffUser.id
    );
    if (!isMember)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const {
      message_type = 'text',
      text_content,
      reply_to_id,
      attachments,
      mentions, // array of user_ids
      entity_refs, // array of { entity_type, entity_id, display_label }
    } = body;

    // Validate
    if (message_type === 'text' && (!text_content || !text_content.trim())) {
      return NextResponse.json(
        { error: 'text_content is required for text messages' },
        { status: 400 }
      );
    }
    if (
      message_type === 'attachment' &&
      (!attachments || !Array.isArray(attachments) || attachments.length === 0)
    ) {
      return NextResponse.json(
        { error: 'attachments are required for attachment messages' },
        { status: 400 }
      );
    }

    // Insert message
    const { data: message, error: msgErr } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: staffUser.id,
        message_type,
        text_content: text_content?.trim() || null,
        reply_to_id: reply_to_id || null,
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // Insert attachments
    if (attachments && attachments.length > 0) {
      const attachRows = attachments.map((a: any) => ({
        message_id: message.id,
        cloudinary_public_id: a.cloudinary_public_id,
        cloudinary_url: a.cloudinary_url,
        resource_type: a.resource_type || 'image',
        file_name: a.file_name,
        mime_type: a.mime_type || null,
        file_size: a.file_size || null,
        width: a.width || null,
        height: a.height || null,
        duration: a.duration || null,
      }));
      await supabase.from('chat_attachments').insert(attachRows);
    }

    // Insert mentions
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      const mentionRows = mentions.map((uid: string) => ({
        message_id: message.id,
        mentioned_user_id: uid,
      }));
      await supabase
        .from('chat_message_mentions')
        .insert(mentionRows)
        .throwOnError();

      // Insert notifications for mentioned users
      const notifRows = mentions.map((uid: string) => ({
        user_id: uid,
        title: 'You were mentioned in a message',
        message: text_content
          ? `${staffUser.full_name || staffUser.email}: ${text_content.slice(0, 80)}`
          : 'You were mentioned in a chat message',
        category: 'CHAT',
        reference_type: 'chat_message',
        reference_id: message.id,
        actor_id: staffUser.id,
        idempotency_key: `chat_mention_${message.id}_${uid}`,
      }));
      await supabase.from('notifications').insert(notifRows).throwOnError();
    }

    // Insert entity refs
    if (entity_refs && Array.isArray(entity_refs) && entity_refs.length > 0) {
      const refRows = entity_refs.map((ref: any) => ({
        message_id: message.id,
        entity_type: ref.entity_type,
        entity_id: ref.entity_id,
        display_label: ref.display_label || null,
      }));
      await supabase.from('chat_entity_references').insert(refRows);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    console.error('[Chat POST /messages]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
