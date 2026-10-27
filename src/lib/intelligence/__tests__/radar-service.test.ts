jest.mock('server-only', () => ({}));

import {
  getBusinessRadarSummary,
  calculateMetricSeverity,
  calculateComparisonTrend,
  getPreviousTimeWindow,
} from '../radar-service';
import {
  getCanonicalMetric,
  getIstTimeWindow,
  clearMetricsCache,
} from '../metrics-service';

jest.mock('../metrics-service', () => {
  const actual = jest.requireActual('../metrics-service');
  return {
    ...actual,
    getCanonicalMetric: jest.fn(),
  };
});

describe('Business Radar Aggregation Service (Phase 17)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMetricsCache();
  });

  describe('calculateMetricSeverity', () => {
    it('accurately evaluates operational severity against documented thresholds', () => {
      // Cancellation rate thresholds: warning = 10%, critical = 15%
      expect(
        calculateMetricSeverity('cancellation_rate', 16.5, 'available')
      ).toBe('critical');
      expect(
        calculateMetricSeverity('cancellation_rate', 12.0, 'available')
      ).toBe('warning');
      expect(
        calculateMetricSeverity('cancellation_rate', 6.0, 'available')
      ).toBe('healthy');

      // Payment failure rate thresholds: warning = 10%, critical = 20%
      expect(
        calculateMetricSeverity('payment_failure_rate', 22.0, 'available')
      ).toBe('critical');
      expect(
        calculateMetricSeverity('payment_failure_rate', 14.0, 'available')
      ).toBe('warning');
      expect(
        calculateMetricSeverity('payment_failure_rate', 2.0, 'available')
      ).toBe('healthy');

      // Stock-out rate thresholds: warning = 10%, critical = 20%
      expect(calculateMetricSeverity('stock_out_rate', 25.0, 'available')).toBe(
        'critical'
      );
      expect(calculateMetricSeverity('stock_out_rate', 15.0, 'available')).toBe(
        'warning'
      );
      expect(calculateMetricSeverity('stock_out_rate', 4.0, 'available')).toBe(
        'healthy'
      );

      // Null or insufficient data
      expect(
        calculateMetricSeverity('cancellation_rate', null, 'insufficient_data')
      ).toBe('insufficient_data');
      expect(calculateMetricSeverity('gross_sales', null, 'unavailable')).toBe(
        'insufficient_data'
      );
    });
  });

  describe('calculateComparisonTrend', () => {
    it('computes delta and direction of change correctly', () => {
      // Sales: up is improving
      const salesTrend = calculateComparisonTrend('gross_sales', 50000, 40000);
      expect(salesTrend.delta).toBe(10000);
      expect(salesTrend.pctChange).toBe(25.0);
      expect(salesTrend.direction).toBe('up');
      expect(salesTrend.trendQuality).toBe('improving');

      // Cancellation rate: up is deteriorating
      const cancTrend = calculateComparisonTrend(
        'cancellation_rate',
        15.0,
        10.0
      );
      expect(cancTrend.delta).toBe(5.0);
      expect(cancTrend.direction).toBe('up');
      expect(cancTrend.trendQuality).toBe('deteriorating');

      // Cancellation rate: down is improving
      const cancDown = calculateComparisonTrend('cancellation_rate', 8.0, 12.0);
      expect(cancDown.delta).toBe(-4.0);
      expect(cancDown.direction).toBe('down');
      expect(cancDown.trendQuality).toBe('improving');

      // Unknown when either value is null
      const unknownTrend = calculateComparisonTrend('gross_sales', 50000, null);
      expect(unknownTrend.direction).toBe('unknown');
      expect(unknownTrend.trendQuality).toBe('unknown');
    });
  });

  describe('getPreviousTimeWindow', () => {
    it('computes exact equivalent duration preceding the current window', () => {
      const current = getIstTimeWindow('last_7_days');
      const previous = getPreviousTimeWindow(current);

      const currentDuration =
        new Date(current.end).getTime() - new Date(current.start).getTime();
      const previousDuration =
        new Date(previous.end).getTime() - new Date(previous.start).getTime();

      expect(Math.abs(currentDuration - previousDuration)).toBeLessThanOrEqual(
        1000
      );
      expect(new Date(previous.end).getTime()).toBeLessThan(
        new Date(current.start).getTime()
      );
    });
  });

  describe('getBusinessRadarSummary - RBAC & Aggregation', () => {
    it('returns full departmental sections for admin role', async () => {
      (getCanonicalMetric as jest.Mock).mockImplementation(
        async (metric: string) => {
          const healthyValues: Record<string, number> = {
            gross_sales: 100000,
            net_sales: 90000,
            average_order_value: 5000,
            paid_orders_count: 20,
            cancellation_rate: 3.0,
            rto_rate: 4.0,
            return_rate: 2.0,
            stock_out_rate: 5.0,
            payment_failure_rate: 1.5,
          };
          return {
            metric,
            value: healthyValues[metric] ?? 50,
            status: 'available',
            calculatedAt: new Date().toISOString(),
            timeWindow: getIstTimeWindow('last_7_days'),
          };
        }
      );

      const summary = await getBusinessRadarSummary('admin', {
        preset: 'last_7_days',
      });

      expect(summary.callerRole).toBe('admin');
      expect(summary.overallHealth).toBe('healthy');
      // Admin receives all sections
      expect(summary.sections.financial).toBeDefined();
      expect(summary.sections.operations).toBeDefined();
      expect(summary.sections.inventory).toBeDefined();
      expect(summary.sections.infrastructure).toBeDefined();
    });

    it('partitions financial section away from staff role', async () => {
      (getCanonicalMetric as jest.Mock).mockImplementation(
        async (metric: string) => ({
          metric,
          value: 5.0,
          status: 'available',
          calculatedAt: new Date().toISOString(),
          timeWindow: getIstTimeWindow('last_7_days'),
        })
      );

      const summary = await getBusinessRadarSummary('staff', {
        preset: 'last_7_days',
      });

      expect(summary.callerRole).toBe('staff');
      // Financial section MUST NOT be visible to staff
      expect(summary.sections.financial).toBeUndefined();
      // Operations and inventory are permitted
      expect(summary.sections.operations).toBeDefined();
      expect(summary.sections.inventory).toBeDefined();
    });

    it('evaluates overall health to critical when any metric breaches critical threshold', async () => {
      (getCanonicalMetric as jest.Mock).mockImplementation(
        async (metric: string) => {
          if (metric === 'cancellation_rate') {
            return {
              metric,
              value: 18.0, // Critical threshold is 15%
              status: 'available',
              calculatedAt: new Date().toISOString(),
              timeWindow: getIstTimeWindow('last_7_days'),
            };
          }
          return {
            metric,
            value: 2.0,
            status: 'available',
            calculatedAt: new Date().toISOString(),
            timeWindow: getIstTimeWindow('last_7_days'),
          };
        }
      );

      const summary = await getBusinessRadarSummary('admin', {
        preset: 'last_7_days',
      });

      expect(summary.overallHealth).toBe('critical');
      expect(summary.anomaliesDetectedCount).toBeGreaterThanOrEqual(1);
      expect(summary.sections.operations?.cancellation_rate.severity).toBe(
        'critical'
      );
    });

    it('handles empty datasets cleanly with insufficient_data severity', async () => {
      (getCanonicalMetric as jest.Mock).mockImplementation(
        async (metric: string) => ({
          metric,
          value: null,
          status: 'insufficient_data',
          calculatedAt: new Date().toISOString(),
          timeWindow: getIstTimeWindow('last_7_days'),
        })
      );

      const summary = await getBusinessRadarSummary('admin', {
        preset: 'last_7_days',
      });

      expect(summary.overallHealth).toBe('healthy');
      expect(summary.sections.operations?.cancellation_rate.severity).toBe(
        'insufficient_data'
      );
      expect(summary.sections.operations?.cancellation_rate.direction).toBe(
        'unknown'
      );
    });
  });
});
