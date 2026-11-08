jest.mock('server-only', () => ({}));

import { KPICalculator } from '../kpi-calculator';
import { PerformanceEvent } from '../types';

describe('KPICalculator Deterministic Calculations', () => {
  const mockNow = new Date().toISOString();

  it('correctly calculates verified success rate for AI workers', () => {
    const events: PerformanceEvent[] = [
      {
        eventId: 'e1',
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_marketing',
        roleId: 'worker_marketing',
        taskId: 't1',
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'verified',
        evidenceRefs: ['t1'],
        schemaVersion: '1.0.0',
      },
      {
        eventId: 'e2',
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_marketing',
        roleId: 'worker_marketing',
        taskId: 't2',
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'verified',
        evidenceRefs: ['t2'],
        schemaVersion: '1.0.0',
      },
      {
        eventId: 'e3',
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_marketing',
        roleId: 'worker_marketing',
        taskId: 't3',
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'failed',
        evidenceRefs: ['t3'],
        schemaVersion: '1.0.0',
      },
      {
        eventId: 'e4',
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_marketing',
        roleId: 'worker_marketing',
        taskId: 't4',
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'verified',
        evidenceRefs: ['t4'],
        schemaVersion: '1.0.0',
      },
    ];

    const results = KPICalculator.calculateKPIs('AI_WORKER', events);
    const verifiedKpi = results.find(
      (k) => k.kpiId === 'kpi_ai_verified_success_rate'
    );

    expect(verifiedKpi).toBeDefined();
    expect(verifiedKpi?.value).toBe(75); // 3 of 4 verified = 75%
    expect(verifiedKpi?.denominator).toBe(4);
    expect(verifiedKpi?.sampleSize).toBe(3);
  });

  it('excludes external blocker tasks from calculation denominator', () => {
    const events: PerformanceEvent[] = [
      {
        eventId: 'e1',
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_seo',
        roleId: 'worker_seo',
        taskId: 't1',
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'verified',
        evidenceRefs: ['t1'],
        schemaVersion: '1.0.0',
      },
      {
        eventId: 'e2',
        eventType: 'TASK_FAILED',
        entityType: 'AI_WORKER',
        memberId: 'worker_seo',
        roleId: 'worker_seo',
        taskId: 't2',
        blockerCode: 'EXTERNAL_COURIER_DOWN', // external blocker!
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        evidenceRefs: ['t2'],
        schemaVersion: '1.0.0',
      },
    ];

    const results = KPICalculator.calculateKPIs('AI_WORKER', events);
    const verifiedKpi = results.find(
      (k) => k.kpiId === 'kpi_ai_verified_success_rate'
    );

    // Only 1 eligible task since t2 is externally blocked
    expect(verifiedKpi?.denominator).toBe(1);
    expect(verifiedKpi?.value).toBe(100);
  });

  it('returns INSUFFICIENT_DATA when zero completed tasks exist', () => {
    const results = KPICalculator.calculateKPIs('AI_WORKER', []);
    const verifiedKpi = results.find(
      (k) => k.kpiId === 'kpi_ai_verified_success_rate'
    );

    expect(verifiedKpi?.state).toBe('INSUFFICIENT_DATA');
    expect(verifiedKpi?.value).toBeNull();
  });
});
