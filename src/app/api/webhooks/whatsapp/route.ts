import { NextResponse } from 'next/server';

// This token must match the one you configure in the Meta App Dashboard
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'ruhvi_whatsapp_secure_token';

// GET request is used by Meta to verify the webhook endpoint
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
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
    const body = await req.json();

    // Check if it's a WhatsApp status update or message
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            // A customer sent a message
            for (const message of change.value.messages) {
              const from = message.from; // Phone number of customer
              const text = message.text?.body;
              console.log(`[WhatsApp Inbound] Message from ${from}: ${text}`);
              
              // Here you can integrate with your Customer Support Chat,
              // save to database, or trigger an auto-reply.
            }
          } else if (change.value && change.value.statuses) {
            // A message status update (sent, delivered, read)
            for (const status of change.value.statuses) {
              console.log(`[WhatsApp Status] Message ${status.id} is now ${status.status}`);
            }
          }
        }
      }
    }

    // Always return a 200 OK to Meta, otherwise they will keep retrying
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Still return 200 to prevent retries if it's a processing error on our end
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
