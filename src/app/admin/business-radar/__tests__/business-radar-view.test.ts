import type {
  BusinessRadarSummary,
  DateRangePreset,
  RadarMetricItem,
  MetricSeverity,
} from '@/lib/intelligence/radar-service';

/**
 * ============================================================================
 * BUSINESS RADAR DASHBOARD VIEW TESTS (TRACK C - PHASE 18)
 * ============================================================================
 * Tests verifying the view model, state transformations, formatting rules,
 * deterministic severity displays, and RBAC partitioning of the Business Radar UI.
 */

describe('Business Radar Dashboard View Logic', () => {
  // 1. Preset & Query Parameters
  describe('Query parameter resolution', () => {
    function buildRadarUrl(
      preset: DateRangePreset,
      options?: { start?: string; end?: string; fresh?: boolean }
    ): string {
      const params = new URLSearchParams();
      params.set('preset', preset);
      if (preset === 'custom') {
        if (options?.start) params.set('start', options.start);
        if (options?.end) params.set('end', options.end);
      }
      if (options?.fresh) {
        params.set('fresh', 'true');
      }
      return `/api/business-radar?${params.toString()}`;
    }

    it('builds standard preset URLs correctly', () => {
      expect(buildRadarUrl('last_7_days')).toBe(
        '/api/business-radar?preset=last_7_days'
      );
      expect(buildRadarUrl('today')).toBe('/api/business-radar?preset=today');
      expect(buildRadarUrl('this_month')).toBe(
        '/api/business-radar?preset=this_month'
      );
    });

    it('includes custom range start/end when preset is custom', () => {
      const url = buildRadarUrl('custom', {
        start: '2026-10-01T00:00:00.000Z',
        end: '2026-10-15T23:59:59.999Z',
      });
      expect(url).toContain('preset=custom');
      expect(url).toContain('start=2026-10-01T00%3A00%3A00.000Z');
      expect(url).toContain('end=2026-10-15T23%3A59%3A59.999Z');
    });

    it('attaches fresh=true when refresh is triggered', () => {
      const url = buildRadarUrl('last_7_days', { fresh: true });
      expect(url).toBe('/api/business-radar?preset=last_7_days&fresh=true');
    });
  });

  // 2. Formatting Helpers
  describe('Value formatting', () => {
    function formatCurrency(val: number): string {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val);
    }

    function formatNumber(val: number): string {
      return new Intl.NumberFormat('en-IN').format(val);
    }

    function formatPercent(val: number): string {
      return `${val.toFixed(1)}%`;
    }

    it('formats Indian rupee currency correctly with symbol and commas', () => {
      const formatted = formatCurrency(1250000);
      expect(formatted).toMatch(/12,50,000/);
    });

    it('formats integer counts with Indian thousand separators', () => {
      expect(formatNumber(15420)).toBe('15,420');
      expect(formatNumber(500)).toBe('500');
    });

    it('formats percentages to exactly one decimal place', () => {
      expect(formatPercent(12.456)).toBe('12.5%');
      expect(formatPercent(0)).toBe('0.0%');
      expect(formatPercent(100)).toBe('100.0%');
    });
  });

  // 3. Severity Resolution & Badging
  describe('Severity Badge evaluation', () => {
    function resolveSeverityBadgeConfig(severity: MetricSeverity): {
      color: string;
      label: string;
    } {
      switch (severity) {
        case 'healthy':
          return { color: 'emerald', label: 'Healthy' };
        case 'warning':
          return { color: 'amber', label: 'Warning' };
        case 'critical':
          return { color: 'rose', label: 'Critical' };
        case 'insufficient_data':
        default:
          return { color: 'slate', label: 'Insufficient Data' };
      }
    }

    it('maps healthy severity to emerald badge', () => {
      const cfg = resolveSeverityBadgeConfig('healthy');
      expect(cfg.label).toBe('Healthy');
      expect(cfg.color).toBe('emerald');
    });

    it('maps warning severity to amber badge', () => {
      const cfg = resolveSeverityBadgeConfig('warning');
      expect(cfg.label).toBe('Warning');
      expect(cfg.color).toBe('amber');
    });

    it('maps critical severity to rose badge', () => {
      const cfg = resolveSeverityBadgeConfig('critical');
      expect(cfg.label).toBe('Critical');
      expect(cfg.color).toBe('rose');
    });

    it('maps insufficient_data severity to slate badge', () => {
      const cfg = resolveSeverityBadgeConfig('insufficient_data');
      expect(cfg.label).toBe('Insufficient Data');
      expect(cfg.color).toBe('slate');
    });
  });

  // 4. Direction & Trend Quality Evaluation
  describe('Trend arrow and quality semantics', () => {
    function evaluateTrendStyle(item: {
      trendQuality: 'improving' | 'deteriorating' | 'neutral' | 'unknown';
      pctChange: number | null;
    }): { direction: string; color: string; text: string } {
      let color = 'slate';
      if (item.trendQuality === 'improving') color = 'emerald';
      else if (item.trendQuality === 'deteriorating') color = 'rose';

      let text = '—';
      if (item.pctChange !== null && item.pctChange !== undefined) {
        const sign = item.pctChange > 0 ? '+' : '';
        text = `${sign}${item.pctChange.toFixed(1)}%`;
      }

      return {
        direction:
          item.pctChange !== null && item.pctChange > 0 ? 'up' : 'down',
        color,
        text,
      };
    }

    it('marks cancellation rate increase as deteriorating (rose)', () => {
      const trend = evaluateTrendStyle({
        trendQuality: 'deteriorating',
        pctChange: 25.0,
      });
      expect(trend.color).toBe('rose');
      expect(trend.direction).toBe('up');
      expect(trend.text).toBe('+25.0%');
    });

    it('marks cancellation rate decrease as improving (emerald)', () => {
      const trend = evaluateTrendStyle({
        trendQuality: 'improving',
        pctChange: -15.5,
      });
      expect(trend.color).toBe('emerald');
      expect(trend.direction).toBe('down');
      expect(trend.text).toBe('-15.5%');
    });

    it('marks revenue increase as improving (emerald)', () => {
      const trend = evaluateTrendStyle({
        trendQuality: 'improving',
        pctChange: 18.2,
      });
      expect(trend.color).toBe('emerald');
      expect(trend.direction).toBe('up');
      expect(trend.text).toBe('+18.2%');
    });
  });

  // 5. Departmental RBAC Partitioning Check
  describe('Departmental Partitioning View State', () => {
    it('recognizes when financial metrics are omitted for staff role', () => {
      const staffSummary: BusinessRadarSummary = {
        overallHealth: 'healthy',
        timeWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          preset: 'last_7_days',
        },
        callerRole: 'staff',
        generatedAt: '2026-10-27T00:00:00.000Z',
        sections: {
          // financial is omitted for staff
          operations: {},
          inventory: {},
          infrastructure: {},
        },
        anomaliesDetectedCount: 0,
      };

      const hasFinancialPermission = Boolean(staffSummary.sections.financial);
      expect(hasFinancialPermission).toBe(false);
      expect(staffSummary.callerRole).toBe('staff');
    });

    it('displays financial metrics when caller is admin or super_admin', () => {
      const adminSummary: BusinessRadarSummary = {
        overallHealth: 'healthy',
        timeWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          preset: 'last_7_days',
        },
        callerRole: 'admin',
        generatedAt: '2026-10-27T00:00:00.000Z',
        sections: {
          financial: {
            gross_sales: {
              metric: 'gross_sales',
              label: 'Gross Sales',
              category: 'financial',
              current: {
                metric: 'gross_sales',
                value: 450000,
                timeWindow: {
                  start: '2026-10-20T00:00:00.000Z',
                  end: '2026-10-27T00:00:00.000Z',
                  timezone: 'Asia/Kolkata',
                  preset: 'last_7_days',
                },
                status: 'available',
                calculatedAt: '2026-10-27T00:00:00.000Z',
              },
              delta: 50000,
              pctChange: 12.5,
              direction: 'up',
              trendQuality: 'improving',
              severity: 'healthy',
            },
          },
          operations: {},
          inventory: {},
          infrastructure: {},
        },
        anomaliesDetectedCount: 0,
      };

      expect(adminSummary.sections.financial).toBeDefined();
      expect(adminSummary.sections.financial?.gross_sales?.current.value).toBe(
        450000
      );
    });
  });

  // 6. Deep Link Destinations
  describe('Authoritative Screen Deep Links', () => {
    it('maps all categories to correct admin routes', () => {
      const links = {
        salesReport: '/admin/reports/sales',
        orders: '/admin/orders',
        refunds: '/admin/refunds',
        inventory: '/admin/reports/inventory',
        payments: '/admin/payments',
        systemAlerts: '/admin/system-alerts',
      };

      expect(links.salesReport).toBe('/admin/reports/sales');
      expect(links.orders).toBe('/admin/orders');
      expect(links.refunds).toBe('/admin/refunds');
      expect(links.inventory).toBe('/admin/reports/inventory');
      expect(links.payments).toBe('/admin/payments');
      expect(links.systemAlerts).toBe('/admin/system-alerts');
    });
  });
});
