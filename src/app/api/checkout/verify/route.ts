import { NextResponse } from 'next/server';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      address,
      paymentMethod,
      giftWrap,
      giftMessage,
      subtotal,
      shippingCharge,
      codCharge,
      total,
      wallet_used,
      coins_redeemed,
      coupon_discount,
      phonepe_merchant_transaction_id,
      phonepe_transaction_id,
      phonepe_payment_state,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required to place an order.' }, { status: 401 });
    }

    // Generate unique order number (e.g. RHV-2026-XXXX)
    const orderNumber = `RHV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Calculate GST amount (3% included in price for jewellery)
    const gstAmount = Math.round(subtotal * 0.03);

    // Handle Address Insertion
    let shippingAddressId = address.id;
    if (!shippingAddressId || shippingAddressId.startsWith('addr-')) {
      const { data: newAddressData, error: addressError } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          label: address.label || 'Home',
          full_name: address.full_name || address.firstName + ' ' + address.lastName,
          phone: address.phone,
          line1: address.line1 || address.address,
          line2: address.line2 || '',
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          is_default: address.is_default || false
        })
        .select('id')
        .single();
      
      if (addressError) {
        console.error('Failed to save address:', addressError);
        return NextResponse.json({ error: 'Failed to save shipping address' }, { status: 500 });
      }
      shippingAddressId = newAddressData.id;
    }

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: 'confirmed',
        subtotal,
        shipping_charge: shippingCharge,
        cod_charge: codCharge,
        coupon_discount: coupon_discount || 0,
        wallet_used: wallet_used || 0,
        coins_redeemed: coins_redeemed || 0,
        gst_amount: gstAmount,
        total,
        payment_method: paymentMethod || 'phonepe',
        payment_status: paymentMethod === 'phonepe' ? 'paid' : 'pending',
        gift_wrap: giftWrap,
        gift_message: giftMessage,
        shipping_address_id: shippingAddressId
      })
      .select('id')
      .single();

    if (orderError || !insertedOrder) {
      console.error('Failed to create order:', orderError);
      return NextResponse.json({ error: 'Failed to create order in database' }, { status: 500 });
    }

    const orderItemsToInsert = items.map((item: any) => ({
      order_id: insertedOrder.id,
      product_id: item.product?.id || item.product_id,
      sku: item.product?.sku || 'RHV-SKU',
      quantity: item.quantity,
      price_at_purchase: item.product?.price || item.price_at_add,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Failed to save order items:', itemsError);
      // We don't rollback here for simplicity, but in production we'd use a transaction
    }

    const newOrder = {
      id: insertedOrder.id,
      order_number: orderNumber,
      user_id: user.id,
      status: 'confirmed',
      subtotal,
      shipping_charge: shippingCharge,
      cod_charge: codCharge,
      coupon_discount: coupon_discount || 0,
      wallet_used: wallet_used || 0,
      coins_redeemed: coins_redeemed || 0,
      gst_amount: gstAmount,
      total,
      payment_method: paymentMethod || 'phonepe',
      payment_status: paymentMethod === 'phonepe' ? 'paid' : 'pending',
      gift_wrap: giftWrap,
      gift_message: giftMessage,
      shipping_address: address,
      created_at: new Date().toISOString(),
      order_items: orderItemsToInsert,
    };

    // Send WhatsApp Order Confirmation asynchronously
    if (address.phone) {
      sendOrderConfirmation(
        orderNumber, 
        address.phone, 
        `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Valued Customer', 
        total
      ).catch(err => console.error('Failed to send WhatsApp confirmation:', err));
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Order verification error:', error);
    return NextResponse.json({ error: 'Failed to complete order placement' }, { status: 500 });
  }
}
