jest.mock('server-only', () => ({}));

import { assembleCoFounderContext } from '../co-founder-context';
import { getServiceClient } from '@/lib/supabase/service';
import { getCanonicalMetric } from '../metrics-service';
import { getAnomalyLifecycleRegistry } from '../anomaly-lifecycle';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('../metrics-service', () => {
  const actual = jest.requireActual('../metrics-service');
  return {
    ...actual,
    getCanonicalMetric: jest.fn(),
  };
});

describe('AI Co-Founder Context Assembler (Track E - Phase 26)', () => {
  const mockedGetServiceClient = getServiceClient as jest.Mock;
  const mockedGetCanonicalMetric = getCanonicalMetric as jest.Mock;
  const registry = getAnomalyLifecycleRegistry();

  const buildMockSupabase = (overrides?: {
    products?: { data: any[] | null; error: any };
    orders?: { data: any[] | null; error: any };
    aiDiagnostics?: { data: any[] | null; error: any };
  }) => {
    const productsResult = overrides?.products ?? {
      data: [
        { id: 'prod_1', status: 'active', stock_quantity: 10 },
        { id: 'prod_2', status: 'active', stock_quantity: 2 }, // low stock
        { id: 'prod_3', status: 'active', stock_quantity: 0 }, // out of stock
        { id: 'prod_4', status: 'draft', stock_quantity: 5 }, // inactive
      ],
      error: null,
    };

    const ordersResult = overrides?.orders ?? {
      data: [
        {
          id: 'ord_1',
          status: 'delivered',
          created_at: '2026-10-25T10:00:00.000Z',
        },
        {
          id: 'ord_2',
          status: 'shipped',
          created_at: '2026-10-25T11:00:00.000Z',
        },
        {
          id: 'ord_3',
          status: 'cancelled',
          created_at: '2026-10-25T12:00:00.000Z',
        },
        {
          id: 'ord_4',
          status: 'returned',
          created_at: '2026-10-25T13:00:00.000Z',
        },
      ],
      error: null,
    };

    const aiDiagResult = overrides?.aiDiagnostics ?? {
      data: [
        { id: 'diag_1', created_at: '2026-10-25T09:00:00.000Z' },
        { id: 'diag_2', created_at: '2026-10-25T09:30:00.000Z' },
      ],
      error: null,
    };

    return {
      from: jest.fn((table: string) => {
        if (table === 'products') {
          return {
            select: jest
              .fn()
              .mockImplementation(() =>
                productsResult.error
                  ? Promise.reject(new Error(productsResult.error.message))
                  : Promise.resolve(productsResult)
              ),
          };
        }
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest
                  .fn()
                  .mockImplementation(() =>
                    ordersResult.error
                      ? Promise.reject(new Error(ordersResult.error.message))
                      : Promise.resolve(ordersResult)
                  ),
              }),
            }),
          };
        }
        if (table === 'ai_failure_diagnostics') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest
                  .fn()
                  .mockImplementation(() =>
                    aiDiagResult.error
                      ? Promise.reject(new Error(aiDiagResult.error.message))
                      : Promise.resolve(aiDiagResult)
                  ),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    registry.clear();

    mockedGetServiceClient.mockReturnValue(buildMockSupabase());

    // Default mock canonical metrics responses
    mockedGetCanonicalMetric.mockImplementation(async (metric: string) => {
      switch (metric) {
        case 'gross_sales':
          return {
            metric: 'gross_sales',
            value: 150000,
            status: 'available',
            currency: 'INR',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'net_sales':
          return {
            metric: 'net_sales',
            value: 135000,
            status: 'available',
            currency: 'INR',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'average_order_value':
          return {
            metric: 'average_order_value',
            value: 4500,
            status: 'available',
            currency: 'INR',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'cancellation_rate':
          return {
            metric: 'cancellation_rate',
            value: 5.5,
            status: 'available',
            unit: '%',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'rto_rate':
          return {
            metric: 'rto_rate',
            value: 3.2,
            status: 'available',
            unit: '%',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'return_rate':
          return {
            metric: 'return_rate',
            value: 4.1,
            status: 'available',
            unit: '%',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'stock_out_rate':
          return {
            metric: 'stock_out_rate',
            value: 12.0,
            status: 'available',
            unit: '%',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'payment_failure_rate':
          return {
            metric: 'payment_failure_rate',
            value: 6.8,
            status: 'available',
            unit: '%',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        case 'paid_orders_count':
          return {
            metric: 'paid_orders_count',
            value: 30,
            status: 'available',
            unit: 'count',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
        default:
          return {
            metric,
            value: null,
            status: 'insufficient_data',
            calculatedAt: '2026-10-26T12:00:00.000Z',
          };
      }
    });

    // Seed sample active anomaly in registry
    registry.reconcileWithScan(
      [
        {
          id: 'anom_payment_spike',
          ruleId: 'rule_payment_failure_spike',
          ruleName: 'Payment Gateway Failure Rate Spike',
          severity: 'critical',
          category: 'infrastructure',
          priority: 'critical',
          metric: 'payment_failure_rate',
          condition: 'gt',
          actualValue: 25.0,
          thresholdValue: 20.0,
          sampleSize: { count: 40 },
          minSampleRequired: 10,
          observationWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          explanation: 'Payment failure rate surged to 25% on PhonePe gateway.',
          recommendation: {
            id: 'rec_pay_fail_1',
            title: 'Audit Payment Gateway Health',
            category: 'infrastructure',
            priority: 'critical',
            evidenceType: 'deterministic_rule',
            supportingMetrics: [
              {
                metric: 'payment_failure_rate',
                value: 25.0,
                source: 'supabase:payment_transactions',
                timeWindow: {
                  start: '2026-10-20T00:00:00.000Z',
                  end: '2026-10-27T00:00:00.000Z',
                  timeZone: 'Asia/Kolkata',
                },
              },
            ],
            observationWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timeZone: 'Asia/Kolkata',
            },
            explanation:
              'Payment failure rate surged to 25% on PhonePe gateway.',
            uncertaintyBasis: {
              confidence: 0.95,
              confidenceReason: 'Authoritative transaction ledger calculation',
              assumptions: ['PhonePe webhooks functioning'],
              riskFactors: [],
            },
            suggestedNextStep: {
              actionTitle: 'Inspect Gateway Status',
              actionType: 'investigation',
              safeDeepLink: '/admin/payments',
              requiresApproval: true,
            },
            reviewState: 'pending_review',
            createdAt: '2026-10-26T12:00:00.000Z',
            expiresAt: '2026-10-28T12:00:00.000Z',
          },
          detectedAt: '2026-10-26T12:00:00.000Z',
        },
      ],
      { evaluatedRuleIds: ['rule_payment_failure_spike'] }
    );
  });

  // 1. Role-Aware RBAC Boundaries
  describe('Role-Aware RBAC & Authorization', () => {
    it('completely redacts financial metrics for staff callers', async () => {
      const context = await assembleCoFounderContext({ callerRole: 'staff' });

      expect(context.callerRole).toBe('staff');
      expect(context.privacyGuarantees.financialAccessGranted).toBe(false);
      expect(context.financialMetrics).toHaveLength(0);
      expect(context.promptContextMarkdown).not.toContain(
        '#### 1. Financial Performance'
      );
      expect(context.promptContextMarkdown).not.toContain('Gross Sales');
      expect(context.promptContextMarkdown).not.toContain('Net Sales');

      // Staff still receives operational and inventory metrics
      expect(context.operationalMetrics.length).toBeGreaterThan(0);
      expect(context.inventorySignals.status).toBe('available');
    });

    it('includes financial metrics for manager callers', async () => {
      const context = await assembleCoFounderContext({ callerRole: 'manager' });

      expect(context.callerRole).toBe('manager');
      expect(context.privacyGuarantees.financialAccessGranted).toBe(true);
      expect(context.financialMetrics.length).toBe(3);
      expect(context.promptContextMarkdown).toContain(
        '#### 1. Financial Performance'
      );
      expect(context.promptContextMarkdown).toContain('Gross Sales');
      expect(context.promptContextMarkdown).toContain('Net Sales');
      expect(context.promptContextMarkdown).toContain(
        'Average Order Value (AOV)'
      );
    });

    it('grants full context to admin and super_admin callers', async () => {
      const context = await assembleCoFounderContext({
        callerRole: 'super_admin',
      });

      expect(context.callerRole).toBe('super_admin');
      expect(context.privacyGuarantees.financialAccessGranted).toBe(true);
      expect(context.financialMetrics.length).toBe(3);
      expect(context.operationalMetrics.length).toBe(6);
      expect(context.activeAnomalies.length).toBe(1);
    });
  });

  // 2. Provenance & Freshness
  describe('Provenance and Source Attribution', () => {
    it('records provenance for every queried upstream source', async () => {
      const context = await assembleCoFounderContext({ callerRole: 'admin' });

      const sourceNames = context.provenance.map((p) => p.source);
      expect(sourceNames).toContain('supabase:canonical_metrics');
      expect(sourceNames).toContain('supabase:products');
      expect(sourceNames).toContain('supabase:orders_funnel');
      expect(sourceNames).toContain('supabase:ai_failure_diagnostics');
      expect(sourceNames).toContain('anomaly_lifecycle_registry');

      for (const p of context.provenance) {
        expect(p.status).toBe('available');
        expect(p.freshness).toBeDefined();
      }
    });
  });

  // 3. Graceful Upstream Degradation
  describe('Graceful Degradation on Source Failures', () => {
    it('handles products database failure cleanly without throwing', async () => {
      mockedGetServiceClient.mockReturnValue(
        buildMockSupabase({
          products: {
            data: null,
            error: { message: 'Database connection timeout' },
          },
        })
      );

      const context = await assembleCoFounderContext({ callerRole: 'admin' });

      expect(context.unavailableSources).toContain('products_inventory');
      expect(context.inventorySignals.status).toBe('unavailable');
      // Other sources still assembled cleanly
      expect(context.funnelSummary.status).toBe('available');
      expect(context.promptContextMarkdown).toContain('Data Source Warnings');
      expect(context.promptContextMarkdown).toContain('products_inventory');
    });

    it('handles orders database failure cleanly without throwing', async () => {
      mockedGetServiceClient.mockReturnValue(
        buildMockSupabase({
          orders: {
            data: null,
            error: { message: 'relation orders does not exist' },
          },
        })
      );

      const context = await assembleCoFounderContext({ callerRole: 'admin' });

      expect(context.unavailableSources).toContain('orders_funnel');
      expect(context.funnelSummary.status).toBe('unavailable');
      expect(context.inventorySignals.status).toBe('available');
    });
  });

  // 4. Privacy & Data Minimization
  describe('Privacy & Customer Data Minimization', () => {
    it('enforces privacy flags and excludes customer PII from prompt markdown', async () => {
      const context = await assembleCoFounderContext({ callerRole: 'admin' });

      expect(context.privacyGuarantees.noPiiIncluded).toBe(true);
      expect(context.privacyGuarantees.noRawConversations).toBe(true);

      const text = context.promptContextMarkdown;
      // No email addresses
      expect(text).not.toMatch(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      );
      // No Indian phone numbers (10 digits starting with 6-9)
      expect(text).not.toMatch(/\+91[6-9]\d{9}/);
      // No credit card PANs
      expect(text).not.toMatch(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/);
    });
  });

  // 5. Size and Time Bounds
  describe('Size and Time Bounds', () => {
    it('bounds time window in IST calendar boundaries', async () => {
      const context = await assembleCoFounderContext({
        callerRole: 'admin',
        preset: 'last_7_days',
      });

      expect(context.timeWindow.timezone).toBe('Asia/Kolkata');
      expect(context.timeWindow.preset).toBe('last_7_days');
      expect(context.timeWindow.start).toBeDefined();
      expect(context.timeWindow.end).toBeDefined();
    });

    it('truncates prompt markdown when maxPromptChars is exceeded', async () => {
      const context = await assembleCoFounderContext({
        callerRole: 'admin',
        maxPromptChars: 300,
      });

      expect(context.characterCount).toBeLessThanOrEqual(300);
      expect(context.promptContextMarkdown).toContain(
        '[... Context truncated to enforce safety prompt size bounds]'
      );
    });
  });
});
