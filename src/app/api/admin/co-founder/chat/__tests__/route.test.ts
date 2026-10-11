import { NextRequest } from 'next/server';
import { POST } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { runAgenticStreamingSession } from '@/lib/ai/co-founder/streamer';
import { runCoFounderAgentLoop } from '@/lib/ai/co-founder/orchestrator';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    getAll: () => [],
    setAll: () => {},
  })),
}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/auth/rbac', () => ({
  getUserScopes: jest.fn(async () => ['admin:full']),
}));

jest.mock('@/lib/ai/co-founder/brain', () => ({
  getCoFounderSystemPrompt: jest.fn(
    async () => 'Prioritized system prompt for Co-Founder'
  ),
}));

jest.mock('@/lib/ai/co-founder/orchestrator', () => ({
  runCoFounderAgentLoop: jest.fn(),
}));

jest.mock('@/lib/ai/co-founder/streamer', () => ({
  runAgenticStreamingSession: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    from: () => ({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: [
              {
                key: 'ai_providers',
                value: [
                  {
                    id: 'openrouter',
                    type: 'openrouter',
                    isEnabled: true,
                    priority: 1,
                    apiKey: 'sk-or-test-key',
                    models: ['google/gemini-2.0-flash-001'],
                  },
                ],
              },
              {
                key: 'ai_features',
                value: {
                  co_founder: {
                    provider: 'openrouter',
                    model: 'google/gemini-2.0-flash-001',
                    agenticLoop: true,
                  },
                },
              },
            ],
          }),
      }),
    }),
  })),
}));

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockRunAgenticStreamingSession =
  runAgenticStreamingSession as jest.MockedFunction<
    typeof runAgenticStreamingSession
  >;
const mockRunCoFounderAgentLoop =
  runCoFounderAgentLoop as jest.MockedFunction<typeof runCoFounderAgentLoop>;

describe('Co-Founder Chat API Route (POST /api/admin/co-founder/chat)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthorized requests with 401 status', async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      uid: null,
      error: 'Unauthorized',
    } as any);

    const req = new NextRequest('http://localhost/api/admin/co-founder/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ text: 'Hello' }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('validates missing messages array with 400 status', async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: true,
      uid: 'admin_1',
      role: 'founder',
    } as any);

    const req = new NextRequest('http://localhost/api/admin/co-founder/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns standard JSON response when stream is not requested (backward compatibility)', async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: true,
      uid: 'admin_1',
      role: 'founder',
    } as any);

    mockRunCoFounderAgentLoop.mockResolvedValueOnce({
      success: true,
      responseText: 'Today total revenue is ₹65,000.',
      toolCallsExecuted: 1,
      steps: [],
      iterations: 1,
      modelUsed: 'google/gemini-2.0-flash-001',
      provider: 'openrouter',
    });

    const req = new NextRequest('http://localhost/api/admin/co-founder/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ sender: 'user', text: "What's today's sales?" }],
        stream: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.response).toBe('Today total revenue is ₹65,000.');
    expect(data.provider).toBe('openrouter');
    expect(data.model).toBe('google/gemini-2.0-flash-001');
  });

  it('routes to runAgenticStreamingSession and returns SSE stream when stream: true', async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: true,
      uid: 'admin_1',
      role: 'founder',
    } as any);

    const mockSSEResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'event: start\ndata: {"model":"google/gemini-2.0-flash-001"}\n\n'
            )
          );
          controller.close();
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      }
    );

    mockRunAgenticStreamingSession.mockResolvedValueOnce(mockSSEResponse);

    const req = new NextRequest('http://localhost/api/admin/co-founder/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        messages: [{ sender: 'user', text: 'Stream store health check' }],
        stream: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(mockRunAgenticStreamingSession).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        provider: 'openrouter',
        apiKey: 'sk-or-test-key',
      })
    );
  });
});
