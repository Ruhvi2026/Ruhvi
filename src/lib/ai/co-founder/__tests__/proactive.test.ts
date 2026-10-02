jest.mock('server-only', () => ({}));

import {
  createSignalFingerprint,
  scanProactiveSignals,
  acknowledgeSignal,
  getActiveProactiveSignals,
} from '../proactive';
import { executeCoFounderTool } from '../tool-bridge';

const mockSignalsTable: any[] = [];

// Mock getStoreAnalytics
jest.mock('../analytics', () => ({
  getStoreAnalytics: jest.fn(async ({ timeframe }) => {
    return {
      timeframe,
      kpis: {
        totalRevenue: 50000,
        netRevenue: 40000,
        totalOrders: 10,
        paidOrders: 7,
        cancelledOrders: 3,
        cancellationRate: 30.0, // High cancellation spike
        aov: 5714,
        topSellingProducts: [
          {
            productId: 'p1',
            name: 'Royal Choker',
            sku: 'RC-01',
            unitsSold: 12,
            revenue: 36000,
          },
        ],
        lowStockItemsCount: 4, // Low stock alert
        openSupportTicketsCount: 5,
        urgentTicketsCount: 2, // Urgent support alert
      },
      comparisons: {
        revenue: {
          current: 40000,
          baseline: 70000,
          absoluteChange: -30000,
          percentageChange: -42.8,
          trend: 'decreasing',
          isAnomaly: true,
          anomalyConfidence: 'confirmed',
        },
      },
      evidence: {
        sourceTables: ['orders', 'products', 'support_tickets'],
        sampleSizeOrders: 10,
        sampleSizeItems: 1,
        dataFreshnessTimestamp: new Date().toISOString(),
        isCached: false,
      },
      insights: {
        executiveVoiceSummary:
          'Net revenue is down 42.8% over the last 7 days.',
        structuredTextSummary: ['Net revenue decreased by ₹30,000'],
        anomalies: ['Revenue dropped 42.8%'],
        crossDatasetObservations: ['2 urgent tickets pending'],
      },
    };
  }),
}));

// Mock memory
jest.mock('../memory', () => ({
  getRelevantMemories: jest.fn(async () => [
    {
      id: 'mem-1',
      userId: 'user_1',
      category: 'strategic_goal',
      key: 'festive_diwali_growth',
      value: 'Target ₹50 Lakhs revenue before festive season',
      confidence: 1.0,
    },
  ]),
}));

// Mock Supabase
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_signals') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[col] = val;
            return this;
          }),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(function (this: any, n: number) {
            const res = mockSignalsTable
              .filter((s) => {
                if (
                  this._filters?.is_acknowledged !== undefined &&
                  s.is_acknowledged !== this._filters.is_acknowledged
                ) {
                  return false;
                }
                return true;
              })
              .slice(0, n);
            return Promise.resolve({ data: res, error: null });
          }),
          maybeSingle: jest.fn(function (this: any) {
            const found = mockSignalsTable.find((s) => {
              if (
                this._filters?.fingerprint &&
                s.fingerprint === this._filters.fingerprint
              ) {
                return true;
              }
              return false;
            });
            return Promise.resolve({ data: found || null, error: null });
          }),
          insert: jest.fn((row: any) => {
            const inserted = {
              id: `sig_${mockSignalsTable.length + 1}`,
              ...row,
              created_at: new Date().toISOString(),
            };
            mockSignalsTable.push(inserted);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: inserted, error: null }),
              }),
            };
          }),
          update: jest.fn((fields: any) => ({
            eq: (col: string, val: any) => {
              mockSignalsTable.forEach((s) => {
                if (s[col] === val) Object.assign(s, fields);
              });
              return Promise.resolve({ data: null, error: null });
            },
          })),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  })),
}));

