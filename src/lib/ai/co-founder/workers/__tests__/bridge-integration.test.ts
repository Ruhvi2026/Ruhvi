jest.mock('server-only', () => ({}));

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: [],
      error: null,
    })
  ),
};

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue(mockQueryBuilder),
  }),
}));

jest.mock('@/lib/ai/co-founder/approvals', () => ({
  requestApproval: jest.fn().mockResolvedValue({
    id: 'app_mock_bridge_123',
    status: 'pending',
  }),
}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      totalRevenue: 260000,
      totalOrders: 65,
      aov: 4000,
      completedOrders: 55,
      cancelledOrders: 10,
      cancellationRate: 15.3,
      timeframeLabel: 'Last 30 Days',
    },
    comparison: null,
    insights: {
      anomalies: [],
      executiveVoiceSummary: 'Executive store analytics summary.',
    },
  }),
}));

jest.mock('@/lib/ai/co-founder/catalog-intelligence', () => ({
  calculateProductVelocity: jest.fn().mockResolvedValue({
    productId: 'p_mock',
    sku: 'SKU-001',
    productName: 'Mock Choker',
    unitsSold: 12,
    unitsPerDay: 0.4,
    orderCount: 8,
    grossRevenue: 48000,
    trend: 'accelerating',
    dataQuality: 'CALCULATED',
  }),
  getProductVelocityBatch: jest.fn().mockResolvedValue([
    {
      productId: 'p_mock',
      productName: 'Mock Choker',
      unitsPerDay: 0.4,
      grossRevenue: 48000,
    },
  ]),
  calculateDaysOfInventory: jest.fn().mockResolvedValue({
    productId: 'p_mock',
    productName: 'Mock Choker',
    daysOfInventory: 15,
    currentStock: 6,
    urgencyTier: 'ELEVATED',
    recommendedAction: 'Queue restock order with suppliers.',
  }),
  getCategoryMarginBreakdown: jest.fn().mockResolvedValue({
    categories: [{ categorySlug: 'necklaces', name: 'Necklaces' }],
    totalCatalogRevenue: 150000,
    blendedGrossMarginPercent: 62.5,
    topMarginCategory: 'Necklaces',
  }),
  generateRestockRecommendations: jest.fn().mockResolvedValue({
    restockRecommendedCount: 3,
    totalUnitsToOrder: 35,
    estimatedTotalCapitalRequired: 85000,
    criticalRestockCount: 1,
    recommendations: [],
  }),
}));

import { executeCoFounderTool } from '@/lib/ai/co-founder/tool-bridge';

describe('AI Co-Founder Tool Bridge: Worker Integration', () => {
  it('successfully invokes get_worker_statuses tool through executeCoFounderTool', async () => {
    const res = await executeCoFounderTool('get_worker_statuses', {});

    expect(res.success).toBe(true);
    expect(res.data.totalWorkers).toBe(12);
    expect(res.summaryForVoice).toContain('All 12 AI Agent Workers');
  });

  it('successfully dispatches a task to worker via dispatch_worker_task tool', async () => {
    const res = await executeCoFounderTool('dispatch_worker_task', {
      worker_id: 'auto',
      task: 'Analyze revenue metrics and conversion health for 30d',
    });

    expect(res.success).toBe(true);
    expect(res.data.workerId).toBe('worker_analytics_performance');
    expect(res.data.result.findings.length).toBeGreaterThan(0);
    expect(res.summaryForVoice).toBeTruthy();
  });

  it('successfully executes execute_multi_worker_plan tool through executeCoFounderTool', async () => {
    const res = await executeCoFounderTool('execute_multi_worker_plan', {
      goal: 'Run a full store growth audit and inspect metrics',
    });

    expect(res.success).toBe(true);
    expect(res.data.intent).toBe('GROWTH_AUDIT');
    expect(res.data.stepsExecuted.length).toBeGreaterThanOrEqual(1);
    expect(res.summaryForVoice).toBeTruthy();
  });

  it('successfully executes get_product_velocity through executeCoFounderTool', async () => {
    const res = await executeCoFounderTool('get_product_velocity', {
      product_id_or_sku: 'SKU-001',
    });

    expect(res.success).toBe(true);
    expect(res.data.sku).toBe('SKU-001');
    expect(res.summaryForVoice).toContain('Mock Choker');
    expect(res.summaryForVoice).toContain('12 units');
  });

  it('successfully executes get_days_of_inventory through executeCoFounderTool', async () => {
    const res = await executeCoFounderTool('get_days_of_inventory', {
      product_id_or_sku: 'SKU-001',
    });

    expect(res.success).toBe(true);
    expect(res.data.daysOfInventory).toBe(15);
    expect(res.summaryForVoice).toContain(
      'Mock Choker has 15 days of inventory remaining'
    );
  });

  it('successfully executes get_category_margin_breakdown through executeCoFounderTool', async () => {
    const res = await executeCoFounderTool('get_category_margin_breakdown', {
      timeframe_days: 30,
    });

    expect(res.success).toBe(true);
    expect(res.data.blendedGrossMarginPercent).toBe(62.5);
    expect(res.summaryForVoice).toContain('62.5%');
  });

  it('successfully executes get_restock_recommendations through executeCoFounderTool', async () => {
    const res = await executeCoFounderTool('get_restock_recommendations', {
      urgency_tier: 'CRITICAL',
    });

    expect(res.success).toBe(true);
    expect(res.data.restockRecommendedCount).toBe(3);
    expect(res.summaryForVoice).toContain('3 SKUs');
  });
});
