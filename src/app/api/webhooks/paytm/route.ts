import { NextRequest, NextResponse } from 'next/server';
import {
  isPaytmConfigured,
  verifyPaytmCallbackSignature,
} from '@/lib/payments/paytm';
import { finalizePaytmOrder } from '@/lib/orders/finalize-paytm-order';

export async function POST(req: NextRequest) {
  // Fail closed if Paytm is not configured
  if (!isPaytmConfigured()) {
    return NextResponse.json(
      { error: 'Paytm webhook receiver is not configured' },
      { status: 503 }
    );
  }

  try {
    let params: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const jsonBody = await req.json();
      params = Object.fromEntries(
        Object.entries(jsonBody).map(([k, v]) => [k, String(v)])
      );
    } else {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });
    }

    const orderId = params.ORDERID;
    const txnId = params.TXNID;
    const status = params.STATUS;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing ORDERID' }, { status: 400 });
    }

    // Timing-safe / Checksum verification
    const isValid = await verifyPaytmCallbackSignature(params);
    if (!isValid) {
      console.error(
        '[Paytm Webhook] Invalid checksum signature for order:',
        orderId
      );
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (status === 'TXN_SUCCESS') {
      const result = await finalizePaytmOrder(orderId, {
        paytmTransactionId: txnId,
        paytmPaymentState: status,
        bankTxnId: params.BANKTXNID,
        rawResponse: params,
      });

      return NextResponse.json({
        success: true,
        orderStatus: result.status,
      });
    } else {
      await finalizePaytmOrder(orderId, {
        paytmPaymentState: status || 'FAILED',
        rawResponse: params,
      });

      return NextResponse.json({
        success: true,
        orderStatus: 'failed',
      });
    }
  } catch (error: any) {
    console.error('[Paytm Webhook Error]', error);
    return NextResponse.json(
      { error: 'Webhook processing error' },
      { status: 500 }
    );
  }
}
