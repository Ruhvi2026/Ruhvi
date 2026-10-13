import { NextResponse } from 'next/server';

// Sliding window rate limiter per client IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 events/min per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Periodic pruning to avoid memory growth
    if (rateLimitMap.size > 2000) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetAt) rateLimitMap.delete(k);
      }
    }
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

function isValidOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Direct same-origin or keepalive fetch
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    return (
      host === 'ruhvi.in' ||
      host.endsWith('.ruhvi.in') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

// Meta Conversions API (CAPI) endpoint handler
export async function POST(req: Request) {
  try {
    // 1. Origin verification (Prevent CSRF / cross-site abuse)
    if (!isValidOrigin(req)) {
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }

    // 2. Client IP extraction from trusted headers (Prevent IP spoofing)
    const resolvedIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '127.0.0.1';

    // 3. Rate limiting check
    if (isRateLimited(resolvedIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const {
      eventName,
      eventData,
      eventId,
      eventSourceUrl,
      userAgent,
      fbp,
      fbc,
    } = body;

    // 4. Schema validation on event fields
    if (
      !eventName ||
      typeof eventName !== 'string' ||
      eventName.length > 64 ||
      !/^[a-zA-Z0-9_-]+$/.test(eventName)
    ) {
      return NextResponse.json(
        { error: 'Invalid or missing eventName' },
        { status: 400 }
      );
    }

    if (eventId && (typeof eventId !== 'string' || eventId.length > 120)) {
      return NextResponse.json(
        { error: 'Invalid eventId format' },
        { status: 400 }
      );
    }

    if (
      eventData &&
      (typeof eventData !== 'object' ||
        JSON.stringify(eventData).length > 30000)
    ) {
      return NextResponse.json(
        { error: 'Payload exceeds allowed limit' },
        { status: 400 }
      );
    }

    const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      // In development or if credentials are not set, silently return success
      // so it doesn't break the client, but log it for debugging.
      console.log('CAPI tracking skipped: Missing PIXEL_ID or ACCESS_TOKEN');
      return NextResponse.json({
        status: 'skipped',
        reason: 'Missing credentials',
      });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const resolvedUserAgent =
      (typeof userAgent === 'string' && userAgent.slice(0, 500)) ||
      req.headers.get('user-agent')?.slice(0, 500) ||
      '';

    const capiData = [
      {
        event_name: eventName,
        event_time: currentTimestamp,
        action_source: 'website',
        event_id: typeof eventId === 'string' ? eventId : undefined,
        event_source_url:
          typeof eventSourceUrl === 'string'
            ? eventSourceUrl.slice(0, 1000)
            : undefined,
        user_data: {
          client_ip_address:
            resolvedIp !== '127.0.0.1' ? resolvedIp : undefined,
          client_user_agent: resolvedUserAgent || undefined,
          fbp: typeof fbp === 'string' ? fbp.slice(0, 100) : undefined,
          fbc: typeof fbc === 'string' ? fbc.slice(0, 100) : undefined,
        },
        custom_data:
          eventData && typeof eventData === 'object' ? eventData : undefined,
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
