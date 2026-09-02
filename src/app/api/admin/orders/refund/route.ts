import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';
import { executeRefund } from '@/lib/orders/refund';
import { sendRefundProcessedEmail } from '@/lib/brevo';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderId, method, amount, reason } = await request.json();
    if (!orderId)
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    if (!method || !['original_payment', 'wallet'].includes(method)) {
      return NextResponse.json(
        { error: 'method must be original_payment or wallet' },
        { status: 400 }
      );
    }

    const result = await executeRefund({
      orderId,
      method,
      amount: amount ? Number(amount) : undefined,
      reason,
      performedBy: user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send refund notification email
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, user_id')
      .eq('id', orderId)
      .maybeSingle();

    if (order) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', order.user_id)
        .maybeSingle();

      if (userProfile?.email) {
        sendRefundProcessedEmail(userProfile.email, {
          order: { number: order.order_number },
          customer: { name: userProfile.full_name || 'Valued Customer' },
          refund: {
            amount: `₹${(result.amount || 0).toLocaleString('en-IN')}`,
            method: method.replace('_', ' '),
          },
        }).catch((err: any) => console.error('Refund email failed:', err));
      }
    }

    return NextResponse.json({
      success: true,
      refunded: result.refunded,
      alreadyRefunded: result.alreadyRefunded,
      amount: result.amount,
    });
  } catch (error: any) {
    console.error('Refund route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
