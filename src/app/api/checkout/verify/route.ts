import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { sendOrderConfirmationEmail } from '@/lib/resend';
import { createClient as createJSClient } from '@supabase/supabase-js';
import { createOrder, OrderError } from '@/lib/orders/create-order';
import { finalizePhonePeOrder } from '@/lib/orders/finalize-phonepe-order';
import { getSiteUrl } from '@/lib/utils/url';

const FAILED_STATES = [
  'FAILED',
  'REJECTED',
  'TIMED_OUT',
  'PAYMENT_ERROR',
  'PAYMENT_FAILED',
  'CANCELLED',
];

// ---------------------------------------------------------------------------
// POST — finalize an order placed directly by the client
// (COD, simulated PhonePe, or wallet-only checkout).
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, address } = body;

    const { user, orderNumber, gstAmount, newOrder } = await createOrder(body);
    const total = newOrder.total;

    // Send WhatsApp Order Confirmation asynchronously
    if (address.phone) {
      sendOrderConfirmation(
        orderNumber,
        address.phone,
        `${address.firstName || ''} ${address.lastName || ''}`.trim() ||
          'Valued Customer',
        total
      ).catch((err) =>
        console.error('Failed to send WhatsApp confirmation:', err)
      );
    }

    // Send Resend Email Order Confirmation asynchronously
    if (user?.email) {
      const emailData = {
        order: {
          number: orderNumber,
          date: new Date().toLocaleDateString(),
          items: items.map((item: any) => ({
            product: {
              name: item.product?.title || item.product?.name || 'Product',
              image:
                item.product?.images?.[0] || 'https://ruhvi.in/placeholder.png',
              variant: item.product?.variant || '',
              quantity: item.quantity,
              unit_price: `₹${(item.product?.price || item.price_at_add).toLocaleString('en-IN')}`,
              total_price: `₹${((item.product?.price || item.price_at_add) * item.quantity).toLocaleString('en-IN')}`,
            },
          })),
        },
        subtotal: `₹${subtotalText(body.subtotal)}`,
        discount: `₹${(body.coupon_discount || 0).toLocaleString('en-IN')}`,
        shipping_cost: `₹${(body.shippingCharge || 0).toLocaleString('en-IN')}`,
        tax: `₹${(gstAmount || 0).toLocaleString('en-IN')}`,
        total: `₹${total.toLocaleString('en-IN')}`,
        shipping: {
          name:
            `${address.firstName || ''} ${address.lastName || ''}`.trim() ||
            'Valued Customer',
          address: address.address_line1 || '',
          city: address.city || '',
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country || 'India',
          phone: address.phone || '',
        },
        payment: {
          method:
            body.paymentMethod === 'cod'
              ? 'Cash on Delivery'
              : 'Online Payment (PhonePe)',
          status: body.paymentMethod === 'cod' ? 'Pending (COD)' : 'Paid',
          transaction_id: orderNumber, // fallback
        },
        order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'}/orders`,
        support_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'}/contact`,
      };

      sendOrderConfirmationEmail(user.email, emailData).catch((err) =>
        console.error('Failed to send Email confirmation:', err)
      );
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderNumber,
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Order verification error:', error);
    if (error instanceof OrderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to complete order placement' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET — browser return redirect from the PhonePe gateway
// (redirectUrl configured in /api/checkout/phonepe). Confirms payment
// against the PhonePe status API, finalizes the pending order and forwards
// the customer to the success or checkout page.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const merchantTransactionId = searchParams.get('merchantTransactionId');
  const isSimulated = searchParams.get('isSimulated') === 'true';
  const siteUrl = getSiteUrl();

  if (!merchantTransactionId) {
    return renderRedirectPage(`${siteUrl}/checkout?payment=pending`);
  }

  const successPage = (orderId: string) =>
    renderRedirectPage(`${siteUrl}/order-success/${orderId}`, {
      clearCart: true,
    });

  const supabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('*')
    .eq('phonepe_merchant_transaction_id', merchantTransactionId)
    .maybeSingle();

  if (lookupError) {
    console.error('Failed to look up order on PhonePe return:', lookupError);
    return renderRedirectPage(`${siteUrl}/checkout?payment=pending`);
  }

  if (!order) {
    console.log(
      'PhonePe return for unknown transaction:',
      merchantTransactionId
    );
    return renderRedirectPage(`${siteUrl}/checkout?payment=pending`);
  }

  // Simulated mode (no real PhonePe keys configured) — mark the order paid
  if (isSimulated) {
    const result = await finalizePhonePeOrder(merchantTransactionId, {
      phonepeTransactionId: `T_SIM_${Date.now()}`,
      phonepePaymentState: 'COMPLETED',
    });
    if (result.status === 'paid') {
      return successPage(order.id);
    }
    return renderRedirectPage(`${siteUrl}/checkout?payment=pending`);
  }

  const saltKey = process.env.PHONEPE_SALT_KEY;

  // Real keys configured — verify the transaction with the PhonePe status API
  if (saltKey) {
    try {
      const status = await checkPhonePeStatus(merchantTransactionId);

      if (status.state === 'COMPLETED' || status.state === 'SUCCESS') {
        await finalizePhonePeOrder(merchantTransactionId, {
          phonepeTransactionId: status.transactionId,
          phonepePaymentState: status.state,
        });
        return successPage(order.id);
      }

      if (FAILED_STATES.includes(status.state)) {
        await finalizePhonePeOrder(merchantTransactionId, {
          phonepeTransactionId: status.transactionId,
          phonepePaymentState: status.state,
        });
        return renderRedirectPage(`${siteUrl}/checkout?payment=failed`);
      }

      // PENDING — the webhook may have finalized the order already; re-check
      const { data: fresh } = await supabase
        .from('orders')
        .select('id, payment_status')
        .eq('phonepe_merchant_transaction_id', merchantTransactionId)
        .maybeSingle();
      if (fresh?.payment_status === 'paid') {
        return successPage(fresh.id);
      }
      return renderRedirectPage(`${siteUrl}/checkout?payment=pending`);
    } catch (err) {
      console.error('PhonePe status check failed:', err);
      // Fall through to DB state so a completed webhook still lands correctly
    }
  }

  // No keys or status check failed — rely on the order state in the DB
  if (order.payment_status === 'paid') {
    return successPage(order.id);
  }
  if (order.payment_status === 'failed') {
    return renderRedirectPage(`${siteUrl}/checkout?payment=failed`);
  }
  return renderRedirectPage(`${siteUrl}/checkout?payment=pending`);
}

async function checkPhonePeStatus(merchantTransactionId: string) {
  const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
  const saltKey = process.env.PHONEPE_SALT_KEY!;
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const env = process.env.PHONEPE_ENV || 'UAT';

  const baseUrl =
    env === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

  const apiEndpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const payload = JSON.stringify({ merchantId, merchantTransactionId });
  const base64Payload = Buffer.from(payload).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64Payload + apiEndpoint + saltKey)
    .digest('hex');
  const xVerifyHeader = `${checksum}###${saltIndex}`;

  const response = await fetch(`${baseUrl}${apiEndpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerifyHeader,
    },
  });

  const data = await response.json();

  if (!data.success) {
    console.error('PhonePe status API error:', data);
    return { state: 'PENDING', transactionId: '' };
  }

  // The status response embeds the payment object either directly in
  // `data` or as a base64-encoded `data.response`.
  const responseData =
    typeof data.data?.response === 'string'
      ? JSON.parse(Buffer.from(data.data.response, 'base64').toString('utf8'))
      : data.data;

  return {
    state: responseData?.state || 'PENDING',
    transactionId: responseData?.transactionId || '',
    amount: responseData?.amount,
  };
}

function subtotalText(value: any): string {
  return (Number(value) || 0).toLocaleString('en-IN');
}

function renderRedirectPage(
  targetUrl: string,
  options?: { clearCart?: boolean }
) {
  const safeUrl = targetUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const cartClearScript = options?.clearCart
    ? "try { localStorage.removeItem('ruhvi_cart_v1'); } catch (e) {}"
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=${safeUrl}" />
  <title>Redirecting...</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #faf6ed; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1c1b1a; }
    .box { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e8dfc6; border-top-color: #c29831; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Finalizing your payment...</p>
    <noscript><a href="${safeUrl}">Click here to continue</a></noscript>
  </div>
  <script>${cartClearScript}
  window.location.replace("${safeUrl}");</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
