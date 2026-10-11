jest.mock('server-only', () => ({}));

import {
  getSSEHeaders,
  formatSSEMessage,
  createSSEStream,
  streamTextInChunks,
  runAgenticStreamingSession,
  parseSSEChunk,
  type SSEEventType,
} from '../streamer';
import { runCoFounderAgentLoop } from '../orchestrator';

// Mock orchestrator
jest.mock('../orchestrator', () => {
  const actual = jest.requireActual('../orchestrator');
  return {
    ...actual,
    runCoFounderAgentLoop: jest.fn(),
  };
});

const mockRunCoFounderAgentLoop = runCoFounderAgentLoop as jest.MockedFunction<
  typeof runCoFounderAgentLoop
>;

describe('Streaming SSE & Real-Time Agentic Protocol (Phase 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSSEHeaders', () => {
    it('returns W3C-compliant SSE headers with caching and proxy buffering disabled', () => {
      const headers = getSSEHeaders();

      expect(headers['Content-Type']).toBe('text/event-stream; charset=utf-8');
      expect(headers['Cache-Control']).toContain('no-cache');
      expect(headers['Cache-Control']).toContain('no-transform');
      expect(headers['Connection']).toBe('keep-alive');
      expect(headers['X-Accel-Buffering']).toBe('no');
    });

    it('merges custom headers cleanly', () => {
      const headers = getSSEHeaders({
        customHeaders: {
          'X-Custom-Trace': 'trace-1234',
        },
      });

      expect(headers['X-Custom-Trace']).toBe('trace-1234');
      expect(headers['Content-Type']).toBe('text/event-stream; charset=utf-8');
    });
  });

  describe('formatSSEMessage', () => {
    it('formats a typed SSE message with event and JSON serialized data', () => {
      const formatted = formatSSEMessage('start', { model: 'gemini-2.0-flash' });

      expect(formatted).toBe(
        'event: start\ndata: {"model":"gemini-2.0-flash"}\n\n'
      );
    });

    it('includes optional event id when provided', () => {
      const formatted = formatSSEMessage('token', 'Hello', 'msg_101');

      expect(formatted).toBe('id: msg_101\nevent: token\ndata: Hello\n\n');
    });

    it('handles plain string data without extra json quotes', () => {
      const formatted = formatSSEMessage('thought', 'Analyzing store database...');

      expect(formatted).toBe('event: thought\ndata: Analyzing store database...\n\n');
    });

    it('handles null/undefined data safely as empty object', () => {
      const formatted = formatSSEMessage('done', null);

      expect(formatted).toBe('event: done\ndata: {}\n\n');
    });
  });

  describe('createSSEStream', () => {
    it('creates a ReadableStream, Response, and functional SSEWriter controller', async () => {
      const { stream, writer, response } = createSSEStream();

      expect(stream).toBeInstanceOf(ReadableStream);
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe(
        'text/event-stream; charset=utf-8'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      writer.sendStart({ model: 'gemini-2.0-flash', sessionId: 'sess_1' });
      writer.sendToken('Namaskar', 0);
      writer.close();

      let chunks = '';
      let done = false;
      while (!done) {
        const readResult = await reader.read();
        done = readResult.done;
        if (readResult.value) {
          chunks += decoder.decode(readResult.value);
        }
      }

      const events = parseSSEChunk(chunks);
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('start');
      expect(events[0].data.model).toBe('gemini-2.0-flash');
      expect(events[0].data.sessionId).toBe('sess_1');

      expect(events[1].event).toBe('token');
      expect(events[1].data.token).toBe('Namaskar');
      expect(events[1].data.index).toBe(0);
    });

    it('supports all typed writer emission methods', async () => {
      const { stream, writer } = createSSEStream();
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      writer.sendThought('Calculating restock batches...');
      writer.sendToolCallStart({
        toolName: 'get_product_velocity',
        args: { sku: 'RUV-SLV-001' },
        iteration: 1,
      });
      writer.sendToolCallResult({
        toolName: 'get_product_velocity',
        success: true,
        summary: 'Velocity is 4.2 units/day',
        data: { velocity: 4.2 },
        iteration: 1,
      });
      writer.sendApprovalRequired({
        toolName: 'dispatch_worker_task',
        pendingApprovalId: 'app_42',
        details: { action: 'order_supplier_batch' },
      });
      writer.sendAgentStep({
        iteration: 1,
        thought: 'Inventory check complete',
      });
      writer.sendDone({
        responseText: 'Restock initiated.',
        iterations: 1,
        toolCallsExecuted: 1,
      });
      writer.sendError({
        message: 'Timeout error',
        code: 'TIMEOUT',
      });
      writer.close();

      let chunks = '';
      let done = false;
      while (!done) {
        const readResult = await reader.read();
        done = readResult.done;
        if (readResult.value) {
          chunks += decoder.decode(readResult.value);
        }
      }

      const events = parseSSEChunk(chunks);
      const eventTypes = events.map((e) => e.event);

      expect(eventTypes).toContain('thought');
      expect(eventTypes).toContain('tool_call_start');
      expect(eventTypes).toContain('tool_call_result');
      expect(eventTypes).toContain('approval_required');
      expect(eventTypes).toContain('agent_step');
      expect(eventTypes).toContain('done');
      expect(eventTypes).toContain('error');
    });
  });

  describe('streamTextInChunks', () => {
    it('splits sentence into word chunks and calls onChunk sequentially', async () => {
      const captured: string[] = [];
      const text = 'Today sales are ₹45,000 across 8 orders.';

      await streamTextInChunks(
        text,
        (chunk) => {
          captured.push(chunk);
        },
        { chunkSize: 2, delayMs: 0 }
      );

      expect(captured.length).toBeGreaterThan(1);
      expect(captured.join('')).toBe(text);
    });

    it('handles empty or blank text safely without error', async () => {
      const captured: string[] = [];
      await streamTextInChunks('', (chunk) => {
        captured.push(chunk);
      });
      expect(captured).toHaveLength(0);
    });

    it('handles single word text', async () => {
      const captured: string[] = [];
      await streamTextInChunks(
        'Congratulations!',
        (chunk) => {
          captured.push(chunk);
        },
        { delayMs: 0 }
      );
      expect(captured).toEqual(['Congratulations!']);
    });
  });

  describe('parseSSEChunk', () => {
    it('parses single SSE block with JSON payload and id', () => {
      const raw = 'id: 42\nevent: start\ndata: {"model":"gemini-2.0-flash"}\n\n';
      const events = parseSSEChunk(raw);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('42');
      expect(events[0].event).toBe('start');
      expect(events[0].data).toEqual({ model: 'gemini-2.0-flash' });
    });

    it('parses multiple SSE blocks from a concatenated chunk', () => {
      const raw =
        'event: token\ndata: {"token":"Hello"}\n\n' +
        'event: token\ndata: {"token":" Founder"}\n\n' +
        'event: done\ndata: {"iterations":2}\n\n';

      const events = parseSSEChunk(raw);
      expect(events).toHaveLength(3);
      expect(events[0].event).toBe('token');
      expect(events[0].data).toEqual({ token: 'Hello' });
      expect(events[1].event).toBe('token');
      expect(events[1].data).toEqual({ token: ' Founder' });
      expect(events[2].event).toBe('done');
      expect(events[2].data).toEqual({ iterations: 2 });
    });

    it('falls back to string data when json parsing fails', () => {
      const raw = 'event: thought\ndata: Thinking about marketing strategy...\n\n';
      const events = parseSSEChunk(raw);

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('thought');
      expect(events[0].data).toBe('Thinking about marketing strategy...');
    });

    it('handles empty input gracefully', () => {
      expect(parseSSEChunk('')).toEqual([]);
      expect(parseSSEChunk('   \n\n  ')).toEqual([]);
    });
  });

  describe('runAgenticStreamingSession', () => {
    it('executes streaming agent loop and emits structured SSE lifecycle events', async () => {
      // Mock agent loop execution
      mockRunCoFounderAgentLoop.mockImplementationOnce(async (_msgs, opts) => {
        // Trigger simulated onStep
        if (opts.onStep) {
          await opts.onStep({
            iteration: 1,
            toolCalls: [
              {
                name: 'get_store_metrics',
                args: { date_range: 'today' },
              },
            ],
            toolResults: [
              {
                toolName: 'get_store_metrics',
                success: true,
                summaryForVoice: 'Today revenue is ₹50,000',
                data: { revenue: 50000 },
              },
            ],
          });
        }

        return {
          success: true,
          responseText: 'Today revenue is ₹50,000.',
          toolCallsExecuted: 1,
          steps: [],
          iterations: 1,
          modelUsed: 'gemini-2.0-flash',
          provider: 'gemini',
        };
      });

      const response = await runAgenticStreamingSession(
        [{ sender: 'user', text: "What's today's revenue?" }],
        {
          apiKey: 'mock_key',
          modelName: 'gemini-2.0-flash',
          sessionId: 'test_session_101',
          tokenDelayMs: 0,
        }
      );

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');

      // Read complete stream output
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let streamedOutput = '';
      let done = false;

      while (!done) {
        const res = await reader.read();
        done = res.done;
        if (res.value) {
          streamedOutput += decoder.decode(res.value);
        }
      }

      const events = parseSSEChunk(streamedOutput);
      const eventNames = events.map((e) => e.event);

      // Verify lifecycle event sequence
      expect(eventNames).toContain('start');
      expect(eventNames).toContain('agent_step');
      expect(eventNames).toContain('tool_call_start');
      expect(eventNames).toContain('tool_call_result');
      expect(eventNames).toContain('token');
      expect(eventNames).toContain('done');

      // Verify done event payload
      const doneEvent = events.find((e) => e.event === 'done');
      expect(doneEvent?.data.responseText).toBe('Today revenue is ₹50,000.');
      expect(doneEvent?.data.toolCallsExecuted).toBe(1);
    });

    it('emits approval_required event when high-impact step pauses for human approval', async () => {
      mockRunCoFounderAgentLoop.mockImplementationOnce(async (_msgs, opts) => {
        if (opts.onStep) {
          await opts.onStep({
            iteration: 1,
            requiresApproval: true,
            approvalDetails: {
              toolName: 'worker_execution',
              pendingApprovalId: 'app_urgent_77',
            },
          });
        }

        return {
          success: true,
          responseText: 'Action paused awaiting approval.',
          toolCallsExecuted: 1,
          steps: [],
          iterations: 1,
          modelUsed: 'gemini-2.0-flash',
          provider: 'gemini',
          pausedForApproval: true,
          pendingApproval: { pendingApprovalId: 'app_urgent_77' },
        };
      });

      const response = await runAgenticStreamingSession(
        [{ sender: 'user', text: 'Apply bulk discount' }],
        {
          apiKey: 'mock_key',
          sessionId: 'test_approval_sess',
          tokenDelayMs: 0,
        }
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let streamedOutput = '';
      let done = false;

      while (!done) {
        const res = await reader.read();
        done = res.done;
        if (res.value) {
          streamedOutput += decoder.decode(res.value);
        }
      }

      const events = parseSSEChunk(streamedOutput);
      const approvalEvent = events.find((e) => e.event === 'approval_required');

      expect(approvalEvent).toBeDefined();
      expect(approvalEvent?.data.pendingApprovalId).toBe('app_urgent_77');
    });

    it('emits error event when agent loop fails or throws an exception', async () => {
      mockRunCoFounderAgentLoop.mockResolvedValueOnce({
        success: false,
        responseText: '',
        toolCallsExecuted: 0,
        steps: [],
        iterations: 0,
        modelUsed: 'none',
        provider: 'gemini',
        error: 'Quota exceeded on all candidate models',
      });

      const response = await runAgenticStreamingSession(
        [{ sender: 'user', text: 'Query metrics' }],
        { apiKey: 'mock_key', tokenDelayMs: 0 }
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let streamedOutput = '';
      let done = false;

      while (!done) {
        const res = await reader.read();
        done = res.done;
        if (res.value) {
          streamedOutput += decoder.decode(res.value);
        }
      }

      const events = parseSSEChunk(streamedOutput);
      const errorEvent = events.find((e) => e.event === 'error');

      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('Quota exceeded');
    });
  });
});
