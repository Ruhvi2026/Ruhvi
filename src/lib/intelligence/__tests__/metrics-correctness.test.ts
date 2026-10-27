jest.mock('server-only', () => ({}));

import {
  getCanonicalMetric,
  getIstTimeWindow,
  clearMetricsCache,
} from '../metrics-service';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

/**
 * ============================================================================
 * METRIC CORRECTNESS & EDGE-CASE TEST SUITE (TRACK B - PHASE 16)
 * ============================================================================
 * Comprehensive synthetic edge-case verification proving metric correctness
 * under complex real-world conditions:
 * 1. Partial-COD advances vs Pure COD vs Online settlements
 * 2. Refund and cancellation deductions across accounting windows
 * 3. Asia/Kolkata midnight timezone boundaries (+05:30)
 * 4. Zero-division guards and explicit insufficient_data states
 * 5. Distinction between courier RTOs and customer returns
 * 6. Active vs draft/archived stock-out rate isolation
 * 7. Gateway retry and failure rate bounds
 */

describe('Metric Correctness & Edge-Case Verification Suite (Phase 16)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    clearMetricsCache();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Edge Case 1: Partial-COD vs Pure COD vs Online Settlements', () => {
    it('correctly qualifies paid orders across heterogeneous payment schemes', async () => {
      const syntheticOrders = [
        // 1. Online Prepaid verified settlement -> COUNTED
        {
          id: 'ord_online_1',
          payment_status: 'paid',
          is_partial_cod: false,
          payment_method: 'phonepe',
          status: 'confirmed',
        },
        // 2. Online Prepaid pending -> EXCLUDED
        {
          id: 'ord_online_2',
          payment_status: 'pending',
          is_partial_cod: false,
          payment_method: 'phonepe',
          status: 'pending',
        },
        // 3. Partial-COD with 10% prepaid deposit settled -> COUNTED
        {
          id: 'ord_pcod_1',
          payment_status: 'partial_paid',
          is_partial_cod: true,
          payment_method: 'phonepe',
          status: 'confirmed',
        },
        // 4. Partial-COD with deposit failed -> EXCLUDED
        {
          id: 'ord_pcod_2',
          payment_status: 'failed',
          is_partial_cod: true,
          payment_method: 'phonepe',
          status: 'cancelled',
        },
        // 5. Pure COD confirmed order -> COUNTED
        {
          id: 'ord_cod_1',
          payment_status: 'pending',
          is_partial_cod: false,
          payment_method: 'cod',
          status: 'confirmed',
        },
        // 6. Pure COD cancelled prior to dispatch -> EXCLUDED
        {
          id: 'ord_cod_2',
          payment_status: 'pending',
          is_partial_cod: false,
          payment_method: 'cod',
          status: 'cancelled',
        },
        // 7. Pure COD abandoned checkout/pending confirmation -> EXCLUDED
        {
          id: 'ord_cod_3',
          payment_status: 'pending',
          is_partial_cod: false,
          payment_method: 'cod',
          status: 'pending',
        },
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: syntheticOrders,
        error: null,
      });

      const result = await getCanonicalMetric('paid_orders_count', {
        callerRole: 'admin',
        fresh: true,
      });

      expect(result.status).toBe('available');
      // Orders 1, 3, 5 meet the criteria = 3
      expect(result.value).toBe(3);
      expect(result.sampleSize).toBe(7);
    });
  });

  describe('Edge Case 2: Cancellation & Refund Deductions across Sales Metrics', () => {
    it('proves that gross sales captures top-line demand while net sales deducts cancellations and returns', async () => {
      const syntheticOrders = [
        // Confirmed delivered -> Gross +10000, Net +10000
        { id: 'o_deliv', total: 10000, status: 'delivered' },
        // Confirmed shipped -> Gross +15000, Net +15000
        { id: 'o_ship', total: 15000, status: 'shipped' },
        // Customer cancelled after confirmation -> Gross +5000, Net 0
        { id: 'o_canc', total: 5000, status: 'cancelled' },
        // Customer returned parcel -> Gross +8000, Net 0
        { id: 'o_ret', total: 8000, status: 'returned' },
        // Courier RTO parcel -> Gross +7000, Net 0
        { id: 'o_rto', total: 7000, status: 'rto_received' },
        // Pending checkout attempt (unpaid) -> Gross 0, Net 0
        { id: 'o_pend', total: 12000, status: 'pending' },
      ];

      // Test Gross Sales
      mockSupabase.lte.mockResolvedValueOnce({
        data: syntheticOrders,
        error: null,
      });

      const grossRes = await getCanonicalMetric('gross_sales', {
        callerRole: 'admin',
        fresh: true,
      });
      expect(grossRes.status).toBe('available');
      // 10000 + 15000 + 5000 + 8000 + 7000 = 45000 (pending excluded)
      expect(grossRes.value).toBe(45000);

      // Test Net Sales
      mockSupabase.lte.mockResolvedValueOnce({
        data: syntheticOrders,
        error: null,
      });

      const netRes = await getCanonicalMetric('net_sales', {
        callerRole: 'admin',
        fresh: true,
      });
      expect(netRes.status).toBe('available');
      // 10000 + 15000 = 25000 (cancelled, returned, rto, and pending excluded)
      expect(netRes.value).toBe(25000);
      expect(netRes.sampleSize).toBe(2);
    });
  });

  describe('Edge Case 3: Zero-Division Guards & Explicit Insufficient Data States', () => {
    it('returns insufficient_data with null values when denominators are zero', async () => {
      // 1. AOV with 0 confirmed orders
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ id: 'o1', total: 9999, status: 'cancelled' }],
        error: null,
      });
      const aov = await getCanonicalMetric('average_order_value', {
        callerRole: 'admin',
        fresh: true,
      });
      expect(aov.status).toBe('insufficient_data');
      expect(aov.value).toBeNull();
      expect(aov.sampleSize).toBe(0);

      // 2. Cancellation rate with 0 placed orders
      mockSupabase.lte.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      const canc = await getCanonicalMetric('cancellation_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(canc.status).toBe('insufficient_data');
      expect(canc.value).toBeNull();

      // 3. RTO rate with 0 shipped orders
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ id: 'o1', status: 'confirmed' }], // Not reached shipped status
        error: null,
      });
      const rto = await getCanonicalMetric('rto_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(rto.status).toBe('insufficient_data');
      expect(rto.value).toBeNull();

      // 4. Return rate with 0 delivered orders
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ id: 'o1', status: 'shipped' }], // Not yet delivered
        error: null,
      });
      const ret = await getCanonicalMetric('return_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(ret.status).toBe('insufficient_data');
      expect(ret.value).toBeNull();
    });
  });

  describe('Edge Case 4: Courier RTO vs Customer Return Separation', () => {
    it('strictly separates courier delivery failures (RTO) from post-delivery customer returns', async () => {
      const syntheticOrders = [
        { id: 'o1', status: 'delivered' },
        { id: 'o2', status: 'delivered' },
        { id: 'o3', status: 'returned' }, // Customer return
        { id: 'o4', status: 'return_approved' }, // Customer return
        { id: 'o5', status: 'shipped' },
        { id: 'o6', status: 'rto_received' }, // Courier RTO
        { id: 'o7', status: 'rto_initiated' }, // Courier RTO
      ];

      // RTO Rate evaluation:
      // Shipped population: o1, o2, o3 (was shipped), o4 (was shipped), o5, o6, o7 = 7
      // RTO count: o6, o7 = 2
      mockSupabase.lte.mockResolvedValueOnce({
        data: syntheticOrders,
        error: null,
      });

      const rtoRes = await getCanonicalMetric('rto_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(rtoRes.status).toBe('available');
      // 2 / 7 = 28.57%
      expect(rtoRes.value).toBe(28.57);
      expect(rtoRes.metadata?.rtoCount).toBe(2);

      // Return Rate evaluation:
      // Delivered population: o1, o2 = 2
      // Returned count: o3, o4 = 2
      mockSupabase.lte.mockResolvedValueOnce({
        data: syntheticOrders,
        error: null,
      });

      const retRes = await getCanonicalMetric('return_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(retRes.status).toBe('available');
      // 2 / 2 = 100%
      expect(retRes.value).toBe(100.0);
      expect(retRes.metadata?.returnedCount).toBe(2);
    });
  });

  describe('Edge Case 5: Catalog Stock-Out Filtering (Active vs Draft/Archived)', () => {
    it('excludes draft, unlisted, and archived products from stockout metrics', async () => {
      const syntheticCatalog = [
        { id: 'p1', status: 'active', stock_quantity: 10 }, // In stock
        { id: 'p2', status: 'published', stock_quantity: 4 }, // In stock
        { id: 'p3', status: 'active', stock_quantity: 0 }, // Out of stock
        { id: 'p4', status: 'published', stock_quantity: -1 }, // Out of stock (damaged/negative)
        { id: 'p5', status: 'draft', stock_quantity: 0 }, // Excluded from calculation
        { id: 'p6', status: 'archived', stock_quantity: 0 }, // Excluded from calculation
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: syntheticCatalog,
        error: null,
      });

      const res = await getCanonicalMetric('stock_out_rate', {
        callerRole: 'staff',
        fresh: true,
      });

      expect(res.status).toBe('available');
      // Active pool: p1, p2, p3, p4 = 4
      // Out of stock: p3, p4 = 2
      // 2 / 4 = 50.0%
      expect(res.value).toBe(50.0);
      expect(res.metadata?.outOfStockCount).toBe(2);
      expect(res.metadata?.totalActiveCount).toBe(4);
    });
  });

  describe('Edge Case 6: Payment Failure Rate Bounds', () => {
    it('handles 100% gateway failure outage gracefully', async () => {
      const mockEvents = [
        { id: 'e1', event_type: 'PAYMENT_FAILED' },
        { id: 'e2', event_type: 'PAYMENT_FAILED' },
        { id: 'e3', event_type: 'PAYMENT_FAILED' },
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
      });

      const res = await getCanonicalMetric('payment_failure_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(res.status).toBe('available');
      expect(res.value).toBe(100.0);
      expect(res.metadata?.failedAttempts).toBe(3);
    });

    it('returns insufficient_data when no payment events occurred in window', async () => {
      mockSupabase.lte.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const res = await getCanonicalMetric('payment_failure_rate', {
        callerRole: 'staff',
        fresh: true,
      });
      expect(res.status).toBe('insufficient_data');
      expect(res.value).toBeNull();
      expect(res.sampleSize).toBe(0);
    });
  });

  describe('Edge Case 7: Asia/Kolkata Midnight Boundary Integrity', () => {
    it('guarantees that today and yesterday presets do not overlap in IST', () => {
      const today = getIstTimeWindow('today');
      const yesterday = getIstTimeWindow('yesterday');

      expect(today.timezone).toBe('Asia/Kolkata');
      expect(yesterday.timezone).toBe('Asia/Kolkata');

      // Yesterday end must be immediately before Today start
      const yesterdayEndMs = new Date(yesterday.end).getTime();
      const todayStartMs = new Date(today.start).getTime();

      expect(todayStartMs - yesterdayEndMs).toBe(1); // Exactly 1ms difference
    });
  });
});
