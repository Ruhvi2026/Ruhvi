import { NextResponse } from 'next/server';

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
    }

    // Generate unique order number (e.g. RHV-2026-XXXX)
    const orderNumber = `RHV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Calculate GST amount (3% included in price for jewellery)
    const gstAmount = Math.round(subtotal * 0.03);

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      user_id: 'demo-user-id',
      status: 'confirmed',
      subtotal,
      shipping_charge: shippingCharge,
      cod_charge: codCharge,
      coupon_discount: 0,
      wallet_used: 0,
      coins_redeemed: 0,
      gst_amount: gstAmount,
      total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'razorpay' ? 'paid' : 'pending',
      gift_wrap: giftWrap,
      gift_message: giftMessage,
      shipping_address: address,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      created_at: new Date().toISOString(),
      order_items: items.map((item: any) => ({
        id: `ord-item-${Math.random().toString(36).substr(2, 6)}`,
        order_id: orderId,
        product_id: item.product?.id || item.product_id,
        sku: item.product?.sku || 'RHV-SKU',
        quantity: item.quantity,
        price_at_purchase: item.product?.price || item.price_at_add,
        product: item.product,
      })),
    };

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
