import {
  getCanonicalMetric,
  clearMetricsCache,
  isSyntheticOrTestOrder,
  fetchOrdersPaginated,
  NON_NET_SALES_STATUSES,
  NON_PAID_COD_STATUSES,
  getIstTimeWindow,
} from '../metrics-service';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Financial Metrics Audit Hardening (P1.5)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    clearMetricsCache();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Synthetic & Test Order Isolation', () => {
    it('correctly detects and flags synthetic QA and test orders', () => {
      expect(isSyntheticOrTestOrder({ is_test: true })).toBe(true);
      expect(isSyntheticOrTestOrder({ is_test: 'true' })).toBe(true);
      expect(
        isSyntheticOrTestOrder({ status: 'cancelled_synthetic_test' })
      ).toBe(true);
      expect(
        isSyntheticOrTestOrder({ payment_method: 'synthetic_test_sandbox' })
      ).toBe(true);
      expect(isSyntheticOrTestOrder({ order_number: 'SYNTH_ORD_12345' })).toBe(
        true
      );
      expect(isSyntheticOrTestOrder({ user_id: 'usr_synth_qa_999' })).toBe(
        true
      );

      // Real production order
      expect(
        isSyntheticOrTestOrder({
          id: 'ord_real_01',
          order_number: 'RUHVI-2026-001',
          user_id: 'usr_customer_88',
          status: 'confirmed',
          is_test: false,
        })
      ).toBe(false);
    });

    it('excludes synthetic orders from gross sales calculations and reports in metadata', async () => {
      const ordersWithSynthetic = [
        { id: 'o1', total: 10000, status: 'confirmed', is_test: false },
        { id: 'o2', total: 20000, status: 'delivered', is_test: false },
        { id: 'o_synth_1', total: 99999, status: 'confirmed', is_test: true },
        {
          id: 'o_synth_2',
          total: 50000,
          status: 'delivered',
          order_number: 'SYNTH_ORD_TEST',
        },
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: ordersWithSynthetic,
        error: null,
      });

      const res = await getCanonicalMetric('gross_sales', {
        callerRole: 'admin',
        fresh: true,
      });

      expect(res.status).toBe('available');
      expect(res.value).toBe(30000); // 10000 + 20000 only
      expect(res.metadata?.testOrdersExcludedCount).toBe(2);
    });
  });

  describe('Net Sales Under-Exclusion Fixes', () => {
    it('excludes delivery_failed, rto_initiated, return_requested, and refunded orders from net sales', async () => {
      const orders = [
        // Valid realized sales:
        {
          id: 'o_deliv',
          total: 12000,
          status: 'delivered',
          payment_status: 'paid',
        },
        {
          id: 'o_shipped',
          total: 18000,
          status: 'shipped',
          payment_status: 'paid',
        },
        // Contested or non-realized statuses that should be excluded:
        {
          id: 'o_fail',
          total: 5000,
          status: 'delivery_failed',
          payment_status: 'pending',
        },
        {
          id: 'o_rto_init',
          total: 6000,
          status: 'rto_initiated',
          payment_status: 'pending',
        },
        {
          id: 'o_ret_req',
          total: 7000,
          status: 'return_requested',
          payment_status: 'paid',
        },
        {
          id: 'o_ret_app',
          total: 8000,
          status: 'return_approved',
          payment_status: 'paid',
        },
        {
          id: 'o_ref',
          total: 9000,
          status: 'refunded',
          payment_status: 'refunded',
        },
        {
          id: 'o_ref_status',
          total: 4000,
          status: 'delivered',
          payment_status: 'refunded',
        },
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: orders,
        error: null,
      });

      const res = await getCanonicalMetric('net_sales', {
        callerRole: 'admin',
        fresh: true,
      });

      expect(res.status).toBe('available');
      // Only o_deliv (12000) + o_shipped (18000) = 30000
      expect(res.value).toBe(30000);
      expect(res.sampleSize).toBe(2);
      expect(res.metadata?.excludedNonNetCount).toBe(6);
    });
  });

  describe('COD Status Qualification in paid_orders_count', () => {
    it('disqualifies failed, RTO, and refunded COD orders from paid_orders_count', async () => {
      const orders = [
        // Pure COD in transit / confirmed -> Counted with in-transit tag
        {
          id: 'c1',
          payment_method: 'cod',
          status: 'shipped',
          payment_status: 'pending',
        },
        // Pure COD delivered -> Counted with settled tag
        {
          id: 'c2',
          payment_method: 'cod',
          status: 'delivered',
          payment_status: 'paid',
        },
        // Pure COD delivery failed -> EXCLUDED
        {
          id: 'c3',
          payment_method: 'cod',
          status: 'delivery_failed',
          payment_status: 'pending',
        },
        // Pure COD RTO initiated -> EXCLUDED
        {
          id: 'c4',
          payment_method: 'cod',
          status: 'rto_initiated',
          payment_status: 'pending',
        },
        // Pure COD returned -> EXCLUDED
        {
          id: 'c5',
          payment_method: 'cod',
          status: 'returned',
          payment_status: 'pending',
        },
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: orders,
        error: null,
      });

      const res = await getCanonicalMetric('paid_orders_count', {
        callerRole: 'admin',
        fresh: true,
      });

      expect(res.status).toBe('available');
      expect(res.value).toBe(2); // c1 + c2
      expect(res.metadata?.codSettledCount).toBe(1);
      expect(res.metadata?.codInTransitCount).toBe(1);
      expect(res.metadata?.codCommittedCount).toBe(2);
    });
  });

  describe('PostgREST Pagination across row limit', () => {
    it('paginates in batches using range() when client supports it', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `p1_${i}`,
        total: 100,
        status: 'confirmed',
      }));
      const page2 = Array.from({ length: 250 }, (_, i) => ({
        id: `p2_${i}`,
        total: 100,
        status: 'confirmed',
      }));

      let callCount = 0;
      const paginatingClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        range: jest.fn().mockImplementation((from: number, to: number) => {
          callCount++;
          if (from === 0) {
            return Promise.resolve({ data: page1, error: null });
          } else {
            return Promise.resolve({ data: page2, error: null });
          }
        }),
      };

      const timeWindow = getIstTimeWindow('last_30_days');
      const { data, error } = await fetchOrdersPaginated(
        paginatingClient,
        'id, total, status',
        timeWindow,
        1000
      );

      expect(error).toBeNull();
      expect(data?.length).toBe(1250);
      expect(callCount).toBe(2);
    });
  });
});
