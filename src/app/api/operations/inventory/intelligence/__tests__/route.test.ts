import { GET, ADVISORY_NOTICE } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getServiceClient } from '@/lib/supabase/service';
import { getSkuDemandMetrics } from '@/lib/intelligence/inventory-demand-service';
import { getSkuStockoutRisk } from '@/lib/intelligence/stockout-risk-service';
import { getSkuAgingAnalysis } from '@/lib/intelligence/dead-stock-service';
import { getSkuRestockRecommendation } from '@/lib/intelligence/restock-recommendation-service';
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/intelligence/inventory-demand-service', () => ({
  getSkuDemandMetrics: jest.fn(),
}));

jest.mock('@/lib/intelligence/stockout-risk-service', () => ({
  getSkuStockoutRisk: jest.fn(),
}));

jest.mock('@/lib/intelligence/dead-stock-service', () => ({
  getSkuAgingAnalysis: jest.fn(),
}));

jest.mock('@/lib/intelligence/restock-recommendation-service', () => ({
  getSkuRestockRecommendation: jest.fn(),
}));

describe('GET /api/operations/inventory/intelligence (Track B & C Integration - P1.9)', () => {
  const mockedRequireAdmin = requireAdmin as jest.Mock;
  const mockedGetServiceClient = getServiceClient as jest.Mock;
  const mockedGetDemand = getSkuDemandMetrics as jest.Mock;
  const mockedGetStockout = getSkuStockoutRisk as jest.Mock;
  const mockedGetAging = getSkuAgingAnalysis as jest.Mock;
  const mockedGetRestock = getSkuRestockRecommendation as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue({
      ok: true,
      role: 'staff',
      userId: 'staff_user_1',
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockedRequireAdmin.mockResolvedValueOnce({
      ok: false,
      error: 'Admin authentication required',
      status: 401,
    });

    const req = new NextRequest(
      'http://localhost/api/operations/inventory/intelligence'
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('evaluates single product intelligence detailed breakdown when productId is provided', async () => {
    mockedGetDemand.mockResolvedValueOnce({
      salesVelocityDaily: 2.5,
      dataSufficiency: 'SUFFICIENT',
    });
    mockedGetStockout.mockResolvedValueOnce({
      riskLevel: 'HIGH',
      daysOfInventoryRemaining: 4,
      explanation: 'Stockout likely within supplier lead time.',
    });
    mockedGetAging.mockResolvedValueOnce({
      agingCategory: 'healthy',
      daysSinceLastSale: 2,
    });
    mockedGetRestock.mockResolvedValueOnce({
      recommendationAction: 'reorder_now',
      recommendedReorderQuantity: 25,
      urgency: 'high',
    });

    const req = new NextRequest(
      'http://localhost/api/operations/inventory/intelligence?productId=prod_necklace_01'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.productId).toBe('prod_necklace_01');
    expect(json.demand.salesVelocityDaily).toBe(2.5);
    expect(json.stockoutRisk.riskLevel).toBe('HIGH');
    expect(json.restockRecommendation.recommendedReorderQuantity).toBe(25);
    expect(json.advisoryNotice).toBe(ADVISORY_NOTICE);
    expect(json.requiresHumanReview).toBe(true);
  });

  it('performs batch scan across catalog and aggregates stockout, restock, and dead stock signals', async () => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Diamond Solitaire Ring',
        sku: 'RG-DIA-001',
        stock_quantity: 2,
        low_stock_threshold: 5,
        price: 45000,
      },
      {
        id: 'p2',
        name: 'Gold Temple Bangle',
        sku: 'BG-GLD-002',
        stock_quantity: 1,
        low_stock_threshold: 3,
        price: 75000,
      },
    ];

    mockedGetServiceClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      }),
    });

    mockedGetStockout
      .mockResolvedValueOnce({
        riskLevel: 'CRITICAL',
        daysOfInventoryRemaining: 1.5,
        dataSufficiency: 'SUFFICIENT',
        explanation: 'Critical stockout exposure',
        stockoutProbabilityWithinLeadTime: 0.95,
      })
      .mockResolvedValueOnce({
        riskLevel: 'LOW',
        daysOfInventoryRemaining: 45,
        dataSufficiency: 'SUFFICIENT',
      });

    mockedGetRestock
      .mockResolvedValueOnce({
        recommendationAction: 'reorder_now',
        recommendedReorderQuantity: 15,
        urgency: 'critical',
        confidenceScore: 0.9,
        supplierLeadTimeDays: 7,
        explanation: 'Reorder 15 units immediately',
      })
      .mockResolvedValueOnce({
        recommendationAction: 'none',
        recommendedReorderQuantity: 0,
        urgency: 'none',
      });

    mockedGetAging
      .mockResolvedValueOnce({
        agingCategory: 'healthy',
        daysSinceLastSale: 1,
      })
      .mockResolvedValueOnce({
        agingCategory: 'dead_stock',
        daysSinceLastSale: 120,
        estimatedTiedCapital: 75000,
        liquidationGuidance: 'Consider promotional clearance bundle',
        actionLabel: 'Clearance Discount',
      });

    const req = new NextRequest(
      'http://localhost/api/operations/inventory/intelligence?limit=10'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.summary.scannedSkusCount).toBe(2);
    expect(json.summary.stockoutAlertsCount).toBe(1);
    expect(json.summary.restockDraftsCount).toBe(1);
    expect(json.summary.deadStockFindingsCount).toBe(1);

    expect(json.stockoutAlerts[0].sku).toBe('RG-DIA-001');
    expect(json.stockoutAlerts[0].riskLevel).toBe('CRITICAL');

    expect(json.restockDrafts[0].recommendedUnits).toBe(15);
    expect(json.deadStockFindings[0].sku).toBe('BG-GLD-002');
    expect(json.advisoryNotice).toBe(ADVISORY_NOTICE);
    expect(json.requiresHumanReview).toBe(true);
  });
});
