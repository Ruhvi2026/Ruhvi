import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { referralCode, referredUserId } = await request.json();

    if (!referralCode || !referredUserId) {
      return NextResponse.json(
        { error: 'Referral code and user id are required.' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // 1. Look up the referrer by referral code (service role bypasses RLS)
    const { data: referrer } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (!referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code.' },
        { status: 400 }
      );
    }

    if (referrer.id === referredUserId) {
      return NextResponse.json(
        { error: 'You cannot refer yourself.' },
        { status: 400 }
      );
    }

    // 2. Ensure the referred user exists
    const { data: referredUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', referredUserId)
      .maybeSingle();

    if (!referredUser) {
      return NextResponse.json(
        { error: 'Referred user not found.' },
        { status: 400 }
      );
    }

    // 3. Create the referral relationship (idempotent via unique referred_user_id)
    const { error: insertError } = await supabase.from('referrals').insert({
      referrer_user_id: referrer.id,
      referred_user_id: referredUserId,
      status: 'pending',
      coins_awarded: 0,
    });

    if (insertError) {
      // Duplicate referral (user already referred by someone) - ignore silently
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, skipped: true });
      }
      console.error('[track-referral] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record referral.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Track Referral API Error]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 400 }
    );
  }
}
