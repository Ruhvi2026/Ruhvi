import { getServiceClient } from '@/lib/supabase/service';
import { transitionOrder } from './status-engine';

// ---------------------------------------------------------------------------
// Returns & RTO engine.
//
// Customer return flow: request -> approve/reject -> receive (warehouse) ->
// stock-in -> refund
// RTO flow: delivery_failed -> rto_initiated -> rto_received -> refund
//
// Existing `returns` table is reused for customer returns. RTO is tracked via
// the order status engine + `rto_records` table (from operations dashboard).
//
// Stock-in on warehouse receipt is idempotent: one inventory_movements row per
// (order_id, variant_id, movement_type='return').
// ---------------------------------------------------------------------------

export interface ReturnActionInput {
  returnId: string;
  performedBy?: string;
  notes?: string;
}

export interface ReturnRequestInput {
  orderId: string;
  orderItemId: string;
  reason: string;
  userId: string;
}

export interface ReturnResult {
  ok: boolean;
  returnId?: string;
  error?: string;
}

/** Approve a return request (staff action). */
export async function approveReturn(input: ReturnActionInput): Promise<ReturnResult> {
  const supabase = getServiceClient();

  const { data: ret } = await supabase
    .from('returns')
    .select('id, order_id, status')
    .eq('id', input.returnId)
    .maybeSingle();
  if (!ret) return { ok: false, error: 'Return not found' };
  if (ret.status !== 'requested') return { ok: false, error: `Cannot approve return in status: ${ret.status}` };

  const { error } = await supabase
    .from('returns')
    .update({ status: 'approved' })
    .eq('id', ret.id);
  if (error) return { ok: false, error: error.message };

  await transitionOrder({
    orderId: ret.order_id,
    newStatus: 'return_approved',
    performedBy: input.performedBy,
    notes: input.notes,
    metadata: { return_id: ret.id },
  });

  return { ok: true, returnId: ret.id };
}

/** Reject a return request. */
export async function rejectReturn(input: ReturnActionInput): Promise<ReturnResult> {
  const supabase = getServiceClient();

  const { data: ret } = await supabase
    .from('returns')
    .select('id, order_id, status')
    .eq('id', input.returnId)
    .maybeSingle();
  if (!ret) return { ok: false, error: 'Return not found' };

  const { error } = await supabase
    .from('returns')
    .update({ status: 'rejected', resolved_at: new Date().toISOString() })
    .eq('id', ret.id);
  if (error) return { ok: false, error: error.message };

  await transitionOrder({
    orderId: ret.order_id,
    newStatus: 'return_rejected',
    performedBy: input.performedBy,
    notes: input.notes,
    metadata: { return_id: ret.id },
  });

  return { ok: true, returnId: ret.id };
}

/**
 * Mark a return as received at the warehouse. This is the step that increases
 * inventory — and it is idempotent.
 */
export async function receiveReturn(input: ReturnActionInput): Promise<ReturnResult> {
  const supabase = getServiceClient();

  const { data: ret } = await supabase
    .from('returns')
    .select('id, order_id, status')
    .eq('id', input.returnId)
    .maybeSingle();
  if (!ret) return { ok: false, error: 'Return not found' };
  if (ret.status !== 'approved') return { ok: false, error: `Return must be approved before receipt, current: ${ret.status}` };

  // Fetch order items to know which variants to stock-in.
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, variant_id, sku, quantity')
    .eq('order_id', ret.order_id);

  if (!orderItems || orderItems.length === 0) {
    return { ok: false, error: 'No order items found to return' };
  }

  // Idempotent stock-in: one row per (order, variant) with movement_type
  // 'return'. The partial unique index on (order_id, variant_id) WHERE
  // movement_type='return' makes concurrent receipts atomic — a duplicate
  // insert hits the constraint (23505) and is skipped. Stock is only
  // incremented when the movement row is actually created.
  let stockRestored = 0;
  let skipped = 0;
  for (const item of orderItems) {
    if (!item.variant_id) continue;

    const { error: movementError } = await supabase.from('inventory_movements').insert({
      variant_id: item.variant_id,
      movement_type: 'return',
      quantity: item.quantity,
      reason: `Return received — order #${ret.order_id}`,
      reference_order_id: ret.order_id,
      order_id: ret.order_id,
      created_by: input.performedBy ? input.performedBy : undefined,
    });
    if (movementError) {
      if (movementError.code === '23505') {
        // Concurrent receipt already logged this variant — skip.
        skipped++;
        continue;
      }
      console.error(`Failed to log stock-in for variant ${item.variant_id}:`, movementError);
      continue;
    }

    // Update product_variants.stock_quantity (only after the movement logged).
    const { error: stockError } = await supabase.rpc('increment_variant_stock', {
      p_variant_id: item.variant_id,
      p_quantity: item.quantity,
    });
    if (!stockError) {
      stockRestored++;
    } else {
      console.error(`Failed to increment stock for variant ${item.variant_id}:`, stockError);
    }
  }

  // Never mark the return completed unless at least one variant was actually
  // stocked back in. Prevents an order reading 'returned' with zero stock
  // restored (e.g. legacy order_items with NULL variant_id).
  if (stockRestored === 0) {
    return {
      ok: false,
      error: skipped > 0
        ? 'Return already received for all variants'
        : 'No stock was restored (items missing variant data). Contact operations.',
    };
  }

  // Mark return as completed.
  await supabase
    .from('returns')
    .update({ status: 'completed', resolved_at: new Date().toISOString() })
    .eq('id', ret.id);

  await transitionOrder({
    orderId: ret.order_id,
    newStatus: 'returned',
    performedBy: input.performedBy,
    notes: input.notes,
    metadata: { return_id: ret.id, stock_restored: stockRestored },
  });

  return { ok: true, returnId: ret.id };
}

/** RTO received at warehouse. Idempotent: checks order status first. */
export async function receiveRto(
  orderId: string,
  performedBy?: string
): Promise<ReturnResult> {
  const supabase = getServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: 'Order not found' };

  if (order.status === 'rto_received') {
    return { ok: true, error: 'Already received' };
  }

  await transitionOrder({
    orderId,
    newStatus: 'rto_received',
    performedBy,
    metadata: { source: 'warehouse_receipt' },
  });

  // Log to rto_records if not already present.
  const { data: existingRto } = await supabase
    .from('rto_records')
    .select('id')
    .eq('order_reference', orderId)
    .maybeSingle();
  if (!existingRto) {
    await supabase.from('rto_records').insert({
      product_id: null,
      variant_id: null,
      order_reference: orderId,
      reason: 'RTO received at warehouse',
      recorded_by: performedBy ? performedBy : undefined,
    });
  }

  return { ok: true };
}