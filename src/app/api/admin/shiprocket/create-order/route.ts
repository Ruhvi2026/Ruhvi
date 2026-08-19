import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server';
import { createCustomOrder, generateAWB } from '@/lib/shiprocket';
import { sendOrderShippedEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verify user is logged in
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is admin, manager, or staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    // 3. Fetch full order details
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
        { error: 'Shipment already generated for this order' },
        { status: 400 }
      );
    }

    const shippingAddress = order.shipping_address as any;
    const userDetails = order.users as any;

    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Order is missing a shipping address' },
        { status: 400 }
      );
    }

    // 4. Construct Shiprocket Payload
    // Defaulting dimensions for fine jewellery (small box)
    const orderItems = order.order_items.map((item: any) => ({
      name: `Product ${item.product_id}`,
      sku: item.sku || item.product_id,
      units: item.quantity,
      selling_price: item.price_at_purchase,
      discount: 0,
      tax: 0,
      hsn: 71131930, // Default HSN for gold/diamond jewellery
    }));

    const shiprocketPayload = {
      order_id: order.order_number,
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      pickup_location: 'Primary', // Requires a setup pickup location in Shiprocket dashboard
      billing_customer_name:
        shippingAddress.full_name || userDetails?.full_name || 'Customer',
      billing_last_name: '',
      billing_address: shippingAddress.line1,
      billing_address_2: shippingAddress.line2 || '',
      billing_city: shippingAddress.city,
      billing_pincode: shippingAddress.pincode,
      billing_state: shippingAddress.state,
      billing_country: shippingAddress.country || 'India',
      billing_email: userDetails?.email || 'customer@example.com',
      billing_phone: shippingAddress.phone || '9999999999',
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.subtotal,
      length: 15,
      breadth: 15,
      height: 10,
      weight: 0.5,
    };

    // 5. Call Shiprocket API to Create Order
    const srOrder = await createCustomOrder(shiprocketPayload);

    if (!srOrder || !srOrder.shipment_id) {
      throw new Error('Invalid response from Shiprocket create order');
    }

    // 6. Generate AWB
    const awbResult = await generateAWB(srOrder.shipment_id);

    const awbData = awbResult?.response?.data;
    if (!awbData || !awbData.awb_code) {
      throw new Error('Failed to extract AWB code from Shiprocket response');
    }

    // 7. Update Database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        shiprocket_order_id: srOrder.order_id.toString(),
        shiprocket_shipment_id: srOrder.shipment_id.toString(),
        awb_code: awbData.awb_code,
        courier_name: awbData.courier_name,
        status: 'shipped',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 8. Send transactional email
    if (userDetails?.email) {
      const emailData = {
        order: {
          number: order.order_number,
          date: new Date(order.created_at).toLocaleDateString(),
        },
        shipping: {
          name: shiprocketPayload.billing_customer_name,
          address: shiprocketPayload.billing_address,
          city: shiprocketPayload.billing_city,
          state: shiprocketPayload.billing_state,
          postal_code: shiprocketPayload.billing_pincode,
          country: shiprocketPayload.billing_country,
          phone: shiprocketPayload.billing_phone,
        },
        tracking_url: `https://shiprocket.co/tracking/${awbData.awb_code}`,
      };

      try {
        await sendOrderShippedEmail(userDetails.email, emailData);
      } catch (emailErr) {
        console.error('Failed to send shipping email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      awb_code: awbData.awb_code,
      courier_name: awbData.courier_name,
    });
  } catch (error: any) {
    console.error('Shiprocket integration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
