import {
  observeStorefrontFunnelEvent,
  normalizeLegacyFunnelEvent,
  mapLegacyEventNameToCanonical,
  sanitizeFunnelPayload,
} from '../storefront-events';

describe('Storefront Funnel Intelligence Pipeline (Phase 11)', () => {
  describe('mapLegacyEventNameToCanonical', () => {
    it('correctly maps various legacy client/server analytics event names', () => {
      expect(mapLegacyEventNameToCanonical('product_viewed')).toBe(
        'PRODUCT_VIEWED'
      );
      expect(mapLegacyEventNameToCanonical('ViewContent')).toBe(
        'PRODUCT_VIEWED'
      );
      expect(mapLegacyEventNameToCanonical('select_item')).toBe(
        'PRODUCT_VIEWED'
      );

      expect(mapLegacyEventNameToCanonical('add_to_cart')).toBe(
        'CART_ITEM_ADDED'
      );
      expect(mapLegacyEventNameToCanonical('product_added_to_cart')).toBe(
        'CART_ITEM_ADDED'
      );
      expect(mapLegacyEventNameToCanonical('AddToCart')).toBe(
        'CART_ITEM_ADDED'
      );

      expect(mapLegacyEventNameToCanonical('remove_from_cart')).toBe(
        'CART_ITEM_REMOVED'
      );
      expect(mapLegacyEventNameToCanonical('product_removed_from_cart')).toBe(
        'CART_ITEM_REMOVED'
      );

      expect(mapLegacyEventNameToCanonical('begin_checkout')).toBe(
        'CHECKOUT_STARTED'
      );
      expect(mapLegacyEventNameToCanonical('checkout_started')).toBe(
        'CHECKOUT_STARTED'
      );

      expect(mapLegacyEventNameToCanonical('unknown_custom_event')).toBeNull();
    });
  });

  describe('sanitizeFunnelPayload', () => {
    it('strips forbidden PII keys while preserving allowed shopping properties', () => {
      const rawPayload = {
        product_id: 'prod_bangles_001',
        name: 'Royal Heritage Gold Bangles',
        price: 24999,
        quantity: 1,
        email: 'customer@example.com',
        phone: '+919876543210',
        mobile: '9876543210',
        delivery_address: '123 Park Street, Kolkata',
        pin_code: '700016',
        secret_token: 'tok_live_123',
        nested: {
          category: 'Bangles',
          customer_phone: '+919999999999',
          user_email: 'test@ruhvi.in',
        },
      };

      const sanitized = sanitizeFunnelPayload(rawPayload);

      expect(sanitized.product_id).toBe('prod_bangles_001');
      expect(sanitized.name).toBe('Royal Heritage Gold Bangles');
      expect(sanitized.price).toBe(24999);
      expect(sanitized.quantity).toBe(1);
      expect(sanitized.nested?.category).toBe('Bangles');

      // Verify PII is completely stripped
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.mobile).toBeUndefined();
      expect(sanitized.delivery_address).toBeUndefined();
      expect(sanitized.pin_code).toBeUndefined();
      expect(sanitized.secret_token).toBeUndefined();
      expect(sanitized.nested?.customer_phone).toBeUndefined();
      expect(sanitized.nested?.user_email).toBeUndefined();
    });
  });

  describe('observeStorefrontFunnelEvent', () => {
    it('observes a product view event with session scoping', () => {
      const result = observeStorefrontFunnelEvent({
        eventType: 'PRODUCT_VIEWED',
        entityId: 'prod_necklace_123',
        entityCode: 'NECK-DIA-01',
        sessionId: 'sess_user_abc',
        payload: {
          name: 'Solitaire Diamond Pendant',
          price: 18500,
          category: 'Necklaces',
        },
      });

      expect(result.valid).toBe(true);
      expect(result.event.eventType).toBe('PRODUCT_VIEWED');
      expect(result.event.entity.type).toBe('product');
      expect(result.event.entity.id).toBe('prod_necklace_123');
      expect(result.event.entity.code).toBe('NECK-DIA-01');
      expect(result.event.idempotencyKey).toBe(
        'idemp_funnel_product_viewed_prod_necklace_123_sess_user_abc'
      );
    });

    it('observes a cart addition with PII stripped and quantity tracked', () => {
      const result = observeStorefrontFunnelEvent({
        eventType: 'CART_ITEM_ADDED',
        entityId: 'prod_earring_456',
        sessionId: 'sess_user_xyz',
        payload: {
          name: 'Classic Jhumka Earrings',
          price: 12000,
          quantity: 2,
          customer_email: 'leak@example.com',
        },
      });

      expect(result.valid).toBe(true);
      expect(result.event.eventType).toBe('CART_ITEM_ADDED');
      expect(result.event.payload.quantity).toBe(2);
      expect(result.event.payload.customer_email).toBeUndefined();
    });

    it('observes a checkout started event with cart subtotal and item list', () => {
      const result = observeStorefrontFunnelEvent({
        eventType: 'CHECKOUT_STARTED',
        entityId: 'cart_local_789',
        sessionId: 'sess_chk_999',
        payload: {
          cart_value: 30500,
          item_count: 3,
          currency: 'INR',
          items: [
            { item_id: 'prod_1', name: 'Ring', price: 10500, quantity: 1 },
            { item_id: 'prod_2', name: 'Bangles', price: 20000, quantity: 2 },
          ],
        },
      });

      expect(result.valid).toBe(true);
      expect(result.event.eventType).toBe('CHECKOUT_STARTED');
      expect(result.event.entity.type).toBe('cart');
      expect(result.event.payload.cart_value).toBe(30500);
      expect(result.event.payload.item_count).toBe(3);
      expect(result.event.payload.items).toHaveLength(2);
    });
  });

  describe('normalizeLegacyFunnelEvent', () => {
    it('normalizes legacy begin_checkout into CHECKOUT_STARTED BusinessEvent', () => {
      const legacyPayload = {
        currency: 'INR',
        value: 15000,
        items: [{ item_id: 'prod_1', item_name: 'Pendant' }],
      };

      const event = normalizeLegacyFunnelEvent(
        'begin_checkout',
        legacyPayload,
        {
          sessionId: 'sess_test_1',
          distinctId: 'ph_distinct_user_1',
        }
      );

      expect(event).not.toBeNull();
      expect(event?.eventType).toBe('CHECKOUT_STARTED');
      expect(event?.entity.type).toBe('cart');
      expect(event?.actor.id).toBe('ph_distinct_user_1');
      expect(event?.payload.currency).toBe('INR');
      expect(event?.payload.value).toBe(15000);
    });

    it('returns null for unmapped legacy event', () => {
      const event = normalizeLegacyFunnelEvent('non_existent_event', {
        data: 123,
      });
      expect(event).toBeNull();
    });
  });
});
