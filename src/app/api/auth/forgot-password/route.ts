import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Authentication service is misconfigured.' },
        { status: 500 }
      );
    }

    // Trigger standard Firebase password reset email via Google Identity Toolkit
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const msg = data.error?.message;
      if (msg === 'EMAIL_NOT_FOUND') {
        return NextResponse.json(
          { error: 'No registered user found with this email address.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: msg || 'Failed to send password reset email.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Forgot Password API Error]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 400 }
    );
  }
}
