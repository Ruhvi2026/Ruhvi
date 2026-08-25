import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { finalizePhonePeOrder } from '@/lib/orders/finalize-phonepe-order';

function verifyPhonePeWebhook(
  response: string,
  checksum: string,
  saltKey?: string,
  saltIndex = '1'
): boolean {
  if (!saltKey) {
    // Fail closed: without PHONEPE_SALT_KEY the checksum cannot be verified.
    // Accepting unverified callbacks would let anyone mark orders as paid.
    return false;
  }

  const expected =
    crypto
      .createHash('sha256')
      .update(response + saltKey + '/pg/v1/pay')
      .digest('hex') +
    '###' +
    saltIndex;

  let decoded = checksum;
  try {
    const buf = Buffer.from(checksum, 'base64').toString('utf8');
    if (buf && buf.includes('###')) {
      decoded = buf;
    }
  } catch {
    // checksum is not base64 — compare raw
  }

  return decoded === expected;
}

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

    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

    if (!verifyPhonePeWebhook(response, checksum, saltKey, saltIndex)) {
      console.error('[PhonePe Webhook] Checksum verification failed');
      return NextResponse.json(
        { success: false, error: 'Invalid checksum' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = JSON.parse(Buffer.from(response, 'base64').toString('utf8'));
    } catch (err) {
      console.error('[PhonePe Webhook] Failed to decode response:', err);
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

    console.log(
      `[PhonePe Webhook] Transaction ${merchantTransactionId} -> state ${state} (tx: ${transactionId})`
    );

    const result = await finalizePhonePeOrder(merchantTransactionId, {
      phonepeTransactionId: transactionId,
      phonepePaymentState: state,
    });

    console.log(`[PhonePe Webhook] Finalize result: ${result.status}`);

    // Always acknowledge so PhonePe stops retrying
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[PhonePe Webhook Error]:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
