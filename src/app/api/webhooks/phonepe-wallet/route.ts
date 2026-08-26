import { NextResponse } from 'next/server';
import {
  PAYED_STATES,
  FAILED_STATES,
} from '@/lib/orders/finalize-phonepe-order';
import {
  creditWalletTopUp,
  markWalletTopUpFailed,
  verifyWalletWebhook,
  getPhonePeConfig,
} from '@/lib/wallet/topup';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { response, checksum } = body || {};

    if (!response || !checksum) {
      return NextResponse.json(
        { success: false, error: 'Missing response or checksum' },
        { status: 400 }
      );
    }

    const { saltKey, saltIndex } = getPhonePeConfig();

    if (!verifyWalletWebhook(response, checksum, saltKey, saltIndex)) {
      console.error('[Wallet Webhook] Checksum verification failed');
      return NextResponse.json(
        { success: false, error: 'Invalid checksum' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = JSON.parse(Buffer.from(response, 'base64').toString('utf8'));
    } catch (err) {
      console.error('[Wallet Webhook] Failed to decode response:', err);
      return NextResponse.json(
        { success: false, error: 'Invalid response payload' },
        { status: 400 }
      );
    }

    const merchantTransactionId = decoded.merchantTransactionId;
    const transactionId = decoded.transactionId;
    const state = decoded.state || decoded.code || 'PENDING';

    if (!merchantTransactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing merchantTransactionId' },
        { status: 400 }
      );
    }

    const normalizedState = String(state).toUpperCase();

    if (PAYED_STATES.includes(normalizedState)) {
      const result = await creditWalletTopUp(merchantTransactionId, {
        phonepeTransactionId: transactionId,
        phonepePaymentState: state,
      });
      console.log(
        `[Wallet Webhook] Top-up ${merchantTransactionId} credited: ${result.status}`
      );
    } else if (FAILED_STATES.includes(normalizedState)) {
      await markWalletTopUpFailed(merchantTransactionId, {
        phonepeTransactionId: transactionId,
        phonepePaymentState: state,
      });
      console.log(
        `[Wallet Webhook] Top-up ${merchantTransactionId} marked failed`
      );
    }

    // Always acknowledge so PhonePe stops retrying
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Wallet Webhook Error]:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
