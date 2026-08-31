import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';
import { approveReturn, rejectReturn, receiveReturn } from '@/lib/orders/returns';

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

    const { action, returnId, notes } = await request.json();

    if (!returnId) {
      return NextResponse.json({ error: 'returnId is required' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'approve':
        result = await approveReturn({ returnId, performedBy: user.id, notes });
        break;
      case 'reject':
        result = await rejectReturn({ returnId, performedBy: user.id, notes });
        break;
      case 'receive':
        result = await receiveReturn({ returnId, performedBy: user.id, notes });
        break;
      default:
        return NextResponse.json({ error: 'Invalid action. Use: approve, reject, receive' }, { status: 400 });
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, returnId: result.returnId });
  } catch (error: any) {
    console.error('Return route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}