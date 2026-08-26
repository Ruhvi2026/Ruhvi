import { createClient as createJSClient } from '@supabase/supabase-js';
import { OrderError } from '@/lib/orders/create-order';

export interface WalletDebitResult {
  debited: boolean;
  balanceRemaining: number;
}

export async function assertWalletBalance(
  userId: string,
  amount: number
): Promise<void> {
  if (!amount || amount <= 0) return;

  const supabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (userError || !userRow) {
    throw new OrderError('Failed to check wallet balance.', 500);
  }

  const balance = Number(userRow.wallet_balance) || 0;
  if (balance < amount) {
    throw new OrderError(
      `Insufficient wallet balance. Wallet has ₹${balance.toFixed(2)} but the order uses ₹${amount.toFixed(2)}.`,
      400
    );
  }
}

export async function debitWalletForOrder(
  userId: string,
  amount: number,
  orderId: string
): Promise<WalletDebitResult> {
  if (!amount || amount <= 0) return { debited: false, balanceRemaining: 0 };

  const supabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await supabase
    .from('wallet_ledger')
    .select('id')
    .eq('order_id', orderId)
    .eq('type', 'debit')
    .maybeSingle();

  if (existing) return { debited: false, balanceRemaining: 0 };

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (userError || !userRow) {
    throw new OrderError('Failed to check wallet balance.', 500);
  }

  const balance = Number(userRow.wallet_balance) || 0;
  if (balance < amount) {
    throw new OrderError(
      `Insufficient wallet balance. Wallet has ₹${balance.toFixed(2)} but the order uses ₹${amount.toFixed(2)}.`,
      400
    );
  }

  const { error } = await supabase.from('wallet_ledger').insert({
    user_id: userId,
    order_id: orderId,
    amount,
    type: 'debit',
  });

  if (error) {
    console.error('Failed to debit wallet:', error);
    throw new OrderError(
      'Failed to redeem wallet balance. Please try again.',
      500
    );
  }

  return { debited: true, balanceRemaining: balance - amount };
}
