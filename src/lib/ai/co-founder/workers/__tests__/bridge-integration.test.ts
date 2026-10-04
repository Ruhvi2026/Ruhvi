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
});
