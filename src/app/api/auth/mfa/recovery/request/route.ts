import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { sendMfaEmergencyRecoveryEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!jwtSecret || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Lookup user in public.users
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, totp_enabled')
      .ilike('email', cleanEmail)
      .maybeSingle();

    const allowedRoles = ['super_admin', 'admin', 'manager', 'staff'];

    // Master recovery recipient is strictly locked to subhasdas1996@gmail.com
    const LOCKED_MASTER_RECOVERY_EMAIL = 'subhasdas1996@gmail.com';

    // Only dispatch if user is active staff and actually has 2FA enabled
    if (!userError && user && allowedRoles.includes(user.role) && user.totp_enabled) {
      const secret = new TextEncoder().encode(jwtSecret);
      const recoveryToken = await new SignJWT({
        sub: user.id,
        email: user.email,
        purpose: 'mfa_emergency_recovery',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret);

      // Determine portal host URL from request
      const host = request.headers.get('host') || 'admin.ruhvi.in';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const recoveryLink = `${protocol}://${host}/login?recoveryToken=${recoveryToken}`;

      // Dispatch directly to the locked recovery inbox
      await sendMfaEmergencyRecoveryEmail({
        email: LOCKED_MASTER_RECOVERY_EMAIL,
        name: user.full_name || 'Super Admin',
        recoveryLink,
      });
    }

    // Generic response — completely conceals the destination email address
    return NextResponse.json({
      success: true,
      message:
        'An emergency recovery link has been dispatched to your secure emergency inbox.',
    });
  } catch (error: any) {
    console.error('[MFA Recovery Request Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process recovery request.' },
      { status: 500 }
    );
  }
}
