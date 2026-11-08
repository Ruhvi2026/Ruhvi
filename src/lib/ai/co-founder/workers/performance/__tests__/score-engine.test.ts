jest.mock('server-only', () => ({}));

import { ScoreEngine } from '../score-engine';
import { RecognitionEngine } from '../recognition-engine';
import { PerformanceEvent } from '../types';

describe('ScoreEngine & RecognitionEngine', () => {
  const mockNow = new Date().toISOString();
  const period = { from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z' };

  it('withholds overall score and grade when sample size is below minimum threshold', () => {
    // Only 2 tasks (minimum is 5)
    const events: PerformanceEvent[] = [
      {
        eventId: 'e1',
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_support',
        roleId: 'worker_support',
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
        memberId: 'worker_support',
        roleId: 'worker_support',
        taskId: 't2',
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'verified',
        evidenceRefs: ['t2'],
        schemaVersion: '1.0.0',
      },
    ];

    const scorecard = ScoreEngine.calculateMemberScorecard({
      memberId: 'worker_support',
      entityType: 'AI_WORKER',
      roleId: 'Customer Support',
      events,
      period,
    });

    expect(scorecard.overallScore).toBeNull();
    expect(scorecard.grade).toBe('Insufficient Data');
    expect(scorecard.confidence).toBe('INSUFFICIENT');
  });

  it('calculates score and grade when sample size >= 5 verified tasks', () => {
    const events: PerformanceEvent[] = Array.from({ length: 6 }).map(
      (_, i) => ({
        eventId: `e_${i}`,
        eventType: 'TASK_COMPLETED',
        entityType: 'AI_WORKER',
        memberId: 'worker_sales',
        roleId: 'worker_sales',
        taskId: `t_${i}`,
        occurredAt: mockNow,
        recordedAt: mockNow,
        sourceSystem: 'test',
        verificationStatus: 'verified',
        evidenceRefs: [`t_${i}`],
        schemaVersion: '1.0.0',
      })
    );

    const scorecard = ScoreEngine.calculateMemberScorecard({
      memberId: 'worker_sales',
      entityType: 'AI_WORKER',
      roleId: 'Sales Conversion',
      events,
      period,
    });

    expect(scorecard.overallScore).not.toBeNull();
    expect(scorecard.overallScore).toBeGreaterThanOrEqual(80);
    expect(['Outstanding', 'Excellent', 'Good']).toContain(scorecard.grade);
    expect(scorecard.taskCounts.completed).toBe(6);
    expect(scorecard.taskCounts.verified).toBe(6);
  });

  it('awards cumulative achievement points for verified task deliverables', () => {
    const event: PerformanceEvent = {
      eventId: 'e_crit',
      eventType: 'TASK_COMPLETED',
      entityType: 'AI_WORKER',
      memberId: 'worker_execution',
      roleId: 'worker_execution',
      taskId: 't_deploy',
      complexity: 'critical',
      occurredAt: mockNow,
      recordedAt: mockNow,
      sourceSystem: 'test',
      verificationStatus: 'verified',
      evidenceRefs: ['t_deploy'],
      schemaVersion: '1.0.0',
    };

    const award = RecognitionEngine.calculatePointsForTask({ event });
    expect(award).not.toBeNull();
    expect(award?.basePoints).toBe(30); // Critical task base points = 30
    expect(award?.finalPoints).toBe(30);
    expect(award?.isReversal).toBe(false);

    // Test reversal
    const reversal = RecognitionEngine.createReversal(
      award!,
      'Task reopened by QA'
    );
    expect(reversal.finalPoints).toBe(-30);
    expect(reversal.isReversal).toBe(true);
  });
});
