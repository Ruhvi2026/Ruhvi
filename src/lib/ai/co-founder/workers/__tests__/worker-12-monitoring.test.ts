jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/outcomes', () => ({
  verifyDueActionPlanOutcomes: jest.fn().mockResolvedValue({
    verifiedCount: 2,
    plans: [{ id: 'plan_1', outcome: 'verified_success' }],
  }),
  getOutcomeAnalytics: jest.fn().mockResolvedValue({
    totalRecommendations: 10,
    totalActionsExecuted: 8,
    acceptanceRatePercent: 80.0,
    verifiedOutcomes: {
      positiveCount: 7,
      negativeCount: 1,
      neutralCount: 0,
      successRatePercent: 87.5,
    },
    conflicts: [],
  }),
}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      totalRevenue: 300000,
      totalOrders: 80,
    },
    comparison: {
      baselineRevenue: 260000,
      baselineOrders: 70,
      revenueGrowthPercent: 15.4,
      orderGrowthPercent: 14.3,
    },
  }),
}));

import { getStoreAnalytics } from '@/lib/ai/co-founder/analytics';
import { MonitoringVerificationWorker } from '../worker-12-monitoring';

describe('Worker 12: Monitoring & Verification Worker (System Worker)', () => {
  let worker: MonitoringVerificationWorker;

  beforeEach(() => {
    worker = new MonitoringVerificationWorker();
  });

  it('correctly declares worker identity and system worker status', () => {
    expect(worker.id).toBe('worker_monitoring_verification');
    expect(worker.name).toBe('Monitoring & Verification Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.isSystemWorker).toBe(true);
    expect(def.role).toContain('Closed-Loop Verification Officer');
    expect(def.responsibilities).toContain(
      'Detect regressions, conversion drops, or unintended operational side effects'
    );
  });

  it('verifies executed changes, compares before/after metrics, and reports success rate', async () => {
    const output = await worker.execute({
      task: 'Verify recent executed actions and check for performance regressions',
    });

    expect(output.workerId).toBe('worker_monitoring_verification');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.findings[0]).toContain('87.5%');
    expect(output.data?.metricsDelta.length).toBeGreaterThan(0);
    expect(output.data?.metricsDelta[0].verdict).toBe('improved');
    expect(output.requiredApproval).toBe(false);
    expect(output.executionStatus).toBe('not_required');
    expect(output.executiveVoiceSummary).toContain('success rate is 87.5%');
  });

  it('detects performance regression and elevates priority to critical with rollback recommendation', async () => {
    (getStoreAnalytics as jest.Mock).mockResolvedValueOnce({
      currentPeriod: {
        totalRevenue: 180000,
        totalOrders: 45,
      },
      comparison: {
        baselineRevenue: 250000,
        baselineOrders: 65,
        revenueGrowthPercent: -28.0, // Regression > 10% drop
        orderGrowthPercent: -30.8,
      },
    });

    const output = await worker.execute({
      task: 'Check for performance regressions post-pricing change',
    });

    expect(output.priority).toBe('critical');
    expect(
      output.problems.some((p) => p.includes('Performance Regression Detected'))
    ).toBe(true);
    expect(output.recommendations.some((r) => r.includes('rolling back'))).toBe(
      true
    );
    expect(output.executiveVoiceSummary).toContain(
      'Alert: A performance regression was detected'
    );
  });
});
