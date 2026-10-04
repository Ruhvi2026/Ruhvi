jest.mock('server-only', () => ({}));

const mockTickets = [
  {
    id: 'tick_1',
    user_id: 'user_1',
    subject: 'Where is my Blue Dart package?',
    description: 'Order placed 3 days ago, tracking says in transit.',
    status: 'open',
    priority: 'urgent',
    category: 'shipping',
  },
  {
    id: 'tick_2',
    user_id: 'user_2',
    subject: 'Choker sizing question',
    description: 'Will this choker fit an 11-inch neck?',
    status: 'open',
    priority: 'medium',
    category: 'product',
  },
  {
    id: 'tick_3',
    user_id: 'user_3',
    subject: 'Anti-tarnish warranty query',
    description: 'Can I spray perfume while wearing this gold plated necklace?',
    status: 'resolved',
    priority: 'low',
    category: 'care',
  },
];

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: mockTickets,
      error: null,
    })
  ),
};

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue(mockQueryBuilder),
  }),
}));

import { CustomerSupportWorker } from '../worker-7-support';

describe('Worker 7: Customer Support Worker', () => {
  let worker: CustomerSupportWorker;

  beforeEach(() => {
    worker = new CustomerSupportWorker();
  });

  it('correctly declares worker identity and responsibilities', () => {
    expect(worker.id).toBe('worker_customer_support');
    expect(worker.name).toBe('Customer Support Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.role).toContain('Customer Experience');
    expect(def.responsibilities).toContain(
      'Draft empathetic, brand-aligned responses tailored to luxury demi-fine jewellery buyers'
    );
  });

  it('audits support queue, flags urgent tickets, and creates response draft', async () => {
    const output = await worker.execute({
      task: 'Audit customer support tickets and draft response for tracking questions',
    });

    expect(output.workerId).toBe('worker_customer_support');
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.problems.some((p) => p.includes('urgent/high-priority'))).toBe(true);
    expect(output.data?.suggestedResponseDraft).toBeDefined();
    expect(output.data?.suggestedResponseDraft.body).toContain('Blue Dart');
    expect(output.requiredApproval).toBe(false);
    expect(output.priority).toBe('critical'); // urgent ticket present
    expect(output.executiveVoiceSummary).toContain('Customer support audit complete');
  });

  it('requires explicit approval when sending messages or updating tickets', async () => {
    const output = await worker.execute({
      task: 'Send customer reply and close ticket tick_1',
    });

    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.requiredAction).toContain('Send customer responses');
  });

  it('handles database error gracefully', async () => {
    mockQueryBuilder.limit.mockImplementationOnce(() =>
      Promise.resolve({
        data: null,
        error: { message: 'Support ticket table unreachable' },
      })
    );

    const output = await worker.execute({
      task: 'Check support queue',
    });

    expect(output.workerId).toBe('worker_customer_support');
    expect(output.findings.length).toBeGreaterThan(0);
  });
});
