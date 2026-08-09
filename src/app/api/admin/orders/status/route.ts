import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendShippingUpdateEmail } from '@/lib/resend';
import { getServerUser } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is logged in
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an admin or staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderId, newStatus, trackingLink } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'orderId and newStatus are required' },
        { status: 400 }
      );
    }

    // Update the database
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
          address: (orderDetails.shipping_address as any)?.address_line1 || '',
          city: (orderDetails.shipping_address as any)?.city || '',
          state: (orderDetails.shipping_address as any)?.state || '',
          postal_code:
            (orderDetails.shipping_address as any)?.postal_code || '',
          country: (orderDetails.shipping_address as any)?.country || 'India',
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
        } = await import('@/lib/resend');

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
