import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { sendPasswordResetEmail } from '@/lib/resend';

// Initialize service-role Supabase client
const getSupabaseAdmin = async () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (jwtSecret) {
      const secretKey = new TextEncoder().encode(jwtSecret);
      supabaseServiceKey = await new SignJWT({
        iss: 'supabase',
        ref: 'igrkrkxdantrolbldapj',
        role: 'service_role',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('10y')
        .sign(secretKey);
    } else {
      console.error(
        '[forgot-password] CRITICAL: Both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET are missing on server.'
      );
    }
  }

  return createClient(supabaseUrl, supabaseServiceKey || 'dummy_key', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = await getSupabaseAdmin();

    // 1. Verify user profile exists in Supabase
    const { data: userProfiles, error: dbError } = await supabase
      .from('users')
      .select('id, firebase_uid, email, full_name')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (dbError) {
      console.error('[forgot-password] Database error:', dbError);
      return NextResponse.json(
        {
          error: 'Failed to look up user account. Please try again.',
          details: dbError.message,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasJwtSecret: !!process.env.SUPABASE_JWT_SECRET,
        },
        { status: 500 }
      );
    }

    const userProfile =
      userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;

    if (!userProfile) {
      return NextResponse.json(
        { error: 'No registered user found with this email address.' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('[forgot-password] SUPABASE_JWT_SECRET is missing');
      return NextResponse.json(
        { error: 'Authentication service is misconfigured.' },
        { status: 500 }
      );
    }

    // 2. Generate a secure, time-limited password reset token (1 hour)
    const secretKey = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);

    const resetToken = await new SignJWT({
      email: normalizedEmail,
      uid: userProfile.firebase_uid,
      type: 'password_reset',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userProfile.firebase_uid)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600) // 1 hour validity
      .sign(secretKey);

    // 3. Construct custom Ruhvi reset URL
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://ruhvi.vercel.app';
    const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // 4. Dispatch branded email via Resend
    const displayName = userProfile.full_name || 'Customer';
    const emailResult = await sendPasswordResetEmail(
      normalizedEmail,
      resetUrl,
      displayName
    );

    if (!emailResult) {
      console.error('[forgot-password] Failed to dispatch Resend email');
      return NextResponse.json(
        {
          error: 'Failed to send password reset email. Please try again later.',
        },
        { status: 500 }
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
