import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

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
    
    // Cloudflare recommends passing the remoteip if available for better abuse protection
    const ip = req.headers.get('x-forwarded-for');
    if (ip) {
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
