import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';
import { recordCodRefusal, getCodEligibility, resetCodEligibility } from '@/lib/orders/cod';

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

    const { action, customerId, orderId, result, notes } = await request.json();

    if (action === 'record_refusal') {
      if (!customerId || !orderId) {
        return NextResponse.json({ error: 'customerId and orderId are required' }, { status: 400 });
      }
      const outcome = await recordCodRefusal({ customerId, orderId, result, notes });
      return NextResponse.json(outcome);
    }

    if (action === 'reset') {
      if (!customerId) {
        return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
      }
      const outcome = await resetCodEligibility(customerId);
      return NextResponse.json(outcome);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('COD route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId query param is required' }, { status: 400 });
    }

    const eligibility = await getCodEligibility(customerId);
    return NextResponse.json(eligibility);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}