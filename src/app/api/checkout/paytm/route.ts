import { NextResponse } from 'next/server';
import { createOrder, OrderError } from '@/lib/orders/create-order';
import {
  initiatePaytmTransaction,
  isPaytmConfigured,
} from '@/lib/payments/paytm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,
      mobileNumber,
      userId,
      items,
      address,
      giftWrap,
      giftMessage,
      subtotal,
      shippingCharge,
      codCharge,
      total,
      wallet_used,
      coins_redeemed,
      coupon_discount,
      isPartialCod,
      prepaidAmount,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid order amount' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      );
    }

    const paytmOrderId = `RHV_PTM_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 1. Authoritative Pre-Creation of Pending Order
    let orderId: string | null = null;
    let createdOrder: any = null;

    try {
      const created = await createOrder(
        {
          items,
          address,
          paymentMethod: 'phonepe', // Backwards compatible with DB enum until migration 0110 is applied
          giftWrap,
          giftMessage,
          subtotal,
          shippingCharge,
          codCharge,
          total,
          wallet_used,
          coins_redeemed,
          coupon_discount,
          isPartialCod,
          prepaidAmount,
          phonepe_merchant_transaction_id: paytmOrderId,
        },
        { status: 'pending', paymentStatus: 'pending' }
      );
      orderId = created.orderId;
      createdOrder = created.newOrder;
    } catch (err) {
      console.error(
        '[Paytm Checkout] Failed to pre-create pending order:',
        err
      );
      if (err instanceof OrderError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'Failed to initialize order' },
        { status: 500 }
      );
    }

    // Authoritative payable amount calculated strictly on server
    const payableAmount = createdOrder?.total ?? amount;

    // 2. Initiate Transaction with Paytm Gateway
    const initResult = await initiatePaytmTransaction({
      orderId: paytmOrderId,
      amount: payableAmount,
      customerId: userId || address.phone || undefined,
      mobileNumber: address.phone || mobileNumber,
    });

    if (!initResult.success && !initResult.isSimulated) {
      return NextResponse.json(
        { error: initResult.error || 'Failed to initialize Paytm payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber: createdOrder?.order_number,
      paytmOrderId,
      txnToken: initResult.txnToken,
      gatewayUrl: initResult.gatewayUrl,
      isSimulated: initResult.isSimulated,
      isConfigured: isPaytmConfigured(),
    });
  } catch (err: any) {
    console.error('[Paytm Checkout Route Error]', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
