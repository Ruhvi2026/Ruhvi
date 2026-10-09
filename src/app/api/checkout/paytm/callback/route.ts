import { NextRequest, NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/utils/url';
import { verifyPaytmCallbackSignature } from '@/lib/payments/paytm';
import { finalizePaytmOrder } from '@/lib/orders/finalize-paytm-order';

export async function POST(req: NextRequest) {
  const siteUrl = getSiteUrl();

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};

    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const orderId = params.ORDERID;
    const txnId = params.TXNID;
    const status = params.STATUS;
    const respMsg = params.RESPMSG;

    if (!orderId) {
      console.error('[Paytm Callback] Missing ORDERID in callback payload');
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=Missing+order+identifier`,
        303
      );
    }

    // 1. Verify Checksum Authenticity
    const isValidSignature = await verifyPaytmCallbackSignature(params);
    if (!isValidSignature) {
      console.error(
        '[Paytm Callback Security Alert] Checksum signature verification failed for order:',
        orderId
      );
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=Payment+verification+failed.+Please+contact+support.`,
        303
      );
    }

    // 2. Process Transaction Status
    if (status === 'TXN_SUCCESS') {
      const finalizeResult = await finalizePaytmOrder(orderId, {
        paytmTransactionId: txnId,
        paytmPaymentState: status,
        bankTxnId: params.BANKTXNID,
        rawResponse: params,
      });

      if (finalizeResult.status === 'paid' && finalizeResult.order) {
        return NextResponse.redirect(
          `${siteUrl}/order-success?orderId=${encodeURIComponent(finalizeResult.order.id)}`,
          303
        );
      }

      console.error(
        '[Paytm Callback] Finalization pending or error:',
        finalizeResult
      );
      return NextResponse.redirect(
        `${siteUrl}/account/orders?status=processing`,
        303
      );
    } else {
      // Transaction failed or cancelled by user
      console.warn(
        `[Paytm Callback] Payment not successful. Status: ${status}, Reason: ${respMsg}`
      );
      await finalizePaytmOrder(orderId, {
        paytmPaymentState: 'FAILED',
        rawResponse: params,
      });

      const errorMessage = encodeURIComponent(
        respMsg || 'Payment was unsuccessful or cancelled.'
      );
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=${errorMessage}`,
        303
      );
    }
  } catch (error: any) {
    console.error('[Paytm Callback Route Exception]', error);
    return NextResponse.redirect(
      `${siteUrl}/checkout?error=An+unexpected+error+occurred+during+verification`,
      303
    );
  }
}
