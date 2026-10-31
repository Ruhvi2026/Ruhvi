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
import { recordFailedEvent } from './event-failure-recovery';
import type { OrderStatus } from '@/lib/orders/status-engine';

/**
 * ============================================================================
 * ORDER LIFECYCLE EVENT PIPELINE (TRACK B - PHASE 08)
 * ============================================================================
 * Provides authoritative observation and normalization of order lifecycle
 * business events for the Shared Intelligence Layer.
 *
 * Grounding & Safety Guarantees:
 * 1. Derives exclusively from Supabase PostgreSQL (public.orders & public.order_events).
 * 2. Idempotent: Replayed callbacks or retried updates produce identical keys and
 *    prevent duplicate downstream event emissions.
 * 3. Schema Validated: Enforces Phase 07 canonical BusinessEvent contract.
 * 4. Zero PII Leak: Strips customer address/phone from event payloads.
 */

// 1. Status to Canonical Event Mapping
export const ORDER_STATUS_TO_EVENT: Record<OrderStatus, BusinessEventType> = {
  pending: 'ORDER_CREATED',
  confirmed: 'ORDER_CONFIRMED',
  processing: 'PACKING_STARTED',
  shipped: 'SHIPPED',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  delivery_failed: 'RTO_INITIATED',
  rto_initiated: 'RTO_INITIATED',
  rto_received: 'RTO_RECEIVED',
  cancelled: 'CANCELLED',
  return_requested: 'RETURN_REQUESTED',
  return_approved: 'RETURN_APPROVED',
  return_rejected: 'DELIVERED', // Reverted back to delivered state
  returned: 'RETURN_PICKED',
  refunded: 'REFUND_INITIATED',
};

export interface ObserveOrderTransitionParams {
  orderId: string;
  orderNumber?: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  actor: EventActor;
  source?: EventSource;
  metadata?: Record<string, any>;
  notes?: string;
  idempotencyNonce?: string; // Optional custom nonce; otherwise deterministic
}

export interface ObserveOrderLifecycleResult {
  observed: boolean;
  event: BusinessEvent;
  isDuplicate: boolean;
  persistedToEventLog: boolean;
  error?: string;
}

/**
 * Normalizes and observes an authoritative order transition.
 * Uses deterministic idempotency keys (`idemp_order_{orderId}_{toStatus}`)
 * to prevent double-counting across repeated webhooks or network retries.
 */
export async function observeOrderLifecycleTransition(
  params: ObserveOrderTransitionParams
): Promise<ObserveOrderLifecycleResult> {
  const {
    orderId,
    orderNumber,
    fromStatus,
    toStatus,
    actor,
    source = 'orders_portal',
    metadata = {},
    notes,
    idempotencyNonce,
  } = params;

  const eventType = ORDER_STATUS_TO_EVENT[toStatus] || 'ORDER_CONFIRMED';
  const deterministicKey =
    idempotencyNonce || `idemp_order_${orderId}_${toStatus}`;

  // Sanitize payload: strip any accidental PII (customer phone, address, credit cards)
  const sanitizedPayload: Record<string, any> = {
    fromStatus: fromStatus || null,
    toStatus,
    notes: notes || undefined,
    courierName: metadata.courier_name || metadata.courierName,
    awbCode: metadata.awb_code || metadata.awbCode,
    rtoReason: metadata.rto_reason || metadata.rtoReason,
    cancelReason: metadata.cancellation_reason || metadata.cancelReason,
    itemCount: metadata.itemCount,
    total: metadata.total,
  };

  // Remove undefined properties
  Object.keys(sanitizedPayload).forEach(
    (key) => sanitizedPayload[key] === undefined && delete sanitizedPayload[key]
  );

  // Construct Phase 07 canonical business event
  const businessEvent = createBusinessEvent({
    eventType,
    source,
    idempotencyKey: deterministicKey,
    actor,
    entity: {
      type: 'order',
      id: orderId,
      code: orderNumber,
    },
    payload: sanitizedPayload,
  });

  const supabase = getServiceClient();

  // Deduplication check: verify if an event with this order_id, event_type, and idempotency_key
  // has already been recorded
  const { data: existingEvents, error: checkError } = await supabase
    .from('order_events')
    .select('id, created_at, metadata')
    .eq('order_id', orderId)
    .eq('event_type', eventType)
    .order('created_at', { ascending: false })
    .limit(10);

  const isDuplicate = Boolean(
    !checkError &&
    existingEvents &&
    existingEvents.length > 0 &&
    existingEvents.some((evt: any) => {
      const meta = evt.metadata || {};
      if (meta.idempotency_key) {
        return meta.idempotency_key === deterministicKey;
      }
      return true;
    })
  );

  if (isDuplicate) {
    // Already observed in SoR: mark as duplicate to prevent downstream alert spam
    return {
      observed: true,
      event: businessEvent,
      isDuplicate: true,
      persistedToEventLog: false,
    };
  }

  // Persist to authoritative public.order_events SoR
  const { error: insertError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    performed_by: actor.id && actor.id !== 'system' ? actor.id : null,
    portal: source,
    metadata: {
      ...sanitizedPayload,
      idempotency_key: deterministicKey,
    },
  });

  if (
    insertError &&
    (insertError.code === '23505' ||
      insertError.message?.includes('duplicate key'))
  ) {
    return {
      observed: true,
      event: businessEvent,
      isDuplicate: true,
      persistedToEventLog: false,
    };
  }

  if (insertError) {
    recordFailedEvent({
      eventId: businessEvent.id,
      eventType: businessEvent.eventType,
      idempotencyKey: deterministicKey,
      source,
      orderId,
      rawEvent: businessEvent,
      errorMessage: insertError.message || 'Failed to insert order event',
    });

    return {
      observed: false,
      event: businessEvent,
      isDuplicate: false,
      persistedToEventLog: false,
      error: insertError.message,
    };
  }

  return {
    observed: true,
    event: businessEvent,
    isDuplicate: false,
    persistedToEventLog: true,
  };
}

/**
 * Fetches and normalizes all authoritative order lifecycle events for an order
 * into canonical Phase 07 BusinessEvent instances.
 */
export async function fetchOrderLifecycleEvents(
  orderId: string
): Promise<BusinessEvent[]> {
  const supabase = getServiceClient();

  const { data: rows, error } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error || !rows) {
    return [];
  }

  const events: BusinessEvent[] = [];

  for (const row of rows) {
    const candidate = {
      id: `evt_db_${row.id}`,
      schemaVersion: 1,
      eventType: row.event_type,
      source: row.portal || 'orders_portal',
      timestamp: row.created_at,
      idempotencyKey:
        row.metadata?.idempotency_key || `idemp_db_${row.id}_${row.event_type}`,
      actor: {
        type: row.performed_by ? 'staff' : 'system',
        id: row.performed_by || undefined,
      },
      entity: {
        type: 'order',
        id: row.order_id,
      },
      payload: row.metadata || {},
    };

    const validation = validateBusinessEvent(candidate);
    if (validation.success && validation.event) {
      events.push(validation.event);
    }
  }

  return events;
}
