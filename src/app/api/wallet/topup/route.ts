import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// The secret key must match the one defined in the Postgres RPC
const INTERNAL_SECRET = 'ruhvi_wallet_secret_2026';

export async function POST(req: Request) {
  try {
    const { userId, amount } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    if (!amount || amount < 100 || amount > 100000) {
      return NextResponse.json({ error: 'Invalid top-up amount' }, { status: 400 });
    }

    // Server-side calculation of bonus to prevent frontend tampering
    const calculateBonus = (amt: number) => {
      if (amt >= 10000) return 600;
      if (amt >= 5000) return 250;
      if (amt >= 2500) return 100;
      return 0;
    };

    const bonusAmount = calculateBonus(amount);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Process the main top-up credit
    const { error: creditError } = await supabase.rpc('wallet_topup', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'credit',
      p_secret: INTERNAL_SECRET
    });

    if (creditError) {
      console.error('Wallet Credit Error:', creditError);
      return NextResponse.json({ error: 'Failed to process wallet top-up' }, { status: 500 });
    }

    // 2. Process the bonus cashback if applicable
    if (bonusAmount > 0) {
      const { error: bonusError } = await supabase.rpc('wallet_topup', {
        p_user_id: userId,
        p_amount: bonusAmount,
        p_type: 'cashback',
        p_secret: INTERNAL_SECRET
      });
      
      if (bonusError) {
        console.error('Wallet Bonus Error:', bonusError);
        // We don't fail the entire request if the bonus fails, but we log it
      }
    }

    return NextResponse.json({ 
      success: true, 
      amountAdded: amount,
      bonusAdded: bonusAmount,
      totalCredited: amount + bonusAmount
    });

  } catch (error: any) {
    console.error('Top-up API error:', error);
    return NextResponse.json({ error: 'Internal server error processing top-up' }, { status: 500 });
  }
}
