import { createClient as createJSClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Must match the secret baked into the `wallet_topup` Postgres RPC (migration 0017).
const INTERNAL_SECRET = 'ruhvi_wallet_secret_2026';

export interface WalletTopUpRecord {
  id: string;
  user_id: string;
  amount: number;
  bonus_amount: number;
  merchant_transaction_id: string;
  phonepe_transaction_id?: string | null;
  phonepe_payment_state?: string | null;
  status: 'pending' | 'paid' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface CreditResult {
  status: 'paid' | 'pending' | 'not_found';
  topup?: WalletTopUpRecord;
}

// Server-side bonus table — never trust the client for bonus calculation.
export function calculateTopUpBonus(amount: number): number {
  if (amount >= 10000) return 600;
  if (amount >= 5000) return 250;
  if (amount >= 2500) return 100;
  return 0;
}

export function getPhonePeConfig() {
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const merchantId = process.env.PHONEPE_MERCHANT_ID;
  const env = process.env.PHONEPE_ENV;
  const baseUrl =
    env === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  return { saltKey, saltIndex, merchantId, env, baseUrl };
}

export function generateMerchantTransactionId(): string {
  return `WT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function adminClient() {
  return createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Credits the wallet for a top-up ONLY after the gateway confirms the payment.
// Idempotent: a top-up already marked `paid` is never credited twice.
export async function creditWalletTopUp(
  merchantTransactionId: string,
  details: {
    phonepeTransactionId?: string;
    phonepePaymentState?: string;
  } = {}
): Promise<CreditResult> {
  const supabase = adminClient();

  const { data: topup, error: lookupError } = await supabase
    .from('wallet_topups')
    .select('*')
    .eq('merchant_transaction_id', merchantTransactionId)
    .maybeSingle();

  if (lookupError || !topup) {
    console.error('Wallet top-up lookup failed:', lookupError);
    return { status: 'not_found' };
  }

  if (topup.status === 'paid') {
    return { status: 'paid', topup };
  }

  const credit = await supabase.rpc('wallet_topup', {
    p_user_id: topup.user_id,
    p_amount: topup.amount,
    p_type: 'credit',
    p_secret: INTERNAL_SECRET,
  });

  if (credit.error) {
    console.error('Wallet credit failed:', credit.error);
    return { status: 'pending', topup };
  }

  if (Number(topup.bonus_amount) > 0) {
    const bonus = await supabase.rpc('wallet_topup', {
      p_user_id: topup.user_id,
      p_amount: topup.bonus_amount,
      p_type: 'cashback',
      p_secret: INTERNAL_SECRET,
    });
    if (bonus.error) {
      console.error('Wallet bonus credit failed:', bonus.error);
    }
  }

  const update: Record<string, any> = {
    status: 'paid',
    updated_at: new Date().toISOString(),
  };
  if (details.phonepeTransactionId) {
    update.phonepe_transaction_id = details.phonepeTransactionId;
  }
  if (details.phonepePaymentState) {
    update.phonepe_payment_state = details.phonepePaymentState;
  }

  await supabase.from('wallet_topups').update(update).eq('id', topup.id);

  return { status: 'paid', topup };
}

export async function markWalletTopUpFailed(
  merchantTransactionId: string,
  details: {
    phonepeTransactionId?: string;
    phonepePaymentState?: string;
  } = {}
): Promise<void> {
  const supabase = adminClient();

  const { data: topup } = await supabase
    .from('wallet_topups')
    .select('id, status')
    .eq('merchant_transaction_id', merchantTransactionId)
    .maybeSingle();

  if (!topup || topup.status === 'paid') return;

  const update: Record<string, any> = {
    status: 'failed',
    updated_at: new Date().toISOString(),
  };
  if (details.phonepeTransactionId) {
    update.phonepe_transaction_id = details.phonepeTransactionId;
  }
  if (details.phonepePaymentState) {
    update.phonepe_payment_state = details.phonepePaymentState;
  }

  await supabase.from('wallet_topups').update(update).eq('id', topup.id);
}

// Queries the PhonePe status API to confirm a wallet top-up transaction.
export async function checkWalletPhonePeStatus(merchantTransactionId: string) {
  const { merchantId, saltKey, saltIndex, env, baseUrl } = getPhonePeConfig();

  if (!merchantId || !env) {
    throw new Error(
      'PHONEPE_MERCHANT_ID and PHONEPE_ENV must be configured when PHONEPE_SALT_KEY is set.'
    );
  }

  const apiEndpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const payload = JSON.stringify({ merchantId, merchantTransactionId });
  const base64Payload = Buffer.from(payload).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64Payload + apiEndpoint + saltKey)
    .digest('hex');
  const xVerifyHeader = `${checksum}###${saltIndex}`;

  const response = await fetch(`${baseUrl}${apiEndpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerifyHeader,
    },
  });

  const data = await response.json();

  if (!data.success) {
    console.error('PhonePe wallet status API error:', data);
    return { state: 'PENDING', transactionId: '' };
  }

  const responseData =
    typeof data.data?.response === 'string'
      ? JSON.parse(Buffer.from(data.data.response, 'base64').toString('utf8'))
      : data.data;

  return {
    state: responseData?.state || 'PENDING',
    transactionId: responseData?.transactionId || '',
    amount: responseData?.amount,
  };
}

// Verifies the PhonePe webhook checksum. Fails closed when no salt key is set
// so that unverified callbacks can never credit a wallet.
export function verifyWalletWebhook(
  response: string,
  checksum: string,
  saltKey?: string,
  saltIndex = '1'
): boolean {
  if (!saltKey) {
    return false;
  }

  const expected =
    crypto
      .createHash('sha256')
      .update(response + saltKey + '/pg/v1/pay')
      .digest('hex') +
    '###' +
    saltIndex;

  let decoded = checksum;
  try {
    const buf = Buffer.from(checksum, 'base64').toString('utf8');
    if (buf && buf.includes('###')) {
      decoded = buf;
    }
  } catch {
    // checksum is not base64 — compare raw
  }

  return decoded === expected;
}
