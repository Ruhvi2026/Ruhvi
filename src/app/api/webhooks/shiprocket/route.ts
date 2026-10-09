import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Fail closed when API keys/secrets are not configured
      return NextResponse.json(
        { error: 'Shiprocket webhook is not configured.' },
        { status: 503 }
      );
    }

    // Verify Shiprocket webhook token or HMAC signature header
    const providedSignature =
      req.headers.get('x-shiprocket-signature') || req.headers.get('x-api-key');

    if (!providedSignature) {
      return NextResponse.json(
        { error: 'Missing Shiprocket signature header.' },
        { status: 401 }
      );
    }

    const rawBody = await req.text();
    // Support both direct secret token comparison and HMAC-SHA256 signature
    const expectedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isMatch =
      providedSignature === webhookSecret || providedSignature === expectedHmac;

    if (!isMatch) {
      console.warn('[Shiprocket Webhook] Invalid signature rejected');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const awb = payload.awb || payload.awb_code;
    const status = payload.current_status || 'Update';

    if (!awb) {
      return NextResponse.json({ error: 'Missing AWB code' }, { status: 400 });
    }

    console.log(
      `[Shiprocket Webhook] Received update for AWB: ${awb} - Status: ${status}`
    );

    return NextResponse.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[Shiprocket Webhook Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
