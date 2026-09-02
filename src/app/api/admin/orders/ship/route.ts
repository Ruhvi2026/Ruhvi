import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';
import { getShippingProvider } from '@/lib/shipping';
import { logOrderEvent } from '@/lib/order-events';
import { sendOrderShippedEmail } from '@/lib/brevo';
import { sendShippingUpdate } from '@/lib/whatsapp';

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

    const { orderId, provider } = await request.json();
    if (!orderId)
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        *,
        users!orders_user_id_fkey(email, full_name),
        shipping_address:addresses!orders_shipping_address_id_fkey(*),
        order_items(*)
      `
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.awb_code) {
      return NextResponse.json(
        { error: 'Shipment already exists for this order' },
        { status: 400 }
      );
    }

    // Only ship from a pre-shipment state. This closes the double-ship window:
    // once the DB write below flips the status to 'shipped', a retry of this
    // request fails here instead of creating a second courier label.
    if (!['confirmed', 'processing'].includes(order.status)) {
      return NextResponse.json(
        {
          error: `Order cannot be shipped from status '${order.status}'. Move it to Processing first.`,
        },
        { status: 400 }
      );
    }

    const shippingAddress = order.shipping_address as any;
    const userDetails = order.users as any;
    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Order has no shipping address' },
        { status: 400 }
      );
    }

    const shipProvider = await getShippingProvider(provider);
    const result = await shipProvider.createShipment({
      orderId: order.id,
      orderNumber: order.order_number,
      orderDate: order.created_at,
      address: {
        full_name: shippingAddress.full_name,
        phone: shippingAddress.phone,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        email: userDetails?.email,
      },
      items: order.order_items.map((item: any) => ({
        name: `Product ${item.product_id}`,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price_at_purchase,
      })),
      paymentMethod: order.payment_method,
      subtotal: order.subtotal,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to create shipment' },
        { status: 502 }
      );
    }

    // Update orders table. Verify the write actually applied (a 0-row update
    // means a concurrent actor changed the order) so we never report success —
    // or fire notifications — for an AWB that isn't persisted.
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        awb_code: result.awb_number,
        courier_name: result.courier_name,
        shiprocket_order_id: order.order_number,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', order.status)
      .select('id');

    if (updateError || !updatedOrder || updatedOrder.length === 0) {
      // DB write failed or a concurrent actor already moved the order. Do NOT
      // insert a shipments row, log events, or send notifications — the courier
      // label was already created, but the system state is inconsistent. Return
      // 502 so the caller can reconcile rather than falsely claim success.
      console.error(
        'Failed to persist shipment to orders table:',
        updateError || '0 rows updated'
      );
      return NextResponse.json(
        {
          error:
            'Shipment was created at the courier but could not be persisted. Please contact support.',
        },
        { status: 502 }
      );
    }

    // Record in shipments table
    await supabase.from('shipments').insert({
      order_id: order.id,
      courier_provider: result.provider || 'shiprocket',
      awb_number: result.awb_number,
      tracking_url: result.tracking_url,
      status: 'shipped',
      shipped_at: new Date().toISOString(),
    });

    // Log events
    await logOrderEvent({
      orderId: order.id,
      eventType: 'LABEL_CREATED',
      performedBy: user.id,
      portal: 'orders',
      metadata: {
        courier_name: result.courier_name,
        awb_code: result.awb_number,
        tracking_url: result.tracking_url,
      },
    });

    await logOrderEvent({
      orderId: order.id,
      eventType: 'SHIPPED',
      performedBy: user.id,
      portal: 'orders',
      metadata: {
        courier_name: result.courier_name,
        awb_code: result.awb_number,
        tracking_url: result.tracking_url,
      },
    });

    // Send email notification
    if (userDetails?.email) {
      sendOrderShippedEmail(userDetails.email, {
        order: {
          number: order.order_number,
          date: new Date(order.created_at).toLocaleDateString(),
        },
        shipping: {
          name: shippingAddress.full_name,
          address: shippingAddress.line1,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.pincode,
          country: 'India',
          phone: shippingAddress.phone,
        },
        tracking_url:
          result.tracking_url ||
          `https://shiprocket.co/tracking/${result.awb_number}`,
      }).catch((err) => console.error('Ship email failed:', err));
    }

    // Send WhatsApp tracking notification
    if (shippingAddress.phone) {
      sendShippingUpdate(
        order.order_number,
        shippingAddress.phone,
        shippingAddress.full_name,
        result.tracking_url ||
          `https://shiprocket.co/tracking/${result.awb_number}`
      ).catch((err) =>
        console.error('WhatsApp shipment notification failed:', err)
      );
    }

    return NextResponse.json({
      success: true,
      awb_code: result.awb_number,
      courier_name: result.courier_name,
      tracking_url: result.tracking_url,
    });
  } catch (error: any) {
    console.error('Shipment error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
