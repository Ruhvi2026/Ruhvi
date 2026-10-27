import { z } from 'zod';

/**
 * ============================================================================
 * CANONICAL BUSINESS EVENT CONTRACT (TRACK B - PHASE 07)
 * ============================================================================
 * Authoritative, typed, Zod-validated contract for the Shared Intelligence Layer.
 * Defines event identity, schema versioning, idempotency keys, actors, entity
 * references, and strict privacy/data-minimization guards.
 */

export const SCHEMA_VERSION = 1;

// 1. Supported Event Types across Ruhvi's E-Commerce Subsystems
export const BusinessEventTypeEnum = z.enum([
  // Order Lifecycle
  'ORDER_CREATED',
  'ORDER_CONFIRMED',
  'PAYMENT_ATTEMPTED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_FAILED',
  'PACKING_STARTED',
  'PACKED',
  'LABEL_CREATED',
  'MANIFEST_CREATED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_PICKED',
  'REFUND_INITIATED',
  'RTO_INITIATED',
  'RTO_RECEIVED',

  // Inventory Mutations
  'INVENTORY_RESTOCKED',
  'INVENTORY_DEDUCTED',
  'INVENTORY_DAMAGED',
  'INVENTORY_AUDITED',
  'INVENTORY_TRANSFERRED',

  // Storefront & Funnel
  'PRODUCT_VIEWED',
  'CART_ITEM_ADDED',
  'CART_ITEM_REMOVED',
  'CHECKOUT_STARTED',

  // Support & CRM
  'SUPPORT_TICKET_CREATED',
  'SUPPORT_TICKET_ASSIGNED',
  'SUPPORT_TICKET_REPLIED',
  'SUPPORT_TICKET_RESOLVED',
  'SUPPORT_TICKET_CLOSED',
  'SUPPORT_TICKET_REOPENED',

  // AI & Operational Telemetry
  'AI_REQUEST_COMPLETED',
  'AI_FAILOVER_TRIGGERED',
  'AI_RATE_LIMIT_HIT',
  'BUSINESS_ANOMALY_DETECTED',
]);

export type BusinessEventType = z.infer<typeof BusinessEventTypeEnum>;

// 2. Event Origins / Systems
export const EventSourceEnum = z.enum([
  'storefront',
  'orders_portal',
  'operations_portal',
  'support_portal',
  'marketing_portal',
  'admin_portal',
  'webhook_phonepe',
  'webhook_paytm',
  'webhook_shiprocket',
  'cron_task_scheduler',
  'cron_daily_automations',
  'ai_co_founder',
]);

export type EventSource = z.infer<typeof EventSourceEnum>;

// 3. Actor Classifications
export const EventActorTypeEnum = z.enum([
  'customer',
  'staff',
  'manager',
  'admin',
  'super_admin',
  'system',
  'webhook',
  'ai_agent',
]);

export type EventActorType = z.infer<typeof EventActorTypeEnum>;

export const EventActorSchema = z.object({
  type: EventActorTypeEnum,
  id: z.string().min(1, 'Actor ID must not be empty').optional(),
  name: z.string().max(100).optional(),
});

export type EventActor = z.infer<typeof EventActorSchema>;

// 4. Target Entity Reference
export const EntityTypeEnum = z.enum([
  'order',
  'product',
  'variant',
  'customer',
  'cart',
  'ticket',
  'inventory',
  'payment',
  'anomaly',
  'recommendation',
  'ai_service',
]);

export type EntityType = z.infer<typeof EntityTypeEnum>;

export const EntityReferenceSchema = z.object({
  type: EntityTypeEnum,
  id: z.string().min(1, 'Entity reference ID must not be empty'),
  code: z.string().max(100).optional(), // E.g., SKU or Order Number
});

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

// 5. Trace and Correlation Context
export const TraceContextSchema = z.object({
  traceId: z.string().max(128).optional(),
  spanId: z.string().max(64).optional(),
  correlationId: z.string().max(128).optional(),
  clientIp: z.string().max(64).optional(),
  userAgent: z.string().max(512).optional(),
});

