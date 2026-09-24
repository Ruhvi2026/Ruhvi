// src/app/api/internal-chat/direct/route.ts
//
// POST /api/internal-chat/direct  → Get or create a direct conversation with another staff user
//
// Uses the get_or_create_direct_conversation RPC to ensure exactly one DM per pair.

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

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { target_user_id } = body;

    if (!target_user_id || typeof target_user_id !== 'string') {
      return NextResponse.json(
        { error: 'target_user_id is required' },
        { status: 400 }
      );
    }

    if (target_user_id === staffUser.id) {
      return NextResponse.json(
        { error: 'Cannot start a conversation with yourself' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify target is a valid staff user
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, role, full_name, account_status')
      .eq('id', target_user_id)
      .neq('role', 'customer')
      .eq('account_status', 'active')
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found or not a staff member' },
        { status: 404 }
      );
    }

    // Get or create direct conversation via RPC
    const { data: conversationId, error: rpcErr } = await supabase.rpc(
      'get_or_create_direct_conversation',
      { p_user_a: staffUser.id, p_user_b: target_user_id }
    );

    if (rpcErr) throw rpcErr;

    return NextResponse.json({ conversation_id: conversationId });
  } catch (err: any) {
    console.error('[Chat POST /direct]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
