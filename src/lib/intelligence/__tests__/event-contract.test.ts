import {
  createBusinessEvent,
  validateBusinessEvent,
  BusinessEventSchema,
  SCHEMA_VERSION,
} from '../event-contract';

describe('Canonical Business Event Contract (Phase 07)', () => {
  it('creates and validates a canonical ORDER_CREATED event with schema defaults', () => {
    const event = createBusinessEvent({
      eventType: 'ORDER_CREATED',
      source: 'storefront',
      idempotencyKey: 'idemp_order_12345',
      actor: { type: 'customer', id: 'usr_001', name: 'Ruhvi Customer' },
      entity: { type: 'order', id: 'ord_999', code: 'RUV-2026-0001' },
      payload: { total: 4999.0, itemCount: 2, paymentMethod: 'phonepe' },
      trace: { clientIp: '192.168.1.1' },
    });

    expect(event.id).toMatch(/^evt_\d+_/);
    expect(event.schemaVersion).toBe(SCHEMA_VERSION);
    expect(event.eventType).toBe('ORDER_CREATED');
    expect(event.source).toBe('storefront');
    expect(event.idempotencyKey).toBe('idemp_order_12345');
    expect(event.entity.code).toBe('RUV-2026-0001');
    expect(event.payload.total).toBe(4999.0);
  });

  it('validates a valid candidate object using validateBusinessEvent helper', () => {
    const candidate = {
      id: 'evt_test_1234567890',
      schemaVersion: 1,
      eventType: 'PAYMENT_CONFIRMED',
      source: 'webhook_phonepe',
      timestamp: new Date().toISOString(),
      idempotencyKey: 'phonepe_trans_abc123',
      actor: { type: 'webhook' },
      entity: { type: 'payment', id: 'pay_777' },
      payload: { amount: 1500, gatewayRef: 'T261026001' },
    };

    const validation = validateBusinessEvent(candidate);
    expect(validation.success).toBe(true);
    expect(validation.event?.eventType).toBe('PAYMENT_CONFIRMED');
    expect(validation.error).toBeUndefined();
  });

  it('rejects candidate with unsupported event type', () => {
    const candidate = {
      id: 'evt_test_invalid_type',
      schemaVersion: 1,
      eventType: 'UNSUPPORTED_RANDOM_EVENT',
      source: 'storefront',
      timestamp: new Date().toISOString(),
      idempotencyKey: 'key_12345',
      actor: { type: 'system' },
      entity: { type: 'order', id: 'ord_1' },
      payload: {},
    };

    const validation = validateBusinessEvent(candidate);
    expect(validation.success).toBe(false);
    expect(validation.error).toContain('eventType');
  });

  it('rejects event with invalid ISO timestamp', () => {
    const candidate = {
      id: 'evt_test_invalid_ts',
      schemaVersion: 1,
      eventType: 'INVENTORY_DEDUCTED',
      source: 'operations_portal',
      timestamp: 'not-a-valid-date-string',
      idempotencyKey: 'key_stock_001',
      actor: { type: 'staff', id: 'staff_1' },
      entity: { type: 'product', id: 'prod_1', code: 'SKU-GLD-01' },
      payload: { deductedQty: 1 },
    };

    const validation = validateBusinessEvent(candidate);
    expect(validation.success).toBe(false);
    expect(validation.error).toContain('timestamp');
  });

  it('enforces minimum idempotencyKey length for deduplication security', () => {
    const candidate = {
      id: 'evt_test_short_idemp',
      schemaVersion: 1,
      eventType: 'ORDER_CONFIRMED',
      source: 'orders_portal',
      timestamp: new Date().toISOString(),
      idempotencyKey: 'ab', // too short (< 5 chars)
      actor: { type: 'manager' },
      entity: { type: 'order', id: 'ord_1' },
      payload: {},
    };

    const validation = validateBusinessEvent(candidate);
    expect(validation.success).toBe(false);
    expect(validation.error).toContain('idempotencyKey');
  });

  it('strictly blocks event payload containing unredacted credit card numbers (Phase 05 Guard)', () => {
    expect(() => {
      createBusinessEvent({
        eventType: 'PAYMENT_ATTEMPTED',
        source: 'storefront',
        idempotencyKey: 'pay_attempt_card_leak',
        actor: { type: 'customer', id: 'usr_bad' },
        entity: { type: 'order', id: 'ord_1' },
        payload: {
          cardNumber: '4532 0150 9982 1234', // Unredacted credit card
        },
      });
    }).toThrow(/unredacted PII or sensitive credentials/);
  });

  it('strictly blocks event payload leaking raw serviceRoleKey or password', () => {
    const candidate = {
      id: 'evt_test_secret_leak',
      schemaVersion: 1,
      eventType: 'AI_REQUEST_COMPLETED',
      source: 'ai_co_founder',
      timestamp: new Date().toISOString(),
      idempotencyKey: 'key_ai_test_01',
      actor: { type: 'ai_agent' },
      entity: { type: 'anomaly', id: 'anom_1' },
      payload: {
        debugInfo: 'serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6..."',
      },
    };

    const validation = validateBusinessEvent(candidate);
    expect(validation.success).toBe(false);
    expect(validation.error).toContain('payload');
  });
});
