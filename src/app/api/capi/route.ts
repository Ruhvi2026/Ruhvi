import { NextResponse } from 'next/server';

// Meta Conversions API (CAPI) endpoint handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventName, eventData, eventId, eventSourceUrl, clientIp, userAgent, fbp, fbc } = body;

    const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      // In development or if credentials are not set, silently return success 
      // so it doesn't break the client, but log it for debugging.
      console.log('CAPI tracking skipped: Missing PIXEL_ID or ACCESS_TOKEN');
      return NextResponse.json({ status: 'skipped', reason: 'Missing credentials' });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);

    const capiData = [
      {
        event_name: eventName,
        event_time: currentTimestamp,
        action_source: 'website',
        event_id: eventId,
        event_source_url: eventSourceUrl,
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          fbp,
          fbc,
          // When ready, you can add hashed email, phone etc here
          // em: [hash(userEmail)]
        },
        custom_data: eventData,
      },
    ];

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: capiData,
        // Optional test code
        // test_event_code: process.env.META_CAPI_TEST_CODE
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('CAPI Error:', result);
      return NextResponse.json({ error: result }, { status: response.status });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('CAPI Request Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
