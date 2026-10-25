import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import {
  verifyTotpCode,
  decryptTotpSecret,
  generateBackupCodes,
} from '@/lib/auth/totp';

export async function POST(request: NextRequest) {
  try {
    const { setupToken, code } = await request.json();

    if (!setupToken || !code) {
      return NextResponse.json(
        { error: 'Missing setup token or verification code.' },
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

    // Verify setup token integrity and expiry
    let payload: any;
    try {
      const encodedSecret = new TextEncoder().encode(jwtSecret);
      const verified = await jwtVerify(setupToken, encodedSecret);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: 'Setup session expired. Please scan the QR code again.' },
        { status: 400 }
      );
    }

    if (payload.purpose !== 'mfa_setup' || !payload.sub || !payload.temp_secret) {
      return NextResponse.json(
        { error: 'Invalid setup token purpose.' },
        { status: 400 }
      );
    }

    const userId = payload.sub as string;
    const encryptedSecret = payload.temp_secret as string;
    const decryptedSecret = decryptTotpSecret(encryptedSecret);

    if (!decryptedSecret) {
      return NextResponse.json(
        { error: 'Failed to decrypt TOTP secret.' },
        { status: 500 }
      );
    }

    // Verify the first 6-digit code entered by user
    const isValid = verifyTotpCode({
      secret: decryptedSecret,
      code,
      windowSteps: 1, // allow +/- 30s clock drift
    });

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            'Invalid 6-digit verification code. Please ensure your device clock is set to automatic and try again.',
        },
        { status: 400 }
      );
    }

    // Generate 8 single-use emergency backup recovery codes
    const { plaintextCodes, hashedCodes } = generateBackupCodes(8);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Commit MFA enablement to database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        totp_secret: encryptedSecret,
        totp_enabled: true,
        totp_backup_codes: hashedCodes,
        totp_enrolled_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[MFA Activate DB Error]:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate 2FA in user profile.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication successfully activated.',
      backupCodes: plaintextCodes,
    });
  } catch (error: any) {
    console.error('[MFA Activate Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to activate MFA.' },
      { status: 500 }
    );
  }
}
