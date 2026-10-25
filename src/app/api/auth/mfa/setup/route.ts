import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken } from '@/lib/auth/verify-session';
import {
  generateTotpSecret,
  generateOtpAuthUri,
  encryptTotpSecret,
} from '@/lib/auth/totp';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const decodedSession = await verifySessionToken(sessionCookie);
    if (!decodedSession || !decodedSession.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired session.' },
        { status: 401 }
      );
    }

    const userId = decodedSession.sub;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const allowedRoles = ['super_admin', 'admin', 'manager', 'staff'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: '2FA setup is restricted to internal staff and admin accounts.' },
        { status: 403 }
      );
    }

    // Generate new unverified TOTP base32 secret
    const secret = generateTotpSecret(20);
    const accountEmail = user.email || 'staff@ruhvi.in';
    const otpAuthUri = generateOtpAuthUri({
      secret,
      accountName: accountEmail,
      issuer: 'Ruhvi',
    });

    // Generate QR Code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1C1B1A',
        light: '#FFFFFF',
      },
    });

    // Encrypt secret for temporary storage in a signed JWT
    const encryptedSecret = encryptTotpSecret(secret);
    const encodedJwtSecret = new TextEncoder().encode(jwtSecret);

    // Short-lived 15-minute token holding unverified secret
    const setupToken = await new SignJWT({
      sub: user.id,
      email: accountEmail,
      temp_secret: encryptedSecret,
      purpose: 'mfa_setup',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(encodedJwtSecret);

    return NextResponse.json({
      qrCodeDataUrl,
      manualSecret: secret,
      setupToken,
      accountEmail,
    });
  } catch (error: any) {
    console.error('[MFA Setup Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize MFA setup.' },
      { status: 500 }
    );
  }
}
