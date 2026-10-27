jest.mock('server-only', () => ({}));

import {
  observeInventoryChange,
  fetchInventoryEvents,
  mapInventoryReasonToEventType,
} from '../inventory-events';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Inventory Change Intelligence Pipeline (Phase 10)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('mapInventoryReasonToEventType', () => {
    it('correctly maps various adjustment reasons to canonical event types', () => {
      expect(mapInventoryReasonToEventType('restock', 10)).toBe(
        'INVENTORY_RESTOCKED'
      );
      expect(mapInventoryReasonToEventType('return', 1)).toBe(
        'INVENTORY_RESTOCKED'
      );
      expect(
        mapInventoryReasonToEventType('order_cancellation_restock', 2)
      ).toBe('INVENTORY_RESTOCKED');
      expect(mapInventoryReasonToEventType('damage', -3)).toBe(
        'INVENTORY_DAMAGED'
      );
      expect(mapInventoryReasonToEventType('audit', 0)).toBe(
        'INVENTORY_AUDITED'
      );
      expect(mapInventoryReasonToEventType('transfer', 5)).toBe(
        'INVENTORY_TRANSFERRED'
      );
      expect(mapInventoryReasonToEventType('order_allocation', -1)).toBe(
        'INVENTORY_DEDUCTED'
      );
      expect(mapInventoryReasonToEventType('manual', -2)).toBe(
        'INVENTORY_DEDUCTED'
      );
      expect(mapInventoryReasonToEventType('manual', 5)).toBe(
        'INVENTORY_RESTOCKED'
      );
    });
  });

  describe('observeInventoryChange', () => {
    it('observes a restock adjustment event with deterministic idempotency', async () => {
      const result = await observeInventoryChange({
        productId: 'prod_bangles_123',
        sku: 'BAN-GLD-01',
        barcode: '8901234567890',
        previousStock: 5,
        adjustedBy: 15,
        newStock: 20,
        reason: 'restock',
        notes: 'Supplier batch restock',
        adjustmentId: 'adj_uuid_999',
        actor: { type: 'staff', id: 'usr_staff_1' },
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('INVENTORY_RESTOCKED');
      expect(result.event.idempotencyKey).toBe('idemp_inv_adj_adj_uuid_999');
      expect(result.event.entity.id).toBe('prod_bangles_123');
      expect(result.event.entity.code).toBe('BAN-GLD-01');
      expect(result.event.payload.previousStock).toBe(5);
      expect(result.event.payload.newStock).toBe(20);
      expect(result.event.payload.adjustedBy).toBe(15);
      expect(result.event.payload.isShrinkage).toBe(false);
    });

    it('identifies damaged stock shrinkage and flags appropriately', async () => {
      const result = await observeInventoryChange({
        productId: 'prod_necklace_456',
        sku: 'NECK-DIA-02',
        previousStock: 10,
        adjustedBy: -2,
        newStock: 8,
        reason: 'damage',
        notes: 'Clasp broken during inspection',
        actor: { type: 'staff', id: 'usr_inspector_2' },
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('INVENTORY_DAMAGED');
      expect(result.event.payload.isShrinkage).toBe(true);
      expect(result.event.payload.adjustedBy).toBe(-2);
    });

    it('handles mobile scan-sync events preserving barcode and setting scanSync flag', async () => {
      const result = await observeInventoryChange({
        productId: 'prod_ring_789',
        sku: 'RNG-SOL-03',
        barcode: '8909876543210',
        previousStock: 0,
        adjustedBy: 10,
        newStock: 10,
        reason: 'restock',
        notes: 'Mobile Scan Sync: Barcode 8909876543210, SKU RNG-SOL-03',
        actor: { type: 'staff', id: 'usr_mobile_worker' },
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('INVENTORY_RESTOCKED');
      expect(result.event.payload.barcode).toBe('8909876543210');
      expect(result.event.payload.isScanSync).toBe(true);
    });

    it('derives order-scoped idempotency key when inventory is deducted for an order', async () => {
      const result = await observeInventoryChange({
        productId: 'prod_earring_101',
        sku: 'EAR-GLD-04',
        previousStock: 12,
        adjustedBy: -1,
        newStock: 11,
        reason: 'order_allocation',
        orderId: 'ord_ruhvi_2026_001',
        actor: { type: 'system', id: 'checkout_order_pipeline' },
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('INVENTORY_DEDUCTED');
      expect(result.event.idempotencyKey).toBe(
        'idemp_inv_order_ord_ruhvi_2026_001_prod_earring_101_order_allocation'
      );
    });
  });

  describe('fetchInventoryEvents', () => {
    it('fetches inventory adjustments from database and transforms into BusinessEvents', async () => {
      const mockAdjustments = [
        {
          id: 'adj_001',
          product_id: 'prod_bangles_123',
          user_id: 'usr_staff_1',
          previous_stock: 5,
          adjusted_by: 15,
          new_stock: 20,
          reason: 'restock',
          notes: 'Batch intake',
          created_at: '2026-10-26T12:00:00.000Z',
        },
        {
          id: 'adj_002',
          product_id: 'prod_bangles_123',
          user_id: 'usr_staff_2',
          previous_stock: 20,
          adjusted_by: -1,
          new_stock: 19,
          reason: 'damage',
          notes: 'Defective latch',
          created_at: '2026-10-26T14:30:00.000Z',
        },
      ];

      mockSupabase.limit.mockResolvedValueOnce({
        data: mockAdjustments,
        error: null,
      });

      const events = await fetchInventoryEvents('prod_bangles_123', 10);

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('INVENTORY_RESTOCKED');
      expect(events[0].payload.adjustedBy).toBe(15);
      expect(events[0].idempotencyKey).toBe('idemp_inv_adj_adj_001');

      expect(events[1].eventType).toBe('INVENTORY_DAMAGED');
      expect(events[1].payload.adjustedBy).toBe(-1);
      expect(events[1].idempotencyKey).toBe('idemp_inv_adj_adj_002');
    });

    it('returns empty array when database returns error', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed'),
      });

      const events = await fetchInventoryEvents('prod_nonexistent', 10);
      expect(events).toEqual([]);
    });
  });
});
