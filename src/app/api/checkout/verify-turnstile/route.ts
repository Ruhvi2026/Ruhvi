import { NextResponse } from 'next/server';

// Basic in-memory store for rate limiting (works per lambda instance)
const rateLimitStore = {
  phones: new Map<string, number[]>(),
  ips: new Map<string, number[]>(),
};

function checkRateLimit(key: string, store: Map<string, number[]>, limit: number, windowMs: number) {
  const now = Date.now();
  const timestamps = store.get(key) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  
  if (recent.length >= limit) {
    return false;
  }
  
  recent.push(now);
  store.set(key, recent);
  return true;
}

export async function POST(req: Request) {
  try {
    const { token, phone } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is missing' }, { status: 400 });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    
    if (!secretKey) {
      console.error("Turnstile Secret Key is missing in environment variables.");
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // 1. Basic Rate Limiting Check
    if (phone) {
      // Max 3 OTP sends per phone per hour
      const isPhoneAllowed = checkRateLimit(phone, rateLimitStore.phones, 3, 60 * 60 * 1000);
      if (!isPhoneAllowed) {
        return NextResponse.json({ success: false, error: 'Too many OTP requests for this phone number. Try again later.' }, { status: 429 });
      }
    }
    
    // Max 10 OTP sends per IP per hour
    const isIpAllowed = checkRateLimit(ip, rateLimitStore.ips, 10, 60 * 60 * 1000);
    if (!isIpAllowed) {
      return NextResponse.json({ success: false, error: 'Too many requests from this IP. Try again later.' }, { status: 429 });
    }

    if (ip !== 'unknown') {
      formData.append('remoteip', ip);
    }

    const res = await fetch(verifyEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({ success: true, message: 'Turnstile verified' }, { status: 200 });
    } else {
      console.error('Turnstile verification failed:', data['error-codes']);
      return NextResponse.json({ success: false, error: 'Bot verification failed', details: data['error-codes'] }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Turnstile verify error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
