import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import {
  verifyTotpCode,
  decryptTotpSecret,
  verifyAndConsumeBackupCode,
} from '@/lib/auth/totp';

export async function POST(request: NextRequest) {
  try {
    const { mfaToken, code } = await request.json();

    if (!mfaToken || !code) {
      return NextResponse.json(
        { error: 'Missing challenge token or verification code.' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!jwtSecret || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    // 1. Verify the short-lived challenge token
    let payload: any;
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const verified = await jwtVerify(mfaToken, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: 'Session expired. Please log in with your email and password again.' },
        { status: 400 }
      );
    }

    if (payload.purpose !== 'mfa_pending' || !payload.sub) {
      return NextResponse.json(
        { error: 'Invalid challenge token.' },
        { status: 400 }
      );
    }

    const userId = payload.sub as string;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Fetch user MFA credentials
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, totp_secret, totp_enabled, totp_backup_codes, firebase_uid')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const cleanInput = code.trim().toUpperCase();
    let isCodeValid = false;
    let isBackupCodeUsed = false;
    let updatedBackupCodes: string[] = user.totp_backup_codes || [];

    // 3A. Check if input is a backup recovery code (e.g. contains hyphen or length 8-9)
    if (cleanInput.includes('-') || cleanInput.length >= 8) {
      const backupCheck = verifyAndConsumeBackupCode(
        cleanInput,
        user.totp_backup_codes
      );

      if (backupCheck.valid) {
        isCodeValid = true;
        isBackupCodeUsed = true;
        updatedBackupCodes = backupCheck.remainingHashedCodes;

        // Atomically consume the single-use backup code
        await supabaseAdmin
          .from('users')
          .update({ totp_backup_codes: updatedBackupCodes })
          .eq('id', userId);
      }
    }

    // 3B. Check if input is a standard 6-digit TOTP code
    if (!isCodeValid && cleanInput.replace(/\D/g, '').length === 6) {
      const decryptedSecret = decryptTotpSecret(user.totp_secret || '');
      if (decryptedSecret) {
        isCodeValid = verifyTotpCode({
          secret: decryptedSecret,
          code: cleanInput,
          windowSteps: 1, // allow +/- 30s clock drift
        });
      }
    }

    if (!isCodeValid) {
      return NextResponse.json(
        {
          error:
            'Invalid verification code. Please check your Google Authenticator app or backup code and try again.',
        },
        { status: 400 }
      );
    }

    // 4. Mint official full __session cookie with mfa_verified: true
    const expiresInSeconds = 60 * 60 * 24 * 5; // 5 days
    const now = Math.floor(Date.now() / 1000);
    const secret = new TextEncoder().encode(jwtSecret);

    const sessionToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      firebase_uid: user.firebase_uid || null,
      mfa_verified: true,
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
        isBackupCodeUsed,
        remainingBackupCodesCount: isBackupCodeUsed
          ? updatedBackupCodes.length
          : undefined,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
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
    console.error('[MFA Verify Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify MFA.' },
      { status: 500 }
    );
  }
}
