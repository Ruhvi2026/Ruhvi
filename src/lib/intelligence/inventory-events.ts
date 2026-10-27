import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  createBusinessEvent,
  validateBusinessEvent,
  type BusinessEvent,
  type BusinessEventType,
  type EventSource,
  type EventActor,
} from './event-contract';

/**
 * ============================================================================
 * INVENTORY CHANGE EVENT PIPELINE (TRACK B - PHASE 10)
 * ============================================================================
 * Authoritative stock change observation for the Shared Intelligence Layer.
 * Ensures stock mutations (restocks, manual adjustments, audit reconciliations,
 * damage shrinkages, order allocations, and mobile scan syncs) produce validated,
 * deduplicated canonical BusinessEvents.
 *
 * Guarantees:
 * 1. Zero Transactional Disruption: Authoritative stock writes remain in their
 *    existing transactional paths (e.g., PostgreSQL RPC `adjust_product_stock`).
 * 2. Deduplication & Idempotency: Uses deterministic idempotency keys based on
 *    adjustment IDs or order context to prevent double-counting.
 * 3. Mobile Scan Sync & Barcode Integrity: Preserves SKU/barcode metadata without
 *    mutating uniqueness constraints.
 * 4. PII Protection: Zero customer or staff private data leaked into event payloads.
 */

export type InventoryChangeReason =
  | 'restock'
  | 'damage'
  | 'return'
  | 'audit'
  | 'transfer'
  | 'manual'
  | 'order_allocation'
  | 'order_cancellation_restock';

export interface ObserveInventoryChangeParams {
  productId: string;
  sku?: string;
  barcode?: string;
  previousStock: number;
  adjustedBy: number;
  newStock: number;
  reason: InventoryChangeReason;
  notes?: string;
  adjustmentId?: string;
  orderId?: string;
  source?: EventSource;
  actor?: EventActor;
  idempotencyKey?: string;
}

export interface ObserveInventoryChangeResult {
  observed: boolean;
  event: BusinessEvent;
  isDuplicate: boolean;
}

/**
 * Maps inventory adjustment reasons and delta direction to canonical BusinessEventType.
 */
export function mapInventoryReasonToEventType(
  reason: InventoryChangeReason,
  adjustedBy: number
): BusinessEventType {
  switch (reason) {
    case 'restock':
    case 'return':
    case 'order_cancellation_restock':
      return 'INVENTORY_RESTOCKED';
    case 'damage':
      return 'INVENTORY_DAMAGED';
    case 'audit':
      return 'INVENTORY_AUDITED';
    case 'transfer':
      return 'INVENTORY_TRANSFERRED';
    case 'order_allocation':
      return 'INVENTORY_DEDUCTED';
    case 'manual':
    default:
      return adjustedBy < 0 ? 'INVENTORY_DEDUCTED' : 'INVENTORY_RESTOCKED';
  }
}

/**
 * Observes, normalizes, and validates an inventory mutation.
 * Idempotently produces a canonical BusinessEvent.
 */
export async function observeInventoryChange(
  params: ObserveInventoryChangeParams
): Promise<ObserveInventoryChangeResult> {
  const {
    productId,
    sku,
    barcode,
    previousStock,
    adjustedBy,
    newStock,
    reason,
    notes,
    adjustmentId,
    orderId,
    source = 'operations_portal',
    actor = { type: 'system', id: 'inventory_service' },
    idempotencyKey,
  } = params;

  const eventType = mapInventoryReasonToEventType(reason, adjustedBy);

  // Deterministic idempotency key: prioritizes existing database adjustment ID
  const deterministicKey =
    idempotencyKey ||
    (adjustmentId
      ? `idemp_inv_adj_${adjustmentId}`
      : orderId
        ? `idemp_inv_order_${orderId}_${productId}_${reason}`
        : `idemp_inv_${productId}_${reason}_${previousStock}_${newStock}_${adjustedBy}`);

  const payload: Record<string, any> = {
    productId,
    sku: sku || undefined,
    barcode: barcode || undefined,
    previousStock: Number(previousStock) || 0,
    adjustedBy: Number(adjustedBy) || 0,
    newStock: Number(newStock) || 0,
    reason,
    notes: notes || undefined,
    adjustmentId: adjustmentId || undefined,
    orderId: orderId || undefined,
    isShrinkage: reason === 'damage' || (reason === 'manual' && adjustedBy < 0),
    isScanSync: Boolean(notes && notes.toLowerCase().includes('scan sync')),
  };

  // Strip undefined values
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  const businessEvent = createBusinessEvent({
    eventType,
    source,
    idempotencyKey: deterministicKey,
    actor,
    entity: {
      type: 'product',
      id: productId,
      code: sku || barcode || productId,
    },
    payload,
  });

  return {
    observed: true,
    event: businessEvent,
    isDuplicate: false,
  };
}

/**
 * Fetches and transforms historical inventory adjustments into canonical BusinessEvents.
 */
export async function fetchInventoryEvents(
  productId: string,
  limit: number = 50
): Promise<BusinessEvent[]> {
  const supabase = getServiceClient();

  const { data: adjustments, error } = await supabase
    .from('inventory_adjustments')
    .select(
      'id, product_id, user_id, previous_stock, adjusted_by, new_stock, reason, notes, created_at'
    )
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !adjustments) {
    return [];
  }

  const events: BusinessEvent[] = [];

  for (const adj of adjustments) {
    const reason = adj.reason as InventoryChangeReason;
    const eventType = mapInventoryReasonToEventType(reason, adj.adjusted_by);

    const candidate = {
      id: `evt_inv_${adj.id}`,
      schemaVersion: 1,
      eventType,
      source: 'operations_portal' as EventSource,
      timestamp: adj.created_at,
      idempotencyKey: `idemp_inv_adj_${adj.id}`,
      actor: {
        type: adj.user_id ? ('staff' as const) : ('system' as const),
        id: adj.user_id || undefined,
      },
      entity: {
        type: 'product',
        id: adj.product_id,
      },
      payload: {
        productId: adj.product_id,
        previousStock: adj.previous_stock,
        adjustedBy: adj.adjusted_by,
        newStock: adj.new_stock,
        reason: adj.reason,
        notes: adj.notes || undefined,
        adjustmentId: adj.id,
      },
    };

    const validation = validateBusinessEvent(candidate);
    if (validation.success && validation.event) {
      events.push(validation.event);
    }
  }

  return events;
}
