import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';

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

    const { orderId, addressId, newAddress } = await request.json();
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    // Fetch current order to check status — address changes only before shipment.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, shipping_address_id, order_number, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const shippedStatuses = ['shipped', 'out_for_delivery', 'delivered', 'delivery_failed', 'rto_initiated', 'rto_received'];
    if (shippedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'Address cannot be changed after shipment. Contact support for exceptions.' },
        { status: 400 }
      );
    }

        // The pre-change shipping_address_id (order.shipping_address_id) is captured
    // below in the audit_log insert. Staff can only change addresses pre-shipment
    // (enforced above), and every change is audited.

    if (addressId) {
      // Switch to an existing address.
      await supabase.from('orders').update({ shipping_address_id: addressId, updated_at: new Date().toISOString() }).eq('id', orderId);
    } else if (newAddress) {
      // Create a new address and link it.
      const { data: created } = await supabase
        .from('addresses')
        .insert({
          user_id: order.user_id || user.id,
          full_name: newAddress.full_name,
          phone: newAddress.phone,
          line1: newAddress.line1,
          line2: newAddress.line2 || '',
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          label: newAddress.label || 'Work',
          is_default: false,
        })
        .select('id')
        .single();

      if (created) {
        await supabase.from('orders').update({ shipping_address_id: created.id, updated_at: new Date().toISOString() }).eq('id', orderId);
      }
    } else {
      return NextResponse.json({ error: 'Provide addressId or newAddress' }, { status: 400 });
    }

    // Audit log.
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ADDRESS_CHANGED',
      entity: 'orders',
      entity_id: orderId,
      details: {
        order_number: order.order_number,
        old_shipping_address_id: order.shipping_address_id,
        new_shipping_address_id: addressId || null,
        reason: 'Staff-initiated address change',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Address change error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}