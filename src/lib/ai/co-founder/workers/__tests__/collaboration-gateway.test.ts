// src/lib/ai/co-founder/workers/__tests__/collaboration-gateway.test.ts
//
// Unit tests for Worker-to-Worker and Co-Founder Collaboration Gateway.

jest.mock('server-only', () => ({}));

import { WorkerCollaborationGateway } from '../collaboration-gateway';

// Mock Supabase service
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

describe('WorkerCollaborationGateway', () => {
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
});
