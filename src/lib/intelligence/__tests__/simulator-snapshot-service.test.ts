jest.mock('server-only', () => ({}));

import {
  fetchVerifiedPromotionSnapshot,
  simulatePromotionalCampaignWithSnapshot,
  reproducePromotionalCampaignOutputs,
  PROMOTION_SNAPSHOT_FALLBACK,
} from '../simulator-snapshot-service';
import * as metricsService from '../metrics-service';
import { POST } from '@/app/api/intelligence/simulator/route';
import { requireAdmin } from '@/lib/auth/require-admin';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

describe('Simulator Business Snapshot Connection (Phase 29 - Track F)', () => {
  const mockGetCanonicalMetric = jest.spyOn(
    metricsService,
    'getCanonicalMetric'
  );
  const mockedRequireAdmin = requireAdmin as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue({
      ok: true,
      role: 'admin',
      userId: 'test_admin_01',
    });
  });

  describe('1. Snapshot Extraction & Truth in Modeling', () => {
    it('uses verified actual business metrics when historical transactions exist', async () => {
      mockGetCanonicalMetric.mockImplementation(async (metric: any) => {
        if (metric === 'paid_orders_count') {
          return {
            metric: 'paid_orders_count',
            value: 120,
            status: 'available',
            unit: 'orders',
            sampleSize: 120,
            calculatedAt: '2026-10-31T05:00:00.000Z',
            timeWindow: {
              start: '2026-10-01T00:00:00.000Z',
              end: '2026-10-31T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_30_days',
            },
          };
        }
        if (metric === 'average_order_value') {
          return {
            metric: 'average_order_value',
            value: 48500,
            status: 'available',
            currency: 'INR',
            unit: '₹',
            sampleSize: 120,
            calculatedAt: '2026-10-31T05:00:00.000Z',
            timeWindow: {
              start: '2026-10-01T00:00:00.000Z',
              end: '2026-10-31T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_30_days',
            },
          };
        }
        if (metric === 'gross_sales') {
          return {
            metric: 'gross_sales',
            value: 5820000,
            status: 'available',
            currency: 'INR',
            unit: '₹',
            sampleSize: 120,
            calculatedAt: '2026-10-31T05:00:00.000Z',
            timeWindow: {
              start: '2026-10-01T00:00:00.000Z',
              end: '2026-10-31T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_30_days',
            },
          };
        }
        throw new Error(`Unexpected metric: ${metric}`);
      });

      const snapshot = await fetchVerifiedPromotionSnapshot({
        preset: 'last_30_days',
        callerRole: 'admin',
        allowFallback: false,
      });

      expect(snapshot.snapshotSource).toBe('verified_business_snapshot');
      expect(snapshot.observedValues.baselineMonthlyOrders.value).toBe(120);
      expect(
        snapshot.observedValues.baselineMonthlyOrders.isFallbackDefault
      ).toBe(false);
      expect(snapshot.observedValues.baselineAov.value).toBe(48500);
      expect(snapshot.observedValues.baselineAov.isFallbackDefault).toBe(false);
      expect(snapshot.dataQualityNotice).toContain('120 orders');
    });

    it('returns explicit insufficient_data without inventing numbers when orders are missing and fallback is disallowed', async () => {
      mockGetCanonicalMetric.mockImplementation(async (metric: any) => ({
        metric,
        value: 0,
        status: 'available',
        sampleSize: 0,
        calculatedAt: '2026-10-31T05:00:00.000Z',
        timeWindow: {
          start: '2026-10-01T00:00:00.000Z',
          end: '2026-10-31T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          preset: 'last_30_days',
        },
      }));

      const snapshot = await fetchVerifiedPromotionSnapshot({
        preset: 'last_30_days',
        callerRole: 'admin',
        allowFallback: false,
      });

      expect(snapshot.snapshotSource).toBe('insufficient_data');
      expect(snapshot.observedValues.baselineMonthlyOrders.value).toBeNull();
      expect(snapshot.observedValues.baselineMonthlyOrders.status).toBe(
        'insufficient_data'
      );
      expect(snapshot.observedValues.baselineAov.value).toBeNull();
      expect(snapshot.observedValues.baselineAov.status).toBe(
        'insufficient_data'
      );
      expect(snapshot.dataQualityNotice).toContain(
        'Insufficient verified order history'
      );
    });

    it('clearly flags fallback_default with prominent caution when fallback is allowed', async () => {
      mockGetCanonicalMetric.mockImplementation(async (metric: any) => ({
        metric,
        value: null,
        status: 'insufficient_data',
        sampleSize: 0,
        calculatedAt: '2026-10-31T05:00:00.000Z',
        timeWindow: {
          start: '2026-10-01T00:00:00.000Z',
          end: '2026-10-31T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          preset: 'last_30_days',
        },
      }));

      const snapshot = await fetchVerifiedPromotionSnapshot({
        preset: 'last_30_days',
        callerRole: 'admin',
        allowFallback: true,
      });

      expect(snapshot.snapshotSource).toBe('fallback_default');
      expect(snapshot.observedValues.baselineMonthlyOrders.value).toBe(
        PROMOTION_SNAPSHOT_FALLBACK.baselineMonthlyOrders
      );
      expect(
        snapshot.observedValues.baselineMonthlyOrders.isFallbackDefault
      ).toBe(true);
      expect(snapshot.observedValues.baselineAov.value).toBe(
        PROMOTION_SNAPSHOT_FALLBACK.baselineAov
      );
      expect(snapshot.observedValues.baselineAov.isFallbackDefault).toBe(true);
      expect(snapshot.dataQualityNotice).toContain(
        'CAUTION: Live order data is insufficient'
      );
    });
  });

  describe('2. Scenario Simulation with Input Provenance Separation', () => {
    it('accurately separates observed values, user assumptions, and model estimates', async () => {
      mockGetCanonicalMetric.mockImplementation(async (metric: any) => {
        if (metric === 'paid_orders_count') {
          return {
            metric: 'paid_orders_count',
            value: 200,
            status: 'available',
            sampleSize: 200,
            calculatedAt: '2026-10-31T05:00:00.000Z',
            timeWindow: {
              start: '2026-10-01T00:00:00.000Z',
              end: '2026-10-31T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_30_days',
            },
          };
        }
        return {
          metric: 'average_order_value',
          value: 50000,
          status: 'available',
          sampleSize: 200,
          calculatedAt: '2026-10-31T05:00:00.000Z',
          timeWindow: {
            start: '2026-10-01T00:00:00.000Z',
            end: '2026-10-31T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_30_days',
          },
        };
      });

      const result = await simulatePromotionalCampaignWithSnapshot({
        discountPercent: 10,
        expectedConversionLiftPercent: 25,
        baselineGrossMarginPercent: 40,
        allowFallback: false,
      });

      expect(result.snapshotProvenance).toBeDefined();
      const prov = result.snapshotProvenance!;

      // 1. Observed Values
      expect(prov.snapshotSource).toBe('verified_business_snapshot');
      expect(prov.observedValues.baselineMonthlyOrders.value).toBe(200);
      expect(prov.observedValues.baselineAov.value).toBe(50000);

      // 2. User Assumptions
      expect(prov.userEnteredAssumptions).toEqual({
        discountPercent: 10,
        expectedConversionLiftPercent: 25,
        baselineGrossMarginPercent: 40,
      });

      // 3. Model Estimates
      expect(prov.modelEstimates.simulatedOrders).toBe(250); // 200 * 1.25
      expect(prov.modelEstimates.simulatedAov).toBe(45000); // 50000 * 0.9
      expect(prov.modelEstimates.simulatedRevenue).toBe(11250000); // 250 * 45000

      // Baseline revenue = 200 * 50,000 = 10,000,000. COGS = 6,000,000. Profit = 4,000,000
      // Simulated COGS = 6,000,000 * 1.25 = 7,500,000. Profit = 11,250,000 - 7,500,000 = 3,750,000
      // Profit delta = 3,750,000 - 4,000,000 = -250,000
      expect(prov.modelEstimates.profitDelta).toBe(-250000);
      expect(result.netBusinessRecommendation).toBe(
        'HIGH_RISK_NOT_RECOMMENDED'
      );
    });

    it('halts with high-risk recommendation and zero metrics when insufficient data cannot be replaced', async () => {
      mockGetCanonicalMetric.mockImplementation(async (metric: any) => ({
        metric,
        value: null,
        status: 'insufficient_data',
        sampleSize: 0,
        calculatedAt: '2026-10-31T05:00:00.000Z',
        timeWindow: {
          start: '2026-10-01T00:00:00.000Z',
          end: '2026-10-31T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          preset: 'last_30_days',
        },
      }));

      const result = await simulatePromotionalCampaignWithSnapshot({
        discountPercent: 10,
        expectedConversionLiftPercent: 20,
        allowFallback: false,
      });

      expect(result.confidenceScore).toBe(0);
      expect(result.metrics).toHaveLength(0);
      expect(result.netBusinessRecommendation).toBe(
        'HIGH_RISK_NOT_RECOMMENDED'
      );
      expect(result.sideEffects[0].title).toBe(
        'Insufficient Historical Orders'
      );
      expect(result.snapshotProvenance?.snapshotSource).toBe(
        'insufficient_data'
      );
    });
  });

  describe('3. Deterministic Output Reproducibility', () => {
    it('guarantees identical outputs from named inputs via pure reproduction helper', () => {
      const inputs = {
        baselineMonthlyOrders: 300,
        baselineAov: 40000,
        baselineGrossMarginPercent: 35,
        discountPercent: 12,
        expectedConversionLiftPercent: 30,
      };

      const calc1 = reproducePromotionalCampaignOutputs(inputs);
      const calc2 = reproducePromotionalCampaignOutputs(inputs);

      expect(calc1).toEqual(calc2);
      expect(calc1.simulatedOrders).toBe(390); // 300 * 1.3
      expect(calc1.simulatedAov).toBe(35200); // 40000 * 0.88
      expect(calc1.simulatedRevenue).toBe(13728000); // 390 * 35200
    });
  });

  describe('4. API Integration (POST /api/intelligence/simulator)', () => {
    it('executes promotional campaign simulation using verified snapshot when requested', async () => {
      mockGetCanonicalMetric.mockImplementation(async (metric: any) => {
        if (metric === 'paid_orders_count') {
          return {
            metric: 'paid_orders_count',
            value: 150,
            status: 'available',
            sampleSize: 150,
            calculatedAt: '2026-10-31T05:00:00.000Z',
            timeWindow: {
              start: '2026-10-01T00:00:00.000Z',
              end: '2026-10-31T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_30_days',
            },
          };
        }
        return {
          metric: 'average_order_value',
          value: 36000,
          status: 'available',
          sampleSize: 150,
          calculatedAt: '2026-10-31T05:00:00.000Z',
          timeWindow: {
            start: '2026-10-01T00:00:00.000Z',
            end: '2026-10-31T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_30_days',
          },
        };
      });

      const req = new Request('http://localhost/api/intelligence/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType: 'promotional_campaign_structure',
          parameters: {
            discountPercent: 8,
            expectedConversionLiftPercent: 15,
            useVerifiedSnapshot: true,
            allowFallback: false,
          },
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data.snapshotProvenance).toBeDefined();
      expect(json.data.snapshotProvenance.snapshotSource).toBe(
        'verified_business_snapshot'
      );
      expect(
        json.data.snapshotProvenance.observedValues.baselineMonthlyOrders.value
      ).toBe(150);
    });
  });
});
