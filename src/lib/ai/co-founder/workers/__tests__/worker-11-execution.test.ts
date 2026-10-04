jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/action-engine', () => ({
  executeApprovedBusinessAction: jest.fn().mockResolvedValue({
    success: true,
    actionType: 'update_inventory_stock',
    entityType: 'product',
    entityId: 'prod_123',
    voiceSummary: 'Stock for Royal Bengal Choker successfully updated to 25 units.',
  }),
}));

jest.mock('@/lib/ai/co-founder/action-planner', () => ({
  executeActionPlanToTaskManager: jest.fn().mockResolvedValue({
    success: true,
    planId: 'plan_456',
    tasksCreated: 3,
    checklistsCreated: 9,
    taskIds: ['task_1', 'task_2', 'task_3'],
    voiceSummary: 'Action plan successfully deployed into 3 tasks in Ruhvi Task Manager.',
  }),
}));

import { ExecutionWorker } from '../worker-11-execution';

describe('Worker 11: Execution Worker (System Worker)', () => {
  let worker: ExecutionWorker;

  beforeEach(() => {
    worker = new ExecutionWorker();
  });

  it('correctly declares worker identity and system worker status', () => {
    expect(worker.id).toBe('worker_execution');
    expect(worker.name).toBe('Execution Worker');
    expect(worker.priority).toBe('CRITICAL');

    const def = worker.getDefinition();
    expect(def.isSystemWorker).toBe(true);
    expect(def.role).toContain('Autonomous Operational Executor');
    expect(def.responsibilities).toContain(
      'Enforce strict human-in-the-loop approval gating (zero unapproved execution)'
    );
  });

  it('STRICTLY BLOCKS execution when no approval_id or plan_id is provided', async () => {
    const output = await worker.execute({
      task: 'Restock choker inventory directly without approval',
      parameters: {
        action_type: 'update_inventory_stock',
      },
    });

    expect(output.workerId).toBe('worker_execution');
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.requiredApproval).toBe(true);
    expect(output.findings[0]).toContain('EXECUTION BLOCKED');
    expect(output.problems[0]).toContain('Unauthorized execution attempt intercepted');
    expect(output.executiveVoiceSummary).toContain('cannot execute this action without your explicit approval');
  });

  it('safely executes an approved business action when approval_id is provided', async () => {
    const output = await worker.execute({
      task: 'Execute approved inventory restock',
      parameters: {
        approval_id: 'app_test_123',
        action_type: 'update_inventory_stock',
        action_payload: { productId: 'prod_123', newStock: 25 },
      },
    });

    expect(output.workerId).toBe('worker_execution');
    expect(output.executionStatus).toBe('executed');
    expect(output.requiredApproval).toBe(false);
    expect(output.findings[0]).toContain('executed successfully');
    expect(output.data?.whatWasChanged).toBeTruthy();
    expect(output.data?.whereItWasChanged).toBeTruthy();
    expect(output.recommendations.some((r) => r.includes('Worker 12'))).toBe(true);
  });

  it('safely executes an approved action plan to Task Manager when plan_id is provided', async () => {
    const output = await worker.execute({
      task: 'Execute approved Diwali launch action plan',
      parameters: {
        plan_id: 'plan_456',
      },
    });

    expect(output.workerId).toBe('worker_execution');
    expect(output.executionStatus).toBe('executed');
    expect(output.data?.whatWasChanged).toContain('Created 3 operational tasks');
    expect(output.executiveVoiceSummary).toContain('3 tasks in Ruhvi Task Manager');
  });

  it('handles execution engine failures cleanly', async () => {
    const { executeApprovedBusinessAction } = require('@/lib/ai/co-founder/action-engine');
    executeApprovedBusinessAction.mockResolvedValueOnce({
      success: false,
      error: 'Approval token has expired or already been executed',
    });

    const output = await worker.execute({
      task: 'Execute expired approval',
      parameters: {
        approval_id: 'app_expired',
        action_type: 'update_inventory_stock',
      },
    });

    expect(output.executionStatus).toBe('failed');
    expect(output.problems[0]).toContain('expired or already been executed');
  });
});
