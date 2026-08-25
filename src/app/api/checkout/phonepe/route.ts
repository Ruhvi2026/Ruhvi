import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSiteUrl } from '@/lib/utils/url';
import { createClient as createJSClient } from '@supabase/supabase-js';
import { createOrder, OrderError } from '@/lib/orders/create-order';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,
      mobileNumber,
      userId,
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

    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    const merchantTransactionId = `MT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const siteUrl = getSiteUrl();

    // If real PhonePe keys exist, initiate standard PhonePe PG payment flow
    if (saltKey) {
      const merchantId = process.env.PHONEPE_MERCHANT_ID;
      const env = process.env.PHONEPE_ENV;

      // Fail loudly rather than silently routing live payments to the sandbox.
      if (!merchantId || !env) {
        return NextResponse.json(
          {
            error:
              'PHONEPE_MERCHANT_ID and PHONEPE_ENV must be configured when PHONEPE_SALT_KEY is set.',
          },
          { status: 500 }
        );
      }
      // 1. Pre-create the order in a pending state so the redirect return
      //    (GET /api/checkout/verify) and the callback
      //    (POST /api/webhooks/phonepe) can finalize it.
      let orderId: string | null = null;
      try {
        const created = await createOrder(
          {
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
            isPartialCod,
            prepaidAmount,
            phonepe_merchant_transaction_id: merchantTransactionId,
          },
          { status: 'pending', paymentStatus: 'pending' }
        );
        orderId = created.orderId;
      } catch (err) {
        console.error('Failed to pre-create pending order:', err);
        if (err instanceof OrderError) {
          return NextResponse.json(
            { error: err.message },
            { status: err.status }
          );
        }
        return NextResponse.json(
          { error: 'Failed to create order before payment' },
          { status: 500 }
        );
      }

      const payload = {
        merchantId,
        merchantTransactionId,
        merchantUserId: userId || `USR_${Date.now()}`,
        amount: Math.round(amount * 100), // amount in paise
        redirectUrl: `${siteUrl}/api/checkout/verify?merchantTransactionId=${merchantTransactionId}`,
        redirectMode: 'REDIRECT',
        callbackUrl: `${siteUrl}/api/webhooks/phonepe`,
        mobileNumber: mobileNumber || '9999999999',
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const apiEndpoint = '/pg/v1/pay';
      const checksumString = base64Payload + apiEndpoint + saltKey;
      const sha256 = crypto
        .createHash('sha256')
        .update(checksumString)
        .digest('hex');
      const xVerifyHeader = `${sha256}###${saltIndex}`;

      const baseUrl =
        env === 'PRODUCTION'
          ? 'https://api.phonepe.com/apis/hermes'
          : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

      const response = await fetch(`${baseUrl}${apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerifyHeader,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await response.json();

      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return NextResponse.json({
          success: true,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId,
          merchantId,
          orderId,
        });
      }

      console.error('PhonePe API Error:', data);

      // Payment could not be initiated — mark the pending order as failed
      try {
        const adminSupabase = createJSClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await adminSupabase
          .from('orders')
          .update({
            payment_status: 'failed',
            phonepe_payment_state: 'PAYMENT_INIT_FAILED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      } catch (markError) {
        console.error('Failed to mark order payment as failed:', markError);
      }

      return NextResponse.json(
        { error: 'Failed to initialize PhonePe payment' },
        { status: 502 }
      );
    }

    // Test / Fallback mode when keys are pending
    return NextResponse.json({
      success: true,
      merchantTransactionId,
      merchantId: 'PGTESTPAYUAT',
      amount: Math.round(amount * 100),
      currency: 'INR',
      isSimulated: true,
      redirectUrl: `${siteUrl}/api/checkout/verify?merchantTransactionId=${merchantTransactionId}`,
    });
  } catch (error: any) {
    console.error('PhonePe Payment API Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize PhonePe payment' },
      { status: 500 }
    );
  }
}
