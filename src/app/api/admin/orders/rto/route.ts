import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';
import { receiveRto } from '@/lib/orders/returns';
import { transitionOrder } from '@/lib/orders/status-engine';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, orderId, notes } = await request.json();
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    let result;

    if (action === 'receive') {
      result = await receiveRto(orderId, user.id);
    } else if (action === 'initiate') {
      result = await transitionOrder({
        orderId,
        newStatus: 'rto_initiated',
        performedBy: user.id,
        notes,
      });
      if (result.ok) {
        return NextResponse.json({ success: true, status: 'rto_initiated' });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use: initiate, receive' }, { status: 400 });
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('RTO route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}