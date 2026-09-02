import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    // Verify user is logged in
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an admin, manager, or staff
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

    const { orderId, newStatus, trackingLink } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'orderId and newStatus are required' },
        { status: 400 }
      );
    }

    const VALID_STATUSES = [
      'pending',
      'confirmed',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned',
    ];
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid order status: ${newStatus}` },
        { status: 400 }
      );
    }

    // Update the database
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingOrder) {
      return NextResponse.json(
        { error: `Order not found: ${orderId}` },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Fetch order details for the email templates
    const { data: orderDetails } = await supabase
      .from('orders')
      .select(
        `
        order_number,
        created_at,
        users!orders_user_id_fkey(email, full_name),
        shipping_address:addresses!orders_shipping_address_id_fkey(*)
      `
      )
      .eq('id', orderId)
      .single();

    if (orderDetails && (orderDetails.users as any)?.email) {
      const email = (orderDetails.users as any).email;
      const name =
        (orderDetails.shipping_address as any)?.full_name ||
        (orderDetails.users as any)?.full_name ||
        'Valued Customer';

      const emailData = {
        order: {
          number: orderDetails.order_number,
          date: new Date(orderDetails.created_at).toLocaleDateString(),
        },
        shipping: {
          name: name,
          address: (orderDetails.shipping_address as any)?.line1 || '',
          city: (orderDetails.shipping_address as any)?.city || '',
          state: (orderDetails.shipping_address as any)?.state || '',
          postal_code: (orderDetails.shipping_address as any)?.pincode || '',
          country: 'India',
          phone: (orderDetails.shipping_address as any)?.phone || '',
        },
        tracking_url: trackingLink || '#',
      };

      try {
        const {
          sendOrderShippedEmail,
          sendOrderOutForDeliveryEmail,
          sendOrderDeliveredEmail,
          sendOrderCancelledEmail,
        } = await import('@/lib/brevo');

        switch (newStatus) {
          case 'shipped':
            await sendOrderShippedEmail(email, emailData);
            break;
          case 'out_for_delivery':
            await sendOrderOutForDeliveryEmail(email, emailData);
            break;
          case 'delivered':
            await sendOrderDeliveredEmail(email, emailData);
            break;
          case 'cancelled':
            await sendOrderCancelledEmail(email, emailData);
            break;
        }
      } catch (err) {
        console.error(`Failed to send ${newStatus} email:`, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
