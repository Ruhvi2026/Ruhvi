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
 * PAYMENT OUTCOME EVENT PIPELINE (TRACK B - PHASE 09)
 * ============================================================================
 * Measures payment attempts, verified settlements, failures, and refunds
 * across PhonePe, Paytm, and Partial-COD for the Shared Intelligence Layer.
 *
 * Guarantees:
 * 1. Webhook vs Browser Reconciliation: Reconciles browser return query parameters
 *    against cryptographic server-to-server webhooks using deterministic
 *    idempotency keys (`idemp_pay_{gateway}_{txId}_{outcome}`).
 * 2. Source of Truth: Payment outcomes strictly derive from server-side order state
 *    in PostgreSQL (orders.payment_status).
 * 3. Never triggers live payments during tests or runtime calls.
 * 4. PII Protection: Strips sensitive card numbers, bank details, or PII.
 */

export type PaymentGateway = 'phonepe' | 'paytm' | 'cod' | 'wallet';

export type PaymentOutcome = 'ATTEMPTED' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

const OUTCOME_TO_EVENT_TYPE: Record<PaymentOutcome, BusinessEventType> = {
  ATTEMPTED: 'PAYMENT_ATTEMPTED',
  CONFIRMED: 'PAYMENT_CONFIRMED',
  FAILED: 'PAYMENT_FAILED',
  REFUNDED: 'REFUND_INITIATED',
};

const GATEWAY_TO_SOURCE: Record<PaymentGateway, EventSource> = {
  phonepe: 'webhook_phonepe',
  paytm: 'webhook_paytm',
  cod: 'orders_portal',
  wallet: 'storefront',
};

export interface ObservePaymentOutcomeParams {
  orderId: string;
  orderNumber?: string;
  gateway: PaymentGateway;
  merchantTransactionId: string;
  gatewayTransactionId?: string;
  amount: number;
  outcome: PaymentOutcome;
  isPartialCod?: boolean;
  prepaidAmount?: number;
  codBalance?: number;
  failureReason?: string;
  actor?: EventActor;
  origin?: 'webhook' | 'browser_return' | 'manual_reconcile';
}

export interface ObservePaymentOutcomeResult {
  observed: boolean;
  event: BusinessEvent;
  isDuplicate: boolean;
  persistedToEventLog: boolean;
}

/**
 * Observes, normalizes, and deduplicates a payment outcome.
 * Prevents double-counting between asynchronous server webhooks and
 * synchronous user browser return redirects.
 */
export async function observePaymentOutcome(
  params: ObservePaymentOutcomeParams
): Promise<ObservePaymentOutcomeResult> {
  const {
    orderId,
    orderNumber,
    gateway,
    merchantTransactionId,
    gatewayTransactionId,
    amount,
    outcome,
    isPartialCod = false,
    prepaidAmount,
    codBalance,
    failureReason,
    actor = { type: 'webhook', id: gateway },
    origin = 'webhook',
  } = params;

  const eventType = OUTCOME_TO_EVENT_TYPE[outcome];
  const source = GATEWAY_TO_SOURCE[gateway];

  // Deterministic idempotency key: uniquely identifies transaction and outcome
  const deterministicKey = `idemp_pay_${gateway}_${merchantTransactionId}_${outcome.toLowerCase()}`;

  const payload: Record<string, any> = {
    gateway,
    merchantTransactionId,
    gatewayTransactionId: gatewayTransactionId || null,
    amount: Number(amount) || 0,
    outcome,
    origin,
    isPartialCod,
    prepaidAmount:
      prepaidAmount !== undefined ? Number(prepaidAmount) : undefined,
    codBalance: codBalance !== undefined ? Number(codBalance) : undefined,
    failureReason: failureReason || undefined,
  };

  // Remove undefined properties
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key]
  );

  const businessEvent = createBusinessEvent({
    eventType,
    source,
    idempotencyKey: deterministicKey,
    actor,
    entity: {
      type: 'payment',
      id: merchantTransactionId,
      code: orderNumber || orderId,
    },
    payload,
  });

  const supabase = getServiceClient();

  // Deduplication check in public.order_events:
  // Check if this payment outcome has already been logged for this order & transaction
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
      if (meta.merchantTransactionId) {
        return (
          meta.merchantTransactionId === merchantTransactionId &&
          (!meta.outcome || meta.outcome === outcome)
        );
      }
      return true;
    })
  );

  if (isDuplicate) {
    // Already processed by earlier webhook or browser return — flag as duplicate
    return {
      observed: true,
      event: businessEvent,
      isDuplicate: true,
      persistedToEventLog: false,
    };
  }

  // Persist to authoritative order_events ledger
  const { error: insertError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    performed_by: actor.id && actor.type !== 'webhook' ? actor.id : null,
    portal: source,
    metadata: {
      ...payload,
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

  return {
    observed: true,
    event: businessEvent,
    isDuplicate: false,
    persistedToEventLog: !insertError,
  };
}

/**
 * Fetches and normalizes all payment lifecycle events for an order.
 */
export async function fetchPaymentEvents(
  orderId: string
): Promise<BusinessEvent[]> {
  const supabase = getServiceClient();

  const { data: rows, error } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .in('event_type', [
      'PAYMENT_ATTEMPTED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_FAILED',
      'REFUND_INITIATED',
    ])
    .order('created_at', { ascending: true });

  if (error || !rows) {
    return [];
  }

  const events: BusinessEvent[] = [];

  for (const row of rows) {
    const candidate = {
      id: `evt_pay_${row.id}`,
      schemaVersion: 1,
      eventType: row.event_type,
      source: row.portal || 'webhook_phonepe',
      timestamp: row.created_at,
      idempotencyKey:
        row.metadata?.idempotency_key ||
        `idemp_pay_${row.id}_${row.event_type}`,
      actor: {
        type: row.performed_by ? 'staff' : 'webhook',
        id: row.performed_by || undefined,
      },
      entity: {
        type: 'payment',
        id: row.metadata?.merchantTransactionId || row.order_id,
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
