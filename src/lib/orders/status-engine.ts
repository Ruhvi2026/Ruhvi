import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Order status engine — authoritative server-side transition validator.
//
// The existing DB trigger (log_order_status_change) already writes an
// order_events row whenever orders.status changes; this engine is the
// server-side authority that (a) validates transitions, (b) keeps lifecycle
// timestamps consistent, and (c) is idempotent so retries cannot double-log
// or create duplicate downstream actions.
//
// Compatibility: existing code paths that UPDATE orders.status directly
// (e.g. checkout finalize, admin/orders/status) keep working unchanged — the
// DB trigger still records their events. New dashboard actions go through this
// engine.
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'rto_initiated'
  | 'rto_received'
  | 'cancelled'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'returned'
  | 'refunded';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'delivery_failed',
  'rto_initiated',
  'rto_received',
  'cancelled',
  'return_requested',
  'return_approved',
  'return_rejected',
  'returned',
  'refunded',
];

// Allowed transitions. Keep this map as the single source of truth.
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivery_failed'],
  out_for_delivery: ['delivered', 'delivery_failed'],
  delivery_failed: ['out_for_delivery', 'rto_initiated', 'delivered'],
  delivered: ['return_requested'],
  rto_initiated: ['rto_received'],
  rto_received: ['refunded'],
  cancelled: [],
  return_requested: ['return_approved', 'return_rejected'],
  return_approved: ['returned'],
  return_rejected: ['delivered'],
  returned: ['refunded'],
  refunded: [],
};

// Lifecycle timestamps maintained by the engine per status.
const STATUS_TIMESTAMP_FIELD: Partial<Record<OrderStatus, string>> = {
  confirmed: 'confirmed_at',
  processing: 'processing_at',
  shipped: 'shipped_at',
  out_for_delivery: 'out_for_delivery_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
  returned: 'returned_at',
  rto_received: 'rto_received_at',
};

export interface TransitionOrderInput {
  orderId: string;
  newStatus: OrderStatus;
  performedBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  ok: boolean;
  status: OrderStatus;
  alreadyInState?: boolean;
  error?: string;
}

/**
 * Transition an order to a new status with server-side validation.
 * Idempotent: if the order is already in `newStatus`, it is a no-op success.
 */
export async function transitionOrder(
  input: TransitionOrderInput
): Promise<TransitionResult> {
  const supabase = getServiceClient();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, payment_method, payment_status')
    .eq('id', input.orderId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, status: input.newStatus, error: fetchError.message };
  }
  if (!order) {
    return { ok: false, status: input.newStatus, error: 'Order not found' };
  }

  // Idempotency: already in the target state is a successful no-op.
  if (order.status === input.newStatus) {
    return { ok: true, status: order.status, alreadyInState: true };
  }

  // Server-side transition validation — the DB-level safety net is that this
  // engine is the only non-system writer that uses arbitrary transitions.
  const allowed = ORDER_TRANSITIONS[order.status as OrderStatus] || [];
  if (!allowed.includes(input.newStatus)) {
    return {
      ok: false,
      status: order.status,
      error: `Invalid transition: ${order.status} -> ${input.newStatus}`,
    };
  }

  const update: Record<string, unknown> = {
    status: input.newStatus,
    updated_at: new Date().toISOString(),
  };
  const tsField = STATUS_TIMESTAMP_FIELD[input.newStatus];
  if (tsField) {
    update[tsField] = new Date().toISOString();
  }

  // Atomic-ish update: only transition if the row is still in the previous
  // status (prevents two staff concurrently racing to different targets).
  // Selecting the id lets us detect a 0-row update (a concurrent actor already
  // moved the order) instead of reporting a false success.
  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update(update)
    .eq('id', order.id)
    .eq('status', order.status)
    .select('id');

  if (updateError) {
    return { ok: false, status: order.status, error: updateError.message };
  }
  if (!updatedRows || updatedRows.length === 0) {
    // The order was concurrently moved by another actor — do not fabricate an
    // audit event for a transition that never applied.
    return {
      ok: false,
      status: order.status,
      error: `Concurrent status change detected — order is no longer in '${order.status}'. Reload and retry.`,
    };
  }

  // Explicit event with metadata (portal=orders) — complements the DB trigger's
  // system-portal event without touching existing trigger behaviour. Guarded
  // against retries so a repeated call cannot double-log the same transition.
  if (input.metadata || input.notes) {
    const { data: alreadyLogged } = await supabase
      .from('order_events')
      .select('id')
      .eq('order_id', order.id)
      .eq('event_type', STATUS_TO_EVENT[input.newStatus] || 'ORDER_CONFIRMED')
      .eq('portal', 'orders')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!alreadyLogged) {
      await supabase.from('order_events').insert({
        order_id: order.id,
        event_type: STATUS_TO_EVENT[input.newStatus] || 'ORDER_CONFIRMED',
        performed_by: input.performedBy || null,
        portal: 'orders',
        metadata: {
          ...(input.notes ? { notes: input.notes } : {}),
          ...(input.metadata || {}),
          from_status: order.status,
        },
      });
    }
  }

  return { ok: true, status: input.newStatus };
}

// Map internal statuses to the existing order_event_type enum values.
const STATUS_TO_EVENT: Record<OrderStatus, string> = {
  pending: 'ORDER_CREATED',
  confirmed: 'ORDER_CONFIRMED',
  processing: 'PROCESSING',
  shipped: 'SHIPPED',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  delivery_failed: 'DELIVERY_FAILED',
  rto_initiated: 'RTO_INITIATED',
  rto_received: 'RTO_RECEIVED',
  cancelled: 'CANCELLED',
  return_requested: 'RETURN_REQUESTED',
  return_approved: 'RETURN_APPROVED',
  return_rejected: 'RETURN_REJECTED',
  returned: 'RETURN_PICKED',
  refunded: 'REFUNDED',
};
