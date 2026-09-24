// src/app/api/internal-chat/admin/conversations/route.ts
//
// GET /api/internal-chat/admin/conversations
//   → Super-admin only: list ALL conversations (paginated) with member + last message
//     Automatically records an audit log entry.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

async function getSuperAdmin() {
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
  if (!user || user.account_status !== 'active' || user.role !== 'super_admin')
    return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const admin = await getSuperAdmin();
    if (!admin)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('q')?.trim();
    const typeFilter = url.searchParams.get('type'); // 'direct' | 'group'

    const supabase = getServiceClient();

    let query = supabase
      .from('chat_conversations')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike('group_name', `%${search}%`);
    if (typeFilter) query = query.eq('type', typeFilter);

    const { data: conversations, count, error } = await query;
    if (error) throw error;

    // Enrich each conversation
    const enriched = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        const [membersRes, lastMsgRes] = await Promise.all([
          supabase
            .from('chat_conversation_members')
            .select(
              'user_id, is_admin, left_at, users(id, full_name, email, role)'
            )
            .eq('conversation_id', conv.id)
            .is('left_at', null)
            .limit(10),
          supabase
            .from('chat_messages')
            .select(
              'id, text_content, message_type, sender_id, created_at, deleted_at'
            )
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const { count: msgCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .is('deleted_at', null);

        return {
          ...conv,
          members: membersRes.data || [],
          last_message: lastMsgRes.data || null,
          message_count: msgCount || 0,
        };
      })
    );

    // Audit log
    await supabase.from('chat_admin_audit_logs').insert({
      admin_user_id: admin.id,
      action: 'viewed_all_conversations',
      metadata: {
        page,
        search: search || null,
        type_filter: typeFilter || null,
      },
    });

    return NextResponse.json({
      conversations: enriched,
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('[Chat Admin GET /conversations]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
