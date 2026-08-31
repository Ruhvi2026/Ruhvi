import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Refund engine.
//
// Idempotent, auditable refunds for prepaid / RTO / returns. Amounts are
// always computed and clamped server-side — never trusted from the browser.
// The existing wallet ledger + trigger (wallet_ledger insert -> users.wallet_balance
// update) is reused for wallet refunds. We do NOT create a second wallet system.
// ---------------------------------------------------------------------------

export interface RefundInput {
  orderId: string;
  method: 'original_payment' | 'wallet';
  amount?: number;
  reason?: string;
  performedBy?: string;
}

export interface RefundResult {
  ok: boolean;
  refunded: boolean;
  alreadyRefunded?: boolean;
  amount?: number;
  error?: string;
}

/**
 * Compute the refundable amount for a prepaid (or COD-deposit) order.
 * Server-side: prepaid => what the customer actually paid online
 * (total minus cod_balance for partial COD, or full total for prepaid).
 */
function computeRefundableAmount(order: any): number {
  const total = Number(order.total) || 0;
  if (order.payment_method === 'cod') {
    return Number(order.prepaid_amount) || 0;
  }
  return total;
}

/**
 * Execute an idempotent refund.
 *
 * Idempotency guarantees:
 * 1. Wallet refunds: guarded by a partial unique index on
 *    `wallet_ledger(order_id) WHERE type='credit'` (migration 0074).
 *    A concurrent duplicate insert hits the unique constraint and errors.
 * 2. Original-payment refunds: guarded by `payment_status = 'refunded'`
 *    check. Both paths cross-check, so an original-payment refund cannot be
 *    followed by a wallet refund for the same order (and vice versa).
 * 3. The client-supplied `amount` is clamped to the server-computed
 *    refundable amount.
 */
export async function executeRefund(
  input: RefundInput
): Promise<RefundResult> {
  const supabase = getServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, user_id, order_number, payment_method, payment_status, status, total, prepaid_amount, cod_balance')
    .eq('id', input.orderId)
    .maybeSingle();

  if (orderError) return { ok: false, refunded: false, error: orderError.message };
  if (!order) return { ok: false, refunded: false, error: 'Order not found' };

  // Server-authoritative amount: clamp client-supplied value to refundable.
  const refundable = computeRefundableAmount(order);
  const amount = input.amount && Number(input.amount) > 0
    ? Math.min(Number(input.amount), refundable)
    : refundable;

  if (amount <= 0) {
    return { ok: false, refunded: false, error: 'Nothing refundable for this order' };
  }

  // Shared idempotency guard: both paths check payment_status so the two
  // methods cannot be used to double-refund the same order.
  if (order.payment_status === 'refunded') {
    return { ok: true, refunded: true, alreadyRefunded: true, amount };
  }

  // Wallet-specific guard: the unique index on (order_id) WHERE type='credit'
  // catches any concurrent duplicate at the DB level.
  if (input.method === 'wallet') {
    const { error: ledgerError } = await supabase.from('wallet_ledger').insert({
      user_id: order.user_id,
      order_id: order.id,
      amount,
      type: 'credit',
    });
    if (ledgerError) {
      // Unique violation (23505) means a concurrent caller already credited.
      if (ledgerError.code === '23505') {
        return { ok: true, refunded: true, alreadyRefunded: true, amount };
      }
      return { ok: false, refunded: false, error: ledgerError.message };
    }
  }

  // Mark payment refunded + status refunded.
  const update: Record<string, unknown> = {
    payment_status: 'refunded',
    updated_at: new Date().toISOString(),
  };
  if (order.status !== 'refunded') {
    update.status = 'refunded';
    update.refunded_at = new Date().toISOString();
  }
  await supabase.from('orders').update(update).eq('id', order.id);

  // Audit trail
  await supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'REFUNDED',
    performed_by: input.performedBy || null,
    portal: 'orders',
    metadata: {
      refund_method: input.method,
      refund_amount: amount,
      reason: input.reason || null,
      refunded_at: new Date().toISOString(),
    },
  });

  return { ok: true, refunded: true, amount };
}