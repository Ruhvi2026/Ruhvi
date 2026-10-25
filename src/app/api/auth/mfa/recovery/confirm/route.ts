import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { recoveryToken, password } = await request.json();

    if (!recoveryToken || !password) {
      return NextResponse.json(
        { error: 'Missing recovery token or account password.' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!jwtSecret || !supabaseUrl || !supabaseServiceKey || !firebaseApiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    // 1. Verify emergency recovery token
    let payload: any;
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const verified = await jwtVerify(recoveryToken, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        {
          error:
            'This recovery link has expired or is invalid. Please request a new recovery link.',
        },
        { status: 400 }
      );
    }

    if (payload.purpose !== 'mfa_emergency_recovery' || !payload.sub || !payload.email) {
      return NextResponse.json(
        { error: 'Invalid recovery token purpose.' },
        { status: 400 }
      );
    }

    const userId = payload.sub as string;
    const userEmail = payload.email as string;

    // 2. Dual-Defense: Verify the user's password with Firebase Identity Toolkit
    const verifyPasswordUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
    const fbRes = await fetch(verifyPasswordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password,
        returnSecureToken: true,
      }),
    });

    const fbData = await fbRes.json();
    if (!fbRes.ok) {
      console.warn('[MFA Recovery] Password mismatch during recovery:', fbData?.error?.message);
      return NextResponse.json(
        {
          error:
            'Incorrect account password. Please re-enter your password to authorize 2FA recovery.',
        },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Reset 2FA in user profile
    const { error: resetError } = await supabaseAdmin
      .from('users')
      .update({
        totp_enabled: false,
        totp_secret: null,
        totp_backup_codes: null,
        totp_enrolled_at: null,
      })
      .eq('id', userId);

    if (resetError) {
      console.error('[MFA Recovery Reset Error]:', resetError);
      return NextResponse.json(
        { error: 'Failed to reset 2FA in database.' },
        { status: 500 }
      );
    }

    // 4. Record audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action: 'MFA_EMERGENCY_RESET',
        entity: 'auth',
        entity_id: userId,
        details: {
          email: userEmail,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown',
        },
      });
    } catch (auditErr) {
      console.warn('[MFA Recovery] Audit log insert warning:', auditErr);
    }

    // 5. Mint official full __session cookie for immediate access
    const expiresInSeconds = 60 * 60 * 24; // 24 hours
    const now = Math.floor(Date.now() / 1000);
    const secret = new TextEncoder().encode(jwtSecret);

    const sessionToken = await new SignJWT({
      sub: userId,
      email: userEmail,
      firebase_uid: fbData.localId || null,
      mfa_verified: true,
      mfa_reset_recovery: true,
      auth_time: now,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .sign(secret);

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json(
      {
        success: true,
        message:
          'Emergency 2FA recovery authorized successfully. Please re-enroll your new authenticator device immediately.',
      },
      { status: 200 }
    );

    response.cookies.set({
      name: '__session',
      value: sessionToken,
      maxAge: expiresInSeconds,
      httpOnly: true,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
      ...(isProduction ? { domain: '.ruhvi.in' } : {}),
    });

    return response;
  } catch (error: any) {
    console.error('[MFA Recovery Confirm Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete emergency recovery.' },
      { status: 500 }
    );
  }
}
