jest.mock('server-only', () => ({}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/intelligence/simulator/route';
import { SIMULATION_SANDBOX_DISCLAIMER } from '@/lib/intelligence/counterfactual-models';
import * as authServer from '@/lib/auth/require-admin';

describe('Decision Simulator Interface & API (Track I - Phase 46)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any): NextRequest => {
    return new NextRequest('http://localhost:3000/api/intelligence/simulator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  describe('RBAC & Authentication Guard', () => {
    it('rejects unauthenticated requests with HTTP 401', async () => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValueOnce({
        ok: false,
        error: 'Authentication session expired',
        status: 401,
      } as any);

      const req = createMockRequest({
        decisionType: 'inventory_buffer_optimization',
        parameters: {},
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Authentication');
    });

    it('rejects missing decisionType with HTTP 400', async () => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValueOnce({
        ok: true,
        role: 'admin',
        userId: 'admin_123',
      } as any);

      const req = createMockRequest({
        parameters: {},
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Missing required field: decisionType');
    });

    it('rejects unsupported decisionType with HTTP 400', async () => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValueOnce({
        ok: true,
        role: 'admin',
        userId: 'admin_123',
      } as any);

      const req = createMockRequest({
        decisionType: 'unsupported_quantum_pricing',
        parameters: {},
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Unsupported decision simulation type');
    });
  });

  describe('Scenario Calculations & Invariants', () => {
    beforeEach(() => {
      jest.spyOn(authServer, 'requireAdmin').mockResolvedValue({
        ok: true,
        role: 'admin',
        userId: 'admin_123',
      } as any);
    });

    it('simulates inventory buffer optimization with non-misleading disclaimer', async () => {
      const req = createMockRequest({
        decisionType: 'inventory_buffer_optimization',
        parameters: {
          skuCount: 20,
          averageUnitCost: 40000,
          bufferDeltaUnitsPerSku: 4,
          baselineStockoutLossMonthly: 200000,
          costOfCapitalAnnualPercent: 12,
        },
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.decisionType).toBe('inventory_buffer_optimization');
      expect(json.data.isSimulatedProjection).toBe(true);
      expect(json.data.isReadOnlySandbox).toBe(true);
      expect(json.data.disclaimer).toBe(SIMULATION_SANDBOX_DISCLAIMER);
      expect(json.data.disclaimer).toContain(
        'NO PRODUCTION SETTINGS OR INVENTORY ARE MUTATED'
      );
      expect(json.data.metrics.length).toBeGreaterThan(0);
      expect(json.data.confidenceScore).toBeDefined();
    });

    it('clamps out-of-bounds parameters safely', async () => {
      const req = createMockRequest({
        decisionType: 'tiered_pricing_elasticity',
        parameters: {
          priceTier: 'luxury_high_ticket',
          priceAdjustmentPercent: 999, // extreme value beyond +50% limit
          baselineRevenueMonthly: -5000, // invalid negative revenue
        },
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      // Verify priceAdjustmentPercent was clamped to max 50%
      expect(json.data.summary).toContain('+50%');
    });

    it('simulates promotional campaign structure and detects margin erosion side effects', async () => {
      const req = createMockRequest({
        decisionType: 'promotional_campaign_structure',
        parameters: {
          baselineMonthlyOrders: 200,
          baselineAov: 30000,
          baselineGrossMarginPercent: 30,
          discountPercent: 25, // Deep discount
          expectedConversionLiftPercent: 5, // Low volume lift unable to offset discount
        },
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.decisionType).toBe('promotional_campaign_structure');
      expect(json.data.netBusinessRecommendation).toBe(
        'HIGH_RISK_NOT_RECOMMENDED'
      );
      expect(json.data.sideEffects.length).toBeGreaterThan(0);
      expect(json.data.sideEffects[0].title).toBe('Discount Margin Erosion');
    });

    it('simulates expedited delivery promise with operational tradeoff metrics', async () => {
      const req = createMockRequest({
        decisionType: 'expedited_delivery_promise',
        parameters: {
          monthlyShipmentVolume: 500,
          baselineCheckoutConversionRate: 2.2,
          expressCourierSurchargePerShipment: 180,
          averageOrderGrossProfit: 7500,
        },
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.decisionType).toBe('expedited_delivery_promise');
      expect(
        json.data.metrics.some((m: any) => m.name.includes('Shipping Benefit'))
      ).toBe(true);
      expect(
        json.data.sideEffects.some((se: any) =>
          se.title.includes('Warehouse Dispatch')
        )
      ).toBe(true);
    });

    it('gracefully handles missing and undefined parameters without NaN propagation (P1.7)', async () => {
      const req = createMockRequest({
        decisionType: 'inventory_buffer_optimization',
        parameters: {},
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.metrics.length).toBeGreaterThan(0);
      for (const m of json.data.metrics) {
        expect(Number.isNaN(m.baseline)).toBe(false);
        expect(Number.isNaN(m.projected)).toBe(false);
        expect(Number.isNaN(m.absoluteDelta)).toBe(false);
        expect(Number.isNaN(m.percentageDelta)).toBe(false);
      }
    });
  });
});
