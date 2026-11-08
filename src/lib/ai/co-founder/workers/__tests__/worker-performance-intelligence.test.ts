jest.mock('server-only', () => ({}));

import { performanceIntelligenceWorker } from '../worker-performance-intelligence';
import { workerRegistry } from '../registry';

describe('Worker: Performance Intelligence Worker', () => {
  it('correctly registers in workerRegistry with canonical ID and aliases', () => {
    const worker = workerRegistry.getWorker('worker_performance_intelligence');
    expect(worker).toBeDefined();
    expect(worker?.id).toBe('worker_performance_intelligence');

    const byAlias = workerRegistry.getWorker('performance_intelligence');
    expect(byAlias).toBeDefined();
    expect(byAlias?.id).toBe('worker_performance_intelligence');

    const byShort = workerRegistry.getWorker('auditor');
    expect(byShort).toBeDefined();
    expect(byShort?.id).toBe('worker_performance_intelligence');
  });

  it('reports valid WorkerDefinition matching system worker requirements', () => {
    const def = performanceIntelligenceWorker.getDefinition();
    expect(def.id).toBe('worker_performance_intelligence');
    expect(def.isSystemWorker).toBe(true);
    expect(def.responsibilities.length).toBeGreaterThan(3);
    expect(def.requiredTools).toContain('calculate_member_scorecard');
  });

  it('successfully executes a workforce audit task without crashing', async () => {
    const result = await performanceIntelligenceWorker.execute({
      task: 'Run complete workforce audit across AI workers',
      timeframe: '7d',
    });

    expect(result.workerId).toBe('worker_performance_intelligence');
    expect(result.executionStatus).toBe('executed');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.data).toBeDefined();
    expect(result.data?.report).toBeDefined();
    expect(result.data?.report.populationSummary).toBeDefined();
    expect(result.data?.report.scorecards.length).toBe(
      workerRegistry.getAllWorkers().length
    );
    const auditedIds = (result.data?.report.scorecards || []).map(
      (c: any) => c.memberId
    );
    expect(auditedIds).toContain('worker_performance_intelligence');
    expect(auditedIds).toContain('worker_security_intelligence');
  });

  it('generates target scorecard for a specific AI worker', async () => {
    const result = await performanceIntelligenceWorker.execute({
      task: 'Generate performance scorecard for worker_marketing',
      parameters: {
        memberId: 'worker_marketing',
      },
    });

    expect(result.workerId).toBe('worker_performance_intelligence');
    expect(result.executionStatus).toBe('executed');
    expect(result.findings.some((f) => f.includes('worker_marketing'))).toBe(
      true
    );
    expect(result.data?.scorecard).toBeDefined();
    expect(result.data?.scorecard.memberId).toBe('worker_marketing');
  });
});
