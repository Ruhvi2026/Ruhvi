import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { sendPasswordResetEmail } from '@/lib/resend';

// Initialize service-role Supabase client
const getSupabaseAdmin = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';
  return createClient(supabaseUrl, supabaseServiceKey, {
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
    const supabase = getSupabaseAdmin();

    // 1. Verify user profile exists in Supabase
    const { data: userProfile, error: dbError } = await supabase
      .from('users')
      .select('id, firebase_uid, email, full_name')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (dbError) {
      console.error('[forgot-password] Supabase query error:', dbError);
      return NextResponse.json(
        { error: 'Failed to look up user account. Please try again.' },
        { status: 500 }
      );
    }

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
