import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerUser } from '@/lib/auth/server';
import { getSiteUrl } from '@/lib/utils/url';
import { createClient as createJSClient } from '@supabase/supabase-js';
import {
  calculateTopUpBonus,
  generateMerchantTransactionId,
  getPhonePeConfig,
} from '@/lib/wallet/topup';

export async function POST(req: Request) {
  try {
    // 1. Validate authentication server-side — guests can no longer top-up.
    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Please login to add money to your wallet.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { amount, paymentMethod } = body;

    const method =
      typeof paymentMethod === 'string' ? paymentMethod.toLowerCase() : 'upi';
    if (!['upi', 'card', 'netbanking'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method.' },
        { status: 400 }
      );
    }

    const topUpAmount = Math.round(Number(amount));
    if (!topUpAmount || topUpAmount < 100 || topUpAmount > 100000) {
      return NextResponse.json(
        { error: 'Top-up amount must be between ₹100 and ₹1,00,000.' },
        { status: 400 }
      );
    }

    const bonusAmount = calculateTopUpBonus(topUpAmount);
    const merchantTransactionId = generateMerchantTransactionId();
    const siteUrl = getSiteUrl();

    // 2. Persist the pending top-up so the verify route and webhook can credit
    //    the wallet only after the gateway confirms the payment.
    const supabase = createJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userRow } = await supabase
      .from('users')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();

    const { data: record, error: insertError } = await supabase
      .from('wallet_topups')
      .insert({
        user_id: user.id,
        amount: topUpAmount,
        bonus_amount: bonusAmount,
        merchant_transaction_id: merchantTransactionId,
      })
      .select('id')
      .single();

    if (insertError || !record) {
      console.error('Failed to create wallet top-up record:', insertError);
      return NextResponse.json(
        { error: 'Failed to start wallet top-up. Please try again.' },
        { status: 500 }
      );
    }

    const { saltKey, saltIndex, merchantId, env, baseUrl } = getPhonePeConfig();

    // 3. Simulated mode (no gateway keys configured) — mirrors the checkout
    //    fallback: the browser is still redirected through /api/wallet/verify
    //    so the credit happens server-side through the same verified path.
    if (!saltKey) {
      return NextResponse.json({
        success: true,
        merchantTransactionId,
        merchantId: 'PGTESTPAYUAT',
        amount: Math.round(topUpAmount * 100),
        currency: 'INR',
        isSimulated: true,
        redirectUrl: `${siteUrl}/api/wallet/verify?merchantTransactionId=${merchantTransactionId}`,
      });
    }

    if (!merchantId || !env) {
      return NextResponse.json(
        {
          error:
            'PHONEPE_MERCHANT_ID and PHONEPE_ENV must be configured when PHONEPE_SALT_KEY is set.',
        },
        { status: 500 }
      );
    }

    // 4. Real PhonePe flow — the hosted PAY_PAGE supports UPI, Cards and
    //    NetBanking, so the user's chosen method is honoured on the gateway.
    const payload = {
      merchantId,
      merchantTransactionId,
      merchantUserId: user.id,
      amount: Math.round(topUpAmount * 100), // amount in paise
      redirectUrl: `${siteUrl}/api/wallet/verify?merchantTransactionId=${merchantTransactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${siteUrl}/api/webhooks/phonepe-wallet`,
      mobileNumber: userRow?.phone || '9999999999',
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      'base64'
    );
    const apiEndpoint = '/pg/v1/pay';
    const checksumString = base64Payload + apiEndpoint + saltKey;
    const sha256 = crypto
      .createHash('sha256')
      .update(checksumString)
      .digest('hex');
    const xVerifyHeader = `${sha256}###${saltIndex}`;

    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerifyHeader,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const data = await response.json();

    if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
      return NextResponse.json({
        success: true,
        redirectUrl: data.data.instrumentResponse.redirectInfo.url,
        merchantTransactionId,
        merchantId,
      });
    }

    console.error('PhonePe wallet top-up API error:', data);

    await supabase
      .from('wallet_topups')
      .update({
        status: 'failed',
        phonepe_payment_state: 'PAYMENT_INIT_FAILED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    return NextResponse.json(
      { error: 'Failed to initialize payment. Please try again.' },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Wallet top-up API error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing wallet top-up' },
      { status: 500 }
    );
  }
}
