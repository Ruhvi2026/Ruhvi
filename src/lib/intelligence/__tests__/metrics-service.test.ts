jest.mock('server-only', () => ({}));

import {
  getCanonicalMetric,
  getBatchMetrics,
  getIstTimeWindow,
  verifyMetricsAuthorization,
  clearMetricsCache,
  MetricsAuthorizationError,
} from '../metrics-service';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Shared Read-Only Metrics Service (Phase 15)', () => {
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

  describe('getIstTimeWindow & Timezone Conventions', () => {
    it('sets timezone to Asia/Kolkata and calculates valid UTC timestamps', () => {
      const window = getIstTimeWindow('last_7_days');

      expect(window.timezone).toBe('Asia/Kolkata');
      expect(window.preset).toBe('last_7_days');
      expect(new Date(window.start).getTime()).toBeLessThan(
        new Date(window.end).getTime()
      );
    });

    it('handles custom date range cleanly', () => {
      const customWindow = getIstTimeWindow(
        'custom',
        '2026-10-01T00:00:00.000Z',
        '2026-10-15T23:59:59.999Z'
      );

      expect(customWindow.preset).toBe('custom');
      expect(customWindow.start).toBe('2026-10-01T00:00:00.000Z');
      expect(customWindow.end).toBe('2026-10-15T23:59:59.999Z');
    });
  });

  describe('verifyMetricsAuthorization & RBAC', () => {
    it('allows admin full access to financial and operational metrics', () => {
      expect(verifyMetricsAuthorization('admin', 'gross_sales')).toBe(true);
      expect(verifyMetricsAuthorization('admin', 'net_sales')).toBe(true);
      expect(verifyMetricsAuthorization('admin', 'average_order_value')).toBe(
        true
      );
      expect(verifyMetricsAuthorization('admin', 'stock_out_rate')).toBe(true);
    });

    it('blocks customers from all metrics', () => {
      expect(verifyMetricsAuthorization('customer', 'gross_sales')).toBe(false);
      expect(verifyMetricsAuthorization('customer', 'stock_out_rate')).toBe(
        false
      );
    });

    it('allows staff operational metrics but blocks financial revenue metrics', () => {
      expect(verifyMetricsAuthorization('staff', 'stock_out_rate')).toBe(true);
      expect(verifyMetricsAuthorization('staff', 'cancellation_rate')).toBe(
        true
      );
      expect(verifyMetricsAuthorization('staff', 'rto_rate')).toBe(true);

      // Financials blocked for department staff
      expect(verifyMetricsAuthorization('staff', 'gross_sales')).toBe(false);
      expect(verifyMetricsAuthorization('staff', 'net_sales')).toBe(false);
      expect(verifyMetricsAuthorization('staff', 'average_order_value')).toBe(
        false
      );
    });

    it('throws MetricsAuthorizationError when unauthorized role requests metric', async () => {
      await expect(
        getCanonicalMetric('gross_sales', { callerRole: 'staff' })
      ).rejects.toThrow(MetricsAuthorizationError);
    });
  });

  describe('Financial Metric Calculations', () => {
    it('calculates gross sales excluding pending payment attempts', async () => {
      const mockOrders = [
        { id: 'o1', total: 10000, status: 'confirmed' },
        { id: 'o2', total: 15000, status: 'delivered' },
        { id: 'o3', total: 5000, status: 'cancelled' },
        { id: 'o4', total: 8000, status: 'pending' }, // excluded
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });

      const res = await getCanonicalMetric('gross_sales', {
        callerRole: 'admin',
      });

      expect(res.status).toBe('available');
      expect(res.currency).toBe('INR');
      expect(res.unit).toBe('₹');
      expect(res.value).toBe(30000); // 10000 + 15000 + 5000
      expect(res.sampleSize).toBe(3);
    });

    it('calculates net sales excluding cancelled, returned, and RTO orders', async () => {
      const mockOrders = [
        { id: 'o1', total: 10000, status: 'delivered' },
        { id: 'o2', total: 15000, status: 'shipped' },
        { id: 'o3', total: 5000, status: 'cancelled' }, // excluded
        { id: 'o4', total: 4000, status: 'returned' }, // excluded
        { id: 'o5', total: 3000, status: 'rto_received' }, // excluded
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });

      const res = await getCanonicalMetric('net_sales', {
        callerRole: 'admin',
      });

      expect(res.status).toBe('available');
      expect(res.value).toBe(25000); // 10000 + 15000
      expect(res.sampleSize).toBe(2);
    });

    it('calculates average order value (AOV) for confirmed orders', async () => {
      const mockOrders = [
        { id: 'o1', total: 10000, status: 'confirmed' },
        { id: 'o2', total: 20000, status: 'delivered' },
        { id: 'o3', total: 9999, status: 'cancelled' }, // excluded
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });

      const res = await getCanonicalMetric('average_order_value', {
        callerRole: 'admin',
      });

      expect(res.status).toBe('available');
      expect(res.value).toBe(15000); // (10000 + 20000) / 2
      expect(res.sampleSize).toBe(2);
    });

    it('returns insufficient_data for AOV when confirmed orders count is zero', async () => {
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ id: 'o1', total: 5000, status: 'cancelled' }],
        error: null,
      });

      const res = await getCanonicalMetric('average_order_value', {
        callerRole: 'admin',
      });

      expect(res.status).toBe('insufficient_data');
      expect(res.value).toBeNull();
      expect(res.sampleSize).toBe(0);
    });
  });

  describe('Operational Metric Calculations', () => {
    it('calculates cancellation rate correctly', async () => {
      const mockOrders = [
        { id: 'o1', status: 'delivered' },
        { id: 'o2', status: 'delivered' },
        { id: 'o3', status: 'shipped' },
        { id: 'o4', status: 'cancelled' },
      ];

      mockSupabase.lte.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });

      const res = await getCanonicalMetric('cancellation_rate', {
        callerRole: 'staff',
      });

      expect(res.status).toBe('available');
      expect(res.value).toBe(25.0); // 1 out of 4 = 25%
      expect(res.unit).toBe('%');
    });

    it('calculates stock-out rate based on active catalog products', async () => {
      const mockProducts = [
        { id: 'p1', status: 'active', stock_quantity: 10 },
        { id: 'p2', status: 'active', stock_quantity: 0 }, // OOS
        { id: 'p3', status: 'active', stock_quantity: -1 }, // OOS
        { id: 'p4', status: 'active', stock_quantity: 5 },
        { id: 'p5', status: 'draft', stock_quantity: 0 }, // draft excluded
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockProducts,
        error: null,
      });

      const res = await getCanonicalMetric('stock_out_rate', {
        callerRole: 'staff',
      });

      expect(res.status).toBe('available');
      expect(res.value).toBe(50.0); // 2 out of 4 active products = 50%
      expect(res.metadata?.outOfStockCount).toBe(2);
      expect(res.metadata?.totalActiveCount).toBe(4);
    });
  });

  describe('Caching & Batch Metrics', () => {
    it('serves repeated requests from in-memory cache without duplicate DB calls', async () => {
      const mockOrders = [{ id: 'o1', total: 10000, status: 'confirmed' }];
      mockSupabase.lte.mockResolvedValueOnce({
        data: mockOrders,
        error: null,
      });

      // Call 1: fetches from DB
      const res1 = await getCanonicalMetric('gross_sales', {
        callerRole: 'admin',
      });
      expect(res1.value).toBe(10000);
      expect(mockSupabase.lte).toHaveBeenCalledTimes(1);

      // Call 2: served from cache
      const res2 = await getCanonicalMetric('gross_sales', {
        callerRole: 'admin',
      });
      expect(res2.value).toBe(10000);
      // DB call count remains 1
      expect(mockSupabase.lte).toHaveBeenCalledTimes(1);
    });

    it('retrieves batch of multiple metrics cleanly', async () => {
      mockSupabase.lte
        .mockResolvedValueOnce({
          data: [{ id: 'o1', total: 12000, status: 'confirmed' }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'o1', status: 'cancelled' }],
          error: null,
        });

      const batch = await getBatchMetrics(
        ['gross_sales', 'cancellation_rate'],
        {
          callerRole: 'admin',
        }
      );

      expect(batch.gross_sales.value).toBe(12000);
      expect(batch.cancellation_rate.value).toBe(100);
    });
  });
});
