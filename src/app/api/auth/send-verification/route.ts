import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/resend';
import {
  getSupabaseAdmin,
  getSiteUrl,
  signEmailVerificationToken,
} from '@/lib/auth/email-verification';

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
      .select('id, email, full_name, email_verified')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (dbError) {
      console.error('[send-verification] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to look up user account. Please try again.' },
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

    if (userProfile.email_verified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // 2. Generate a secure, time-limited email verification token (24 hours)
    const isEmailChange =
      (userProfile.email || '').toLowerCase() !== normalizedEmail;

    const token = await signEmailVerificationToken({
      customerId: userProfile.id,
      email: normalizedEmail,
      isEmailChange,
    });

    // 3. Construct custom Ruhvi verification URL
    const verifyUrl = `${getSiteUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;

    // 4. Dispatch branded verification email via Resend
    const displayName = userProfile.full_name || 'Customer';
    const emailResult = await sendVerificationEmail(
      normalizedEmail,
      verifyUrl,
      displayName
    );

    if (!emailResult) {
      console.error('[send-verification] Failed to dispatch email');
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, alreadyVerified: false });
  } catch (error: any) {
    console.error('[Send Verification API Error]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 400 }
    );
  }
}
