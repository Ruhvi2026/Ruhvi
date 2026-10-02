jest.mock('server-only', () => ({}));

import {
  resolveTimeRange,
  calculateComparison,
  getStoreAnalytics,
} from '../analytics';
import { executeCoFounderTool } from '../tool-bridge';

// In-memory mock storage for orders, products, and support tickets
const mockOrders: any[] = [];
const mockProducts: any[] = [];
const mockSupportTickets: any[] = [];
const mockOrderItems: any[] = [];

// Mock getServiceClient
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn(function (this: any, col: string, val: any) {
            this._gte = { col, val };
            return this;
          }),
          lte: jest.fn(function (this: any, col: string, val: any) {
            this._lte = { col, val };
            return this;
          }),
          order: jest.fn().mockReturnThis(),
          then: jest.fn(function (this: any, resolve: any) {
            let res = [...mockOrders];
            if (this._gte) {
              const gteDate = new Date(this._gte.val).getTime();
              res = res.filter(
                (o) => new Date(o.created_at).getTime() >= gteDate
              );
            }
            if (this._lte) {
              const lteDate = new Date(this._lte.val).getTime();
              res = res.filter(
                (o) => new Date(o.created_at).getTime() <= lteDate
              );
            }
            return resolve({ data: res, error: null });
          }),
        };
      }
      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve: any) =>
            resolve({ data: mockProducts, error: null })
          ),
        };
      }
      if (table === 'support_tickets') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          then: jest.fn((resolve: any) =>
            resolve({ data: mockSupportTickets, error: null })
          ),
        };
      }
      if (table === 'order_items') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          then: jest.fn((resolve: any) =>
            resolve({ data: mockOrderItems, error: null })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
      };
    }),
  })),
}));

describe('Stage 4 — Analytics & Business Intelligence Engine', () => {
  beforeEach(() => {
    mockOrders.length = 0;
    mockProducts.length = 0;
    mockSupportTickets.length = 0;
    mockOrderItems.length = 0;
  });

  describe('Time Window & Normalization', () => {
    it('resolves rolling date ranges with matching baseline periods', () => {
      const { current, baseline } = resolveTimeRange('7d');
      expect(current.label).toBe('Last 7 days');
      expect(baseline.label).toBe('Previous 7 days');
      expect(new Date(current.from).getTime()).toBeGreaterThan(
        new Date(baseline.from).getTime()
      );
    });

    it('resolves month and today windows properly', () => {
      const todayRange = resolveTimeRange('today');
      expect(todayRange.current.label).toBe('Today');
      expect(todayRange.baseline.label).toBe('Yesterday');

      const monthRange = resolveTimeRange('this_month');
      expect(monthRange.current.label).toBe('This Month');
      expect(monthRange.baseline.label).toBe('Last Month');
    });
  });

  describe('KPI & Comparison Logic', () => {
    it('calculates trend and percentage change correctly', () => {
      const comparison = calculateComparison(150000, 100000, 25);
      expect(comparison.absoluteChange).toBe(50000);
      expect(comparison.percentageChange).toBe(50);
      expect(comparison.trend).toBe('increasing');
      expect(comparison.isAnomaly).toBe(true);
      expect(comparison.anomalyConfidence).toBe('possible');
    });

    it('identifies confirmed anomaly with large sample size', () => {
      const compLarge = calculateComparison(200000, 100000, 35);
      expect(compLarge.isAnomaly).toBe(true);
      expect(compLarge.anomalyConfidence).toBe('confirmed');
    });

    it('flags insufficient data when sample size is low', () => {
      const compSmall = calculateComparison(50000, 20000, 4);
      expect(compSmall.anomalyConfidence).toBe('insufficient_data');
    });
  });

  describe('Analytics Report Generation', () => {
    it('generates report with real order aggregations and cross-dataset observations', async () => {
      const now = new Date();
      // Add mock orders in current window
      mockOrders.push(
        {
          id: 'ord-1',
          order_number: 'RHV-1001',
          total: 8000,
          status: 'delivered',
          payment_status: 'paid',
          payment_method: 'phonepe',
          created_at: now.toISOString(),
        },
        {
          id: 'ord-2',
          order_number: 'RHV-1002',
          total: 4000,
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'cod',
          created_at: now.toISOString(),
        },
        {
          id: 'ord-3',
          order_number: 'RHV-1003',
          total: 2000,
          status: 'cancelled',
          payment_status: 'failed',
          payment_method: 'cod',
          created_at: now.toISOString(),
        }
      );

      mockProducts.push({
        id: 'prod-1',
        name: 'Royal Heritage Kundan Necklace',
        sku: 'RHKN-01',
        stock_quantity: 2,
        status: 'active',
      });

      mockSupportTickets.push({
        id: 'tick-1',
        status: 'open',
        priority: 'urgent',
        created_at: now.toISOString(),
      });

      const report = await getStoreAnalytics({ timeframe: '7d' });

      // Financials
      expect(report.kpis.totalRevenue).toBe(14000);
      expect(report.kpis.netRevenue).toBe(12000); // 14000 - 2000 cancelled
      expect(report.kpis.totalOrders).toBe(3);
      expect(report.kpis.cancelledOrders).toBe(1);
      expect(report.kpis.cancellationRate).toBe(33.3);
      expect(report.kpis.aov).toBe(6000); // 12000 / 2 valid orders

      // Cross dataset observations
      expect(report.kpis.urgentTicketsCount).toBe(1);
      expect(report.insights.crossDatasetObservations.length).toBeGreaterThan(
        0
      );
      expect(report.insights.crossDatasetObservations[0]).toContain(
        'urgent/high priority'
      );

      // Voice summary brevity check (1-3 conversational sentences)
      expect(report.insights.executiveVoiceSummary).toContain(
        'net revenue is ₹12,000'
      );
      expect(
        report.insights.executiveVoiceSummary.split('.').length
      ).toBeLessThanOrEqual(5);

      // Text structured summary
      expect(
        report.insights.structuredTextSummary.length
      ).toBeGreaterThanOrEqual(4);
    });

    it('gracefully handles empty store state without crashing', async () => {
      const report = await getStoreAnalytics({ timeframe: 'today' });
      expect(report.kpis.totalOrders).toBe(0);
      expect(report.kpis.netRevenue).toBe(0);
      expect(report.kpis.aov).toBe(0);
      expect(report.kpis.cancellationRate).toBe(0);
      expect(report.insights.executiveVoiceSummary).toContain(
        'net revenue is ₹0 across 0 orders'
      );
    });
  });

  describe('Tool Bridge Integration & Security', () => {
    it('executes get_sales_analytics through executeCoFounderTool with permission', async () => {
      const result = await executeCoFounderTool(
        'get_sales_analytics',
        { timeframe: '30d' },
        ['analytics:read']
      );

      expect(result.success).toBe(true);
      expect(result.data.kpis).toBeDefined();
      expect(result.summaryForVoice).toBeDefined();
    });

    it('blocks execution when user lacks analytics scope', async () => {
      const result = await executeCoFounderTool(
        'get_sales_analytics',
        { timeframe: '30d' },
        ['orders:read'] // Missing analytics:read
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});
