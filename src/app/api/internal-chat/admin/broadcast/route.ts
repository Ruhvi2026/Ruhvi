import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

async function getAdminUser() {
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
  if (!['super_admin', 'admin'].includes(user.role)) return null;
  return user;
}

// POST /api/internal-chat/admin/broadcast
export async function POST(req: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden. Only Admins can send broadcasts.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, message, priority = 'normal', allow_replies = false } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required.' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Call send_staff_broadcast RPC
    const { data: msgId, error } = await supabase.rpc('send_staff_broadcast', {
      p_sender_id: admin.id,
      p_title: title || '',
      p_message: message.trim(),
      p_priority: priority,
      p_allow_replies: Boolean(allow_replies),
    });

    if (error) {
      console.error('send_staff_broadcast error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message_id: msgId,
      conversation_id: 'b0000000-0000-0000-0000-000000000001',
    });
  } catch (err: any) {
    console.error('Broadcast route error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
