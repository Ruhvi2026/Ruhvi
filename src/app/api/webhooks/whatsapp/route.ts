import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET request is used by Meta to verify the webhook endpoint
export async function GET(req: Request) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json(
      { error: 'WhatsApp webhook verification token is not configured.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp Webhook verified successfully!');
    // Meta requires the challenge to be returned as plain text
    return new NextResponse(challenge, { status: 200 });
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

// POST request is used to receive messages and status updates
export async function POST(req: Request) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      // Fail closed when API keys are not configured
      return NextResponse.json(
        { error: 'WhatsApp integration is not configured.' },
        { status: 503 }
      );
    }

    // Verify Meta X-Hub-Signature-256 HMAC header
    const signatureHeader = req.headers.get('x-hub-signature-256');
    if (!signatureHeader) {
      return NextResponse.json(
        { error: 'Missing webhook signature header.' },
        { status: 401 }
      );
    }

    const rawBody = await req.text();
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    const sigBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      console.warn('[WhatsApp Webhook] Invalid signature rejected');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    // Check if it's a WhatsApp status update or message
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              const from = message.from;
              const text = message.text?.body;
              console.log(`[WhatsApp Inbound] Message from ${from}: ${text}`);
            }
          } else if (change.value && change.value.statuses) {
            for (const status of change.value.statuses) {
              console.log(
                `[WhatsApp Status] Message ${status.id} is now ${status.status}`
              );
            }
          }
        }
      }
    }

    // Always return a 200 OK to Meta
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
