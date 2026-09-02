import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdmin,
  verifyEmailVerificationToken,
} from '@/lib/auth/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    // 1. Verify the signed email verification token
    const payload = await verifyEmailVerificationToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          error:
            'Invalid or expired verification link. Please request a new one.',
        },
        { status: 400 }
      );
    }

    const customerId = payload.customer_id as string;
    const targetEmail = (payload.email as string).toLowerCase();
    const isEmailChange = payload.email_change === true;

    const supabase = await getSupabaseAdmin();

    // 2. Look up user
    const { data: userProfiles, error: dbError } = await supabase
      .from('users')
      .select('id, email, email_verified, phone_verified, signup_bonus_awarded')
      .eq('id', customerId)
      .limit(1);

    if (dbError) {
      console.error('[verify-email] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to look up user account.' },
        { status: 500 }
      );
    }

    const userProfile = userProfiles?.[0];
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User account not found.' },
        { status: 400 }
      );
    }

    // 3. If already verified, short-circuit
    if (userProfile.email_verified) {
      return NextResponse.json({ success: true });
    }

    // 4. If email changed, update auth user email via service role
    if (isEmailChange) {
      const currentEmail = (userProfile.email || '').toLowerCase();
      if (currentEmail !== targetEmail) {
        try {
          await supabase.auth.admin.updateUserById(customerId, {
            email: targetEmail,
            email_confirm: true,
          });
        } catch (e) {
          console.warn(
            '[verify-email] Could not update email in auth.users:',
            e
          );
        }
      }
    }

    // 5. Mark email as verified and update email in public.users
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true, email: targetEmail })
      .eq('id', customerId);

    if (updateError) {
      console.error('[verify-email] Failed to update user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verification status.' },
        { status: 500 }
      );
    }

    // 6. Award signup bonus if both email and phone are now verified
    if (!userProfile.signup_bonus_awarded) {
      const { data: freshUser } = await supabase
        .from('users')
        .select('phone_verified, signup_bonus_awarded')
        .eq('id', customerId)
        .maybeSingle();

      const phoneVerified =
        freshUser?.phone_verified === true ||
        userProfile.phone_verified === true;

      if (phoneVerified && !freshUser?.signup_bonus_awarded) {
        await supabase
          .from('users')
          .update({ signup_bonus_awarded: true })
          .eq('id', customerId);
        await supabase
          .from('wallet_ledger')
          .insert({ user_id: customerId, amount: 50.0, type: 'credit' });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Verify Email API Error]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
