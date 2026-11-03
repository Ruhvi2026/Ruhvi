// src/lib/ai/co-founder/workers/__tests__/collaboration-gateway.test.ts
//
// Unit tests for Worker-to-Worker and Co-Founder Collaboration Gateway.

jest.mock('server-only', () => ({}));

import { WorkerCollaborationGateway } from '../collaboration-gateway';

// Mock Supabase service
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: mockInsert,
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
};
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => mockQueryBuilder),
  })),
}));

describe('WorkerCollaborationGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks circular self-delegation attempts immediately', async () => {
    const result = await WorkerCollaborationGateway.consultWorker({
      correlationId: 'corr-123',
      requesterWorkerId: 'worker_marketing',
      targetWorkerId: 'worker_marketing',
      task: 'Analyze marketing campaign',
    });

    expect(result.status).toBe('rejected');
    expect(result.uncertainty).toContain('Self-delegation');
  });

  it('blocks circular self-delegation when using aliases', async () => {
    const result = await WorkerCollaborationGateway.consultWorker({
      correlationId: 'corr-alias-self',
      requesterWorkerId: 'marketing' as any,
      targetWorkerId: 'worker_marketing',
      task: 'Analyze marketing campaign',
    });

    expect(result.status).toBe('rejected');
    expect(result.uncertainty).toContain('Self-delegation');
  });

  it('enforces maximum delegation depth of 2', async () => {
    const result = await WorkerCollaborationGateway.consultWorker({
      correlationId: 'corr-456',
      requesterWorkerId: 'worker_marketing',
      targetWorkerId: 'worker_seo',
      task: 'Inspect backlinks',
      depth: 3, // Exceeds max depth 2
    });

    expect(result.status).toBe('rejected');
    expect(result.uncertainty).toContain('Recursion limit');
  });

  it('rejects consultations targeted at unregistered workers', async () => {
    const result = await WorkerCollaborationGateway.consultWorker({
      correlationId: 'corr-789',
      requesterWorkerId: 'worker_marketing',
      targetWorkerId: 'worker_non_existent' as any,
      task: 'Do magic',
    });

    expect(result.status).toBe('rejected');
    expect(result.uncertainty).toContain('Unknown target worker');
  });

  it('executes Co-Founder consultation to a specialist worker successfully', async () => {
    const result = await WorkerCollaborationGateway.consultWorker({
      correlationId: 'corr-cf-seo',
      requesterWorkerId: 'co_founder',
      targetWorkerId: 'seo' as any, // alias resolution test
      task: 'Audit category meta tags',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.targetWorkerId).toBe('seo');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.trace.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('redacts sensitive API keys and tokens from audit log payloads', async () => {
    await WorkerCollaborationGateway.consultWorker({
      correlationId: 'corr-redact-test',
      requesterWorkerId: 'co_founder',
      targetWorkerId: 'worker_seo',
      task: 'Check backlinks using key sk-secret12345678901234567890 and Bearer eyJhbGciOiJIUzI1NiJ9.test',
    });

    // Give background async audit log a tick
    await new Promise((r) => setTimeout(r, 10));

    expect(mockInsert).toHaveBeenCalled();
    const lastCallArg =
      mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0];
    expect(lastCallArg.task).not.toContain('sk-secret');
    expect(lastCallArg.task).toContain('[REDACTED_SECRET]');
  });
});
