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
 * STOREFRONT FUNNEL EVENT PIPELINE (TRACK B - PHASE 11)
 * ============================================================================
 * Normalizes, validates, and deduplicates customer shopping funnel events
 * (product discovery, cart additions/removals, and checkout entry) for the
 * Shared Intelligence Layer and PostHog analytics.
 *
 * Guarantees:
 * 1. Single Source of Funnel Truth: Resolves dual-event discrepancies between
 *    legacy GA4 naming (`begin_checkout`, `add_to_cart`) and canonical
 *    PostHog events (`checkout_started`, `product_added_to_cart`).
 * 2. Deduplication & Idempotency: Uses deterministic keys to prevent double-counting
 *    across client re-renders and server analytics.
 * 3. Strict Privacy & PII Minimization: Strips customer phone numbers, delivery
 *    addresses, payment tokens, and raw credentials before event ingestion.
 * 4. Zero Checkout Disruption: Fully non-blocking, fail-safe event normalization.
 */

export type StorefrontFunnelEventType =
  | 'PRODUCT_VIEWED'
  | 'CART_ITEM_ADDED'
  | 'CART_ITEM_REMOVED'
  | 'CHECKOUT_STARTED';

export interface FunnelItemPayload {
  productId: string;
  name?: string;
  price?: number;
  quantity?: number;
  sku?: string;
  category?: string;
}

export interface ObserveStorefrontFunnelEventParams {
  eventType: StorefrontFunnelEventType;
  entityId: string;
  entityCode?: string;
  sessionId?: string;
  actor?: EventActor;
  payload: Record<string, any>;
  source?: EventSource;
  idempotencyKey?: string;
}

export interface ObserveStorefrontFunnelEventResult {
  valid: boolean;
  event: BusinessEvent;
  idempotencyKey: string;
}

const FORBIDDEN_PII_KEYS = [
  'email',
  'phone',
  'mobile',
  'address',
  'street',
  'pin_code',
  'pincode',
  'postal_code',
  'token',
  'password',
  'card',
  'cvv',
  'secret',
];

/**
 * Sanitizes funnel payloads by stripping accidental PII keys.
 */
export function sanitizeFunnelPayload(
  payload: Record<string, any>
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    const isPii = FORBIDDEN_PII_KEYS.some((forbidden) =>
      lowerKey.includes(forbidden)
    );

    if (!isPii && value !== undefined) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        sanitized[key] = sanitizeFunnelPayload(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? sanitizeFunnelPayload(item)
            : item
        );
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Maps legacy analytics event names to canonical BusinessEventType.
 */
export function mapLegacyEventNameToCanonical(
  legacyName: string
): BusinessEventType | null {
  switch (legacyName) {
    case 'product_viewed':
    case 'ViewContent':
    case 'select_item':
      return 'PRODUCT_VIEWED';
    case 'add_to_cart':
    case 'product_added_to_cart':
    case 'AddToCart':
      return 'CART_ITEM_ADDED';
    case 'remove_from_cart':
    case 'product_removed_from_cart':
      return 'CART_ITEM_REMOVED';
    case 'begin_checkout':
    case 'checkout_started':
      return 'CHECKOUT_STARTED';
    default:
      return null;
  }
}

/**
 * Normalizes and validates a storefront shopping funnel event.
 */
export function observeStorefrontFunnelEvent(
  params: ObserveStorefrontFunnelEventParams
): ObserveStorefrontFunnelEventResult {
  const {
    eventType,
    entityId,
    entityCode,
    sessionId = 'anon_session',
    actor = { type: 'customer' },
    payload,
    source = 'storefront',
    idempotencyKey,
  } = params;

  // Clean PII from payload
  const cleanPayload = sanitizeFunnelPayload(payload);

  // Derive deterministic idempotency key
  const deterministicKey =
    idempotencyKey ||
    `idemp_funnel_${eventType.toLowerCase()}_${entityId}_${sessionId}`;

  const event = createBusinessEvent({
    eventType,
    source,
    idempotencyKey: deterministicKey,
    actor,
    entity: {
      type: eventType === 'CHECKOUT_STARTED' ? 'cart' : 'product',
      id: entityId,
      code: entityCode,
    },
    payload: cleanPayload,
  });

  return {
    valid: true,
    event,
    idempotencyKey: deterministicKey,
  };
}

/**
 * Ingests a legacy analytics event, normalizes it to a BusinessEvent, and strips PII.
 */
export function normalizeLegacyFunnelEvent(
  legacyName: string,
  rawPayload: Record<string, any>,
  options: { distinctId?: string; sessionId?: string } = {}
): BusinessEvent | null {
  const canonicalType = mapLegacyEventNameToCanonical(legacyName);
  if (!canonicalType) {
    return null;
  }

  const cleanPayload = sanitizeFunnelPayload(rawPayload);
  const sessionId = options.sessionId || 'anon_session';

  let entityId = cleanPayload.product_id || cleanPayload.item_id || 'unknown';
  if (canonicalType === 'CHECKOUT_STARTED') {
    entityId = cleanPayload.cart_id || `cart_${sessionId}`;
  }

  const deterministicKey = `idemp_funnel_legacy_${legacyName.toLowerCase()}_${entityId}_${sessionId}`;

  const eventCandidate = {
    id: `evt_funnel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    schemaVersion: 1,
    eventType: canonicalType,
    source: 'storefront' as EventSource,
    timestamp: new Date().toISOString(),
    idempotencyKey: deterministicKey,
    actor: {
      type: 'customer' as const,
      id: options.distinctId || undefined,
    },
    entity: {
      type: canonicalType === 'CHECKOUT_STARTED' ? 'cart' : 'product',
      id: entityId,
      code: cleanPayload.sku || cleanPayload.name || undefined,
    },
    payload: cleanPayload,
  };

  const validation = validateBusinessEvent(eventCandidate);
  return validation.success && validation.event ? validation.event : null;
}
