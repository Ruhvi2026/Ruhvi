jest.mock('server-only', () => ({}));

import {
  formatGeminiFunctionDeclarations,
  normalizeGeminiHistory,
  runCoFounderAgentLoop,
} from '../orchestrator';
import { SchemaType } from '@google/generative-ai';
import { executeCoFounderTool } from '../tool-bridge';

// Mock tool-bridge
jest.mock('../tool-bridge', () => ({
  executeCoFounderTool: jest.fn(),
}));

const mockExecuteCoFounderTool = executeCoFounderTool as jest.MockedFunction<
  typeof executeCoFounderTool
>;

// Mock global.fetch for Gemini REST API
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockGeminiText(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    }),
  };
}

function mockGeminiFunctionCall(name: string, args: any) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name, args } }],
          },
        },
      ],
    }),
  };
}

describe('Co-Founder Agent Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatGeminiFunctionDeclarations', () => {
    it('normalizes string types to SchemaType enum values', () => {
      const rawDecls = [
        {
          name: 'get_orders',
          description: 'Fetch orders',
          parameters: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', description: 'Order status' },
              limit: { type: 'NUMBER', description: 'Count' },
              active: { type: 'BOOLEAN', description: 'Is active' },
              items: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['status'],
          },
        },
      ];

      const formatted = formatGeminiFunctionDeclarations(rawDecls);

      expect(formatted).toHaveLength(1);
      expect(formatted[0].name).toBe('get_orders');
      expect(formatted[0].description).toBe('Fetch orders');
      expect(formatted[0].parameters?.type).toBe(SchemaType.OBJECT);
      expect(formatted[0].parameters?.properties.status.type).toBe(
        SchemaType.STRING
      );
      expect(formatted[0].parameters?.properties.limit.type).toBe(
        SchemaType.NUMBER
      );
      expect(formatted[0].parameters?.properties.active.type).toBe(
        SchemaType.BOOLEAN
      );
      expect(formatted[0].parameters?.properties.items.type).toBe(
        SchemaType.ARRAY
      );
      expect(formatted[0].parameters?.required).toEqual(['status']);
    });

    it('handles tools with empty or missing parameters', () => {
      const rawDecls = [
        {
          name: 'get_pending_approvals',
          description: 'List approvals',
        },
      ];

      const formatted = formatGeminiFunctionDeclarations(rawDecls);
      expect(formatted).toHaveLength(1);
      expect(formatted[0].name).toBe('get_pending_approvals');
      expect(formatted[0].parameters?.type).toBe(SchemaType.OBJECT);
    });
  });

  describe('normalizeGeminiHistory', () => {
    it('drops leading model messages until the first user message', () => {
      const messages = [
        { sender: 'model', text: 'Hello! How can I help?' },
        { sender: 'model', text: 'Still waiting...' },
        { sender: 'user', text: 'Show today sales' },
        { sender: 'model', text: 'Today sales are 50k' },
        { sender: 'user', text: 'Now show orders' }, // latest message (sliced off in history)
      ];

      const history = normalizeGeminiHistory(messages);

      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].parts[0].text).toBe('Show today sales');
      expect(history[1].role).toBe('model');
      expect(history[1].parts[0].text).toBe('Today sales are 50k');
    });

    it('enforces strict role alternation (user -> model -> user -> model)', () => {
      const messages = [
        { sender: 'user', text: 'First query' },
        { sender: 'user', text: 'Double query without answer' }, // should be ignored to preserve alternation
        { sender: 'model', text: 'First answer' },
        { sender: 'user', text: 'Third query' },
      ];

      const history = normalizeGeminiHistory(messages);

      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].parts[0].text).toBe('First query');
      expect(history[1].role).toBe('model');
      expect(history[1].parts[0].text).toBe('First answer');
    });

    it('returns empty array when history contains no user message', () => {
      const messages = [{ sender: 'model', text: 'System greeting' }];
      expect(normalizeGeminiHistory(messages)).toEqual([]);
    });
  });

  describe('runCoFounderAgentLoop', () => {
    it('returns error when user prompt is empty', async () => {
      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: '   ' }],
        { apiKey: 'fake_key' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty prompt');
    });

    it('returns error when apiKey is missing', async () => {
      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'What are orders?' }],
        { apiKey: '' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing API key');
    });

    it('executes single-turn text answer with 0 tools when model does not call functions', async () => {
      mockFetch.mockResolvedValueOnce(
        mockGeminiText('Ruhvi is an artisanal silver jewellery brand.')
      );

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'Tell me about Ruhvi' }],
        { apiKey: 'test_gemini_key' }
      );

      expect(result.success).toBe(true);
      expect(result.responseText).toBe(
        'Ruhvi is an artisanal silver jewellery brand.'
      );
      expect(result.toolCallsExecuted).toBe(0);
      expect(result.iterations).toBe(1);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].thought).toBe(
        'Ruhvi is an artisanal silver jewellery brand.'
      );
    });

    it('executes autonomous tool call, feeds result back, and returns synthesized answer', async () => {
      // Turn 1: Model calls get_store_metrics
      mockFetch.mockResolvedValueOnce(
        mockGeminiFunctionCall('get_store_metrics', { date_range: 'today' })
      );

      // Tool execution mock
      mockExecuteCoFounderTool.mockResolvedValueOnce({
        toolName: 'get_store_metrics',
        success: true,
        data: { totalRevenue: 125000, ordersCount: 18, aov: 6944 },
        summaryForVoice: 'Today total revenue is 1.25 lakh with 18 orders.',
      });

      // Turn 2: Model synthesizes answer
      mockFetch.mockResolvedValueOnce(
        mockGeminiText(
          'Today Ruhvi generated ₹1,25,000 across 18 orders with an AOV of ₹6,944.'
        )
      );

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: "What are today's sales metrics?" }],
        { apiKey: 'test_gemini_key' }
      );

      expect(result.success).toBe(true);
      expect(result.toolCallsExecuted).toBe(1);
      expect(result.iterations).toBe(2);
      expect(result.responseText).toContain('₹1,25,000');
      expect(mockExecuteCoFounderTool).toHaveBeenCalledWith(
        'get_store_metrics',
        { date_range: 'today' },
        expect.any(Array)
      );

      // Verify function response was passed back in turn 2
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          body: expect.stringContaining('"name":"get_store_metrics"'),
        })
      );
    });

    it('supports multi-turn tool chaining (Tool 1 -> Result -> Tool 2 -> Result -> Answer)', async () => {
      // Turn 1: Model calls get_orders
      mockFetch.mockResolvedValueOnce(
        mockGeminiFunctionCall('get_orders', { status: 'placed', limit: 5 })
      );

      mockExecuteCoFounderTool.mockResolvedValueOnce({
        toolName: 'get_orders',
        success: true,
        data: [{ id: 'ord_1', total: 4500 }],
        summaryForVoice: 'There is 1 placed order.',
      });

      // Turn 2: Model calls get_inventory_levels
      mockFetch.mockResolvedValueOnce(
        mockGeminiFunctionCall('get_inventory_levels', { status: 'low_stock' })
      );

      mockExecuteCoFounderTool.mockResolvedValueOnce({
        toolName: 'get_inventory_levels',
        success: true,
        data: [{ name: 'Silver Choker', stock: 2 }],
        summaryForVoice: 'Silver Choker has only 2 items in stock.',
      });

      // Turn 3: Final synthesis
      mockFetch.mockResolvedValueOnce(
        mockGeminiText(
          'You have 1 newly placed order and 1 low-stock item (Silver Choker with 2 units left).'
        )
      );

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'Give me a complete store update.' }],
        { apiKey: 'test_gemini_key' }
      );

      expect(result.success).toBe(true);
      expect(result.toolCallsExecuted).toBe(2);
      expect(result.iterations).toBe(3);
      expect(result.responseText).toContain('Silver Choker');
    });

    it('halts loop safely when maximum iterations guard is reached', async () => {
      // Constantly return tool call
      mockFetch.mockResolvedValue(
        mockGeminiFunctionCall('get_store_metrics', {})
      );

      mockExecuteCoFounderTool.mockResolvedValue({
        toolName: 'get_store_metrics',
        success: true,
        data: {},
        summaryForVoice: 'Metrics',
      });

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'Keep querying' }],
        { apiKey: 'test_gemini_key', maxIterations: 3 }
      );

      expect(result.iterations).toBe(3);
      expect(result.toolCallsExecuted).toBe(3);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('recovers gracefully from tool execution error without crashing the loop', async () => {
      // Turn 1: Model calls tool that fails
      mockFetch.mockResolvedValueOnce(
        mockGeminiFunctionCall('get_store_metrics', {})
      );

      // Tool throws error
      mockExecuteCoFounderTool.mockRejectedValueOnce(
        new Error('Database timeout')
      );

      // Turn 2: Model receives error and explains
      mockFetch.mockResolvedValueOnce(
        mockGeminiText(
          'I encountered a database timeout while fetching store metrics. Please check connection.'
        )
      );

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'Get metrics' }],
        { apiKey: 'test_gemini_key' }
      );

      expect(result.success).toBe(true);
      expect(result.responseText).toContain('database timeout');
      expect(result.steps[0].toolResults![0].success).toBe(false);
      expect(result.steps[0].toolResults![0].error).toBe('Database timeout');
    });

    it('intercepts human approval requirement and halts loop immediately', async () => {
      // Turn 1: Model calls high-impact write action
      mockFetch.mockResolvedValueOnce(
        mockGeminiFunctionCall('dispatch_worker_task', {
          worker_id: 'worker_execution',
          task: 'Archive low stock SKU',
        })
      );

      // Tool returns pending approval requirement
      mockExecuteCoFounderTool.mockResolvedValueOnce({
        toolName: 'dispatch_worker_task',
        success: true,
        data: {
          pendingApprovalId: 'app_test_999',
          requiresApproval: true,
          actionType: 'archive_sku',
        },
        summaryForVoice: 'Action paused pending founder approval.',
      });

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'Archive that SKU now' }],
        { apiKey: 'test_gemini_key' }
      );

      expect(result.success).toBe(true);
      expect(result.pausedForApproval).toBe(true);
      expect(result.pendingApproval).toEqual({
        toolName: 'dispatch_worker_task',
        args: {
          worker_id: 'worker_execution',
          task: 'Archive low stock SKU',
        },
        result: expect.objectContaining({
          pendingApprovalId: 'app_test_999',
        }),
        pendingApprovalId: 'app_test_999',
      });
      expect(result.responseText).toContain('founder approval');
      // Verify loop did NOT make second LLM call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