export type TraceContext = z.infer<typeof TraceContextSchema>;

// 6. Privacy & PII Defense Guard
// Disallows raw credit cards, Aadhaar, PAN, passwords, or raw secrets in event payloads.
const SENSITIVE_PATTERN_TESTS = [
  { pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b/, name: 'raw_credit_card' },
  { pattern: /\b\d{4}\s\d{4}\s\d{4}\b/, name: 'raw_aadhaar_number' },
  { pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/, name: 'raw_pan_number' },
  {
    pattern:
      /(?:password|secretKey|serviceRoleKey)\s*[:=]\s*\\?["'][^"']+\\?["']/i,
    name: 'raw_secret_leak',
  },
];

function containsUnredactedPII(data: unknown): {
  hasLeak: boolean;
  leakName?: string;
} {
  if (!data) return { hasLeak: false };
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  for (const { pattern, name } of SENSITIVE_PATTERN_TESTS) {
    if (pattern.test(str)) {
      return { hasLeak: true, leakName: name };
    }
  }
  return { hasLeak: false };
}

export const EventPayloadSchema = z
  .record(z.string(), z.any())
  .refine((payload) => !containsUnredactedPII(payload).hasLeak, {
    message:
      'Event payload contains unredacted PII or sensitive credentials (prohibited by Phase 05 Privacy Model)',
  });

// 7. Canonical Business Event Master Schema
export const BusinessEventSchema = z.object({
  id: z
    .string()
    .min(10, 'Event ID must be a unique identifier with minimum 10 characters'),
  schemaVersion: z.number().int().min(1).max(1).default(SCHEMA_VERSION),
  eventType: BusinessEventTypeEnum,
  source: EventSourceEnum,
  timestamp: z
    .string()
    .refine((ts) => !isNaN(Date.parse(ts)), {
      message: 'Timestamp must be a valid ISO 8601 string',
    }),
  idempotencyKey: z
    .string()
    .min(5, 'Idempotency key must be at least 5 characters for deduplication'),
  actor: EventActorSchema,
  entity: EntityReferenceSchema,
  payload: EventPayloadSchema.default({}),
  trace: TraceContextSchema.optional(),
});

export type BusinessEvent = z.infer<typeof BusinessEventSchema>;

// 8. Helpers & Factories

export interface CreateBusinessEventParams {
  id?: string;
  eventType: BusinessEventType;
  source: EventSource;
  idempotencyKey: string;
  actor: EventActor;
  entity: EntityReference;
  payload?: Record<string, any>;
  trace?: TraceContext;
  timestamp?: string;
}

/**
 * Creates and strictly validates a canonical BusinessEvent.
 * Automatically injects ISO timestamp, schemaVersion, and unique event ID if omitted.
 */
export function createBusinessEvent(
  params: CreateBusinessEventParams
): BusinessEvent {
  const generatedId =
    params.id ||
    `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const currentIsoTimestamp = params.timestamp || new Date().toISOString();

  const rawEvent = {
    id: generatedId,
    schemaVersion: SCHEMA_VERSION,
    eventType: params.eventType,
    source: params.source,
    timestamp: currentIsoTimestamp,
    idempotencyKey: params.idempotencyKey,
    actor: params.actor,
    entity: params.entity,
    payload: params.payload || {},
    trace: params.trace,
  };

  return BusinessEventSchema.parse(rawEvent);
}

/**
 * Validates any candidate event object against the canonical contract.
 */
export function validateBusinessEvent(candidate: unknown): {
  success: boolean;
  event?: BusinessEvent;
  error?: string;
} {
  const result = BusinessEventSchema.safeParse(candidate);
  if (result.success) {
    return { success: true, event: result.data };
  }
  const issues =
    (result.error as any).issues || (result.error as any).errors || [];
  const errorMsg =
    issues.length > 0
      ? issues
          .map((e: any) => `${(e.path || []).join('.')}: ${e.message}`)
          .join(', ')
      : result.error?.message || 'Validation failed';
  return {
    success: false,
    error: errorMsg,
  };
}
