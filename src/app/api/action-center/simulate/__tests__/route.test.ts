import { GET } from '../[id]/route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getServiceClient } from '@/lib/supabase/service';
import {
  getAnomalyLifecycleRegistry,
  type AnomalyRecord,
} from '@/lib/intelligence/anomaly-lifecycle';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('GET /api/action-center/simulate/[id]', () => {
  const mockedRequireAdmin = requireAdmin as jest.Mock;
  const mockedGetServiceClient = getServiceClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue({
      ok: true,
      role: 'admin',
      userId: 'admin_test_1',
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockedRequireAdmin.mockResolvedValueOnce({
      ok: false,
      error: 'Admin authentication required',
      status: 401,
    });

    const req = new Request(
      'http://localhost/api/action-center/simulate/act_123'
    );
    const res = await GET(req, { params: Promise.resolve({ id: 'act_123' }) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Admin authentication required');
  });

  it('resolves live authoritative product from Supabase DB and simulates against it', async () => {
    const mockProduct = {
      id: 'prod_diamond_ring_09',
      name: 'Platinum Solitaire Ring',
      sku: 'PL-SOL-009',
      price: 120000,
      cost_price: 72000,
      stock_quantity: 4,
      low_stock_threshold: 3,
    };

    mockedGetServiceClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new Request(
      'http://localhost/api/action-center/simulate/prod_diamond_ring_09?lowStockThreshold=8'
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: 'prod_diamond_ring_09' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.isSimulatedProjection).toBe(true);
    expect(data.targetEntity).toEqual({
      type: 'product',
      id: 'prod_diamond_ring_09',
    });
    expect(data.proposalTitle).toContain('Platinum Solitaire Ring');
    expect(
      data.reviewGuidance.some((g: string) =>
        g.includes('Platinum Solitaire Ring')
      )
    ).toBe(true);
    expect(data.disclaimer).toBeDefined();
    expect(data.simulation.comparisons.length).toBeGreaterThan(0);
  });

  it('binds simulation to anomaly record if ID matches an active anomaly', async () => {
    const registry = getAnomalyLifecycleRegistry();
    const mockAnomalyRecord: AnomalyRecord = {
      id: 'anom_stockout_surge_001',
      fingerprint: 'fp_stockout_surge_001',
      ruleId: 'rule_inventory_stockout_surge',
      metric: 'gross_sales',
      dimension: 'global',
      state: 'open',
      severity: 'critical',
      title: 'Stockout Surge in Polki Earrings',
      firstDetectedAt: '2026-10-28T10:00:00.000Z',
      lastObservedAt: '2026-10-28T12:00:00.000Z',
      occurrenceCount: 3,
      reopenCount: 0,
      latestValue: 9,
      thresholdValue: 5,
      cooldownUntil: '2026-10-28T18:00:00.000Z',
      shouldNotify: true,
      history: [],
      recommendation: {
        title: 'Increase Polki Earring Buffer',
        explanation: 'Elevate buffer by 3 units to avoid stockouts',
        category: 'inventory',
        urgency: 'high',
        actionLabel: 'Increase Buffer',
        actionType: 'navigate',
      },
    };
    // Attach metadata property for product binding
    (mockAnomalyRecord as any).metadata = { productId: 'prod_earrings_01' };

    registry.seedRecord(mockAnomalyRecord);

    mockedGetServiceClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Row not found' },
            }),
          }),
        }),
      }),
    });

    const req = new Request(
      'http://localhost/api/action-center/simulate/act_anom_stockout_surge_001'
    );
    const res = await GET(req, {
      params: Promise.resolve({
        id: 'act_anom_stockout_surge_001',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.targetEntity).toEqual({
      type: 'product',
      id: 'prod_earrings_01',
    });
    expect(data.isSimulatedProjection).toBe(true);
  });

  it('falls back gracefully to representative catalog baseline for unknown action item', async () => {
    mockedGetServiceClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Row not found' },
            }),
          }),
        }),
      }),
    });

    const req = new Request(
      'http://localhost/api/action-center/simulate/act_unknown_999'
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: 'act_unknown_999' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.isSimulatedProjection).toBe(true);
    expect(data.targetEntity.type).toBe('product');
    expect(
      data.reviewGuidance.some((g: string) =>
        g.includes('simulated against catalog snapshot baseline')
      )
    ).toBe(true);
  });
});
