import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import {
  generateTotpSecret,
  encryptTotpSecret,
  generateOtpAuthUri,
} from '@/lib/auth/totp';
import QRCode from 'qrcode';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
);

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!projectId || !jwtSecret || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    // 1. Verify Firebase ID token
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    const uid = payload.sub;
    const email = (payload.email as string) || null;

    if (!uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Query user profile and MFA status
    let user: {
      id: string;
      email: string | null;
      role: string;
      totp_enabled: boolean | null;
    } | null = null;

    // A. Match by email (case-insensitive) if provided
    if (email) {
      const { data: uByEmail } = await supabaseAdmin
        .from('users')
        .select('id, email, role, totp_enabled')
        .ilike('email', email.trim())
        .maybeSingle();

      if (uByEmail) {
        user = uByEmail;
      }
    }

    // B. Match by firebase_uid via customer_identities if not resolved yet
    if (!user && uid) {
      const { data: identity } = await supabaseAdmin
        .from('customer_identities')
        .select('customer_id')
        .eq('firebase_uid', uid)
        .maybeSingle();

      if (identity?.customer_id) {
        const { data: uByIdentity } = await supabaseAdmin
          .from('users')
          .select('id, email, role, totp_enabled')
          .eq('id', identity.customer_id)
          .maybeSingle();

        if (uByIdentity) {
          user = uByIdentity;
        }
      }
    }

    // C. Match by UUID directly if uid is a valid UUID
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        uid
      );
    if (!user && isUuid) {
      const { data: uById } = await supabaseAdmin
        .from('users')
        .select('id, email, role, totp_enabled')
        .eq('id', uid)
        .maybeSingle();

      if (uById) {
        user = uById;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in system.' },
        { status: 404 }
      );
    }

    // 3. Check if user is staff/admin
    const allowedRoles = ['super_admin', 'admin', 'manager', 'staff'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied. You do not have admin privileges.' },
        { status: 403 }
      );
    }

    // 4. If 2FA is enabled, issue a 5-minute mfa_pending challenge token
    if (user.totp_enabled) {
      const secret = new TextEncoder().encode(jwtSecret);
      const mfaToken = await new SignJWT({
        sub: user.id,
        email: user.email,
        role: user.role,
        purpose: 'mfa_pending',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(secret);

      return NextResponse.json({
        mfaRequired: true,
        enrollmentRequired: false,
        mfaToken,
        email: user.email,
      });
    }

    // 5. If 2FA is not yet enabled, ENFORCE MANDATORY FIRST-TIME 2FA SETUP
    const unverifiedSecret = generateTotpSecret(20);
    const encryptedSecret = encryptTotpSecret(unverifiedSecret);
    const accountEmail = user.email || 'staff@ruhvi.in';
    const otpAuthUri = generateOtpAuthUri({
      secret: unverifiedSecret,
      accountName: accountEmail,
      issuer: 'Ruhvi',
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const encodedJwtSecret = new TextEncoder().encode(jwtSecret);
    const setupToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
      temp_secret: encryptedSecret,
      purpose: 'mfa_setup',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(encodedJwtSecret);

    return NextResponse.json({
      mfaRequired: true,
      enrollmentRequired: true,
      setupToken,
      qrCodeDataUrl,
      manualSecret: unverifiedSecret,
      accountEmail,
    });
  } catch (error: any) {
    console.error('[MFA Challenge Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process authentication challenge.' },
      { status: 500 }
    );
  }
}