describe('Stage 5 — Proactive Intelligence System', () => {
  beforeEach(() => {
    mockSignalsTable.length = 0;
  });

  describe('Signal Fingerprint & Detection', () => {
    it('creates deterministic idempotency fingerprints', () => {
      const fp1 = createSignalFingerprint(
        'revenue_drop',
        'store_7d',
        '2026-10-02'
      );
      const fp2 = createSignalFingerprint(
        'revenue_drop',
        'store_7d',
        '2026-10-02'
      );
      const fp3 = createSignalFingerprint(
        'revenue_drop',
        'store_7d',
        '2026-10-03'
      );
      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fp3);
    });

    it('scans and generates prioritized candidate signals across business, risk, and strategic memory', async () => {
      const result = await scanProactiveSignals({
        userId: 'founder_1',
        adminName: 'Aayush',
      });

      expect(result.generatedCount).toBeGreaterThanOrEqual(4);
      expect(result.activeSignals.length).toBeGreaterThanOrEqual(4);

      // Priority ranking: Critical > High > Medium
      expect(result.activeSignals[0].severity).toBe('critical');
      expect(result.activeSignals[0].signalType).toBe('revenue_drop');

      // Check action boundary constraint (Phase 16)
      for (const signal of result.activeSignals) {
        if (signal.severity === 'critical' || signal.severity === 'high') {
          expect(signal.requiresApproval).toBe(true);
        }
      }

      // Check Voice Greeting generation (Phase 14)
      expect(result.voiceGreeting).toBeDefined();
      expect(result.voiceGreeting).toContain('Aayush');
      expect(result.voiceGreeting).toContain('Net revenue decreased');
    });
  });

  describe('Noise Reduction & Deduplication', () => {
    it('suppresses duplicate proactive signals within cooldown window', async () => {
      // First scan inserts signals
      const firstScan = await scanProactiveSignals({ adminName: 'Aayush' });
      expect(firstScan.generatedCount).toBeGreaterThan(0);
      expect(firstScan.suppressedCount).toBe(0);

      // Immediate second scan should suppress duplicates
      const secondScan = await scanProactiveSignals({ adminName: 'Aayush' });
      expect(secondScan.suppressedCount).toBeGreaterThan(0);
      expect(secondScan.generatedCount).toBe(0);
    });
  });

  describe('Acknowledgment & State Management', () => {
    it('acknowledges a signal and marks it inactive in active signals query', async () => {
      await scanProactiveSignals({ adminName: 'Aayush' });
      const activeBefore = await getActiveProactiveSignals(10);
      expect(activeBefore.length).toBeGreaterThan(0);

      const targetId = activeBefore[0].id!;
      const ackRes = await acknowledgeSignal(targetId, 'user_1');
      expect(ackRes.success).toBe(true);

      const activeAfter = await getActiveProactiveSignals(10);
      const isStillPresent = activeAfter.some((s) => s.id === targetId);
      expect(isStillPresent).toBe(false);
    });
  });

  describe('Tool Bridge Integration & Security', () => {
    it('retrieves proactive signals through tool bridge with permission', async () => {
      await scanProactiveSignals({ adminName: 'Aayush' });

      const res = await executeCoFounderTool(
        'get_proactive_signals',
        { limit: 3 },
        ['analytics:read']
      );

      expect(res.success).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.summaryForVoice).toContain('proactive signals');
    });

    it('acknowledges signal through tool bridge and enforces permission', async () => {
      await scanProactiveSignals({ adminName: 'Aayush' });
      const active = await getActiveProactiveSignals(1);
      const sigId = active[0].id!;

      // Write permission required
      const ackRes = await executeCoFounderTool(
        'acknowledge_proactive_signal',
        { signal_id: sigId },
        ['analytics:write']
      );
      expect(ackRes.success).toBe(true);

      // Blocked without write permission
      const blockedRes = await executeCoFounderTool(
        'acknowledge_proactive_signal',
        { signal_id: sigId },
        ['analytics:read']
      );
      expect(blockedRes.success).toBe(false);
    });
  });
});
