jest.mock('server-only', () => ({}));

import {
  formatOpenAITools,
  normalizeOpenAIMessages,
  resolveOpenAIProviderEndpoint,
  runOpenAICompatibleAgentLoop,
  runCoFounderAgentLoop,
} from '../orchestrator';
import { executeCoFounderTool } from '../tool-bridge';
import { OpenRouterProvider } from '../../providers/openrouter';

// Mock tool-bridge
jest.mock('../tool-bridge', () => ({
  executeCoFounderTool: jest.fn(),
}));

const mockExecuteCoFounderTool = executeCoFounderTool as jest.MockedFunction<
  typeof executeCoFounderTool
>;

// Mock global fetch for API calls
const originalFetch = global.fetch;
let mockFetch: jest.Mock;

describe('Multi-Provider Gateway & OpenAI-Compatible Agent Loop (Step 6.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('formatOpenAITools', () => {
    it('normalizes tool declarations to OpenAI/OpenRouter schema structure', () => {
      const declarations = [
        {
          name: 'get_product_velocity',
          description: 'Calculates sales run rate',
          parameters: {
            type: 'OBJECT',
            properties: {
              sku: { type: 'STRING', description: 'Product SKU' },
              days: { type: 'NUMBER', description: 'Lookback window' },
            },
            required: ['sku'],
          },
        },
      ];

      const tools = formatOpenAITools(declarations);

      expect(tools).toHaveLength(1);
      expect(tools[0].type).toBe('function');
      expect(tools[0].function.name).toBe('get_product_velocity');
      expect(tools[0].function.description).toBe('Calculates sales run rate');
      expect(tools[0].function.parameters.type).toBe('object');
      expect(tools[0].function.parameters.properties.sku.type).toBe('string');
      expect(tools[0].function.parameters.properties.days.type).toBe('number');
      expect(tools[0].function.parameters.required).toEqual(['sku']);
    });

    it('returns empty array when declarations are null or empty', () => {
      expect(formatOpenAITools([])).toEqual([]);
      expect(formatOpenAITools(null as any)).toEqual([]);
    });
  });

  describe('normalizeOpenAIMessages', () => {
    it('prepends system instruction and maps sender to assistant/user', () => {
      const messages = [
        { sender: 'user', text: 'Nomoshkar Founder!' },
        { sender: 'assistant', text: 'Hello, how can I help?' },
        { role: 'user', content: 'What is our gross margin?' },
      ];

      const normalized = normalizeOpenAIMessages(
        messages,
        'You are Ruhvi AI Co-Founder.'
      );

      expect(normalized).toHaveLength(4);
      expect(normalized[0]).toEqual({
        role: 'system',
        content: 'You are Ruhvi AI Co-Founder.',
      });
      expect(normalized[1]).toEqual({
        role: 'user',
        content: 'Nomoshkar Founder!',
      });
      expect(normalized[2]).toEqual({
        role: 'assistant',
        content: 'Hello, how can I help?',
      });
      expect(normalized[3]).toEqual({
        role: 'user',
        content: 'What is our gross margin?',
      });
    });
  });

  describe('resolveOpenAIProviderEndpoint', () => {
    it('resolves OpenRouter endpoint and headers with HTTP-Referer and title', () => {
      const config = resolveOpenAIProviderEndpoint('openrouter', 'sk-or-test-key');

      expect(config.endpoint).toBe(
        'https://openrouter.ai/api/v1/chat/completions'
      );
      expect(config.headers['Authorization']).toBe('Bearer sk-or-test-key');
      expect(config.headers['HTTP-Referer']).toBe('https://ruhvi.in');
      expect(config.headers['X-Title']).toBe('Ruhvi AI Co-Founder');
      expect(config.defaultModel).toBe('google/gemini-2.0-flash-001');
    });

    it('resolves OpenAI endpoint and headers', () => {
      const config = resolveOpenAIProviderEndpoint('openai', 'sk-oai-test-key');

      expect(config.endpoint).toBe('https://api.openai.com/v1/chat/completions');
      expect(config.headers['Authorization']).toBe('Bearer sk-oai-test-key');
      expect(config.defaultModel).toBe('gpt-4o-mini');
    });

    it('resolves DeepSeek endpoint and headers', () => {
      const config = resolveOpenAIProviderEndpoint('deepseek', 'sk-ds-test-key');

      expect(config.endpoint).toBe('https://api.deepseek.com/chat/completions');
      expect(config.headers['Authorization']).toBe('Bearer sk-ds-test-key');
      expect(config.defaultModel).toBe('deepseek-chat');
    });

    it('resolves Custom Gateway endpoint with custom baseUrl', () => {
      const config = resolveOpenAIProviderEndpoint('custom', 'my-secret', {
        baseUrl: 'https://gateway.internal.ruhvi.in/v1/',
      });

      expect(config.endpoint).toBe(
        'https://gateway.internal.ruhvi.in/v1/chat/completions'
      );
      expect(config.headers['Authorization']).toBe('Bearer my-secret');
    });
  });

  describe('runOpenAICompatibleAgentLoop', () => {
    it('executes single-turn text answer with OpenRouter when no tools are requested', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Ruhvi achieved ₹85,000 revenue today across 14 orders.',
              },
            },
          ],
        }),
      });

      const result = await runOpenAICompatibleAgentLoop(
        [{ sender: 'user', text: "What's today's sales?" }],
        {
          provider: 'openrouter',
          apiKey: 'sk-or-test',
          modelName: 'google/gemini-2.0-flash-001',
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseText).toContain('₹85,000');
      expect(result.toolCallsExecuted).toBe(0);
      expect(result.iterations).toBe(1);
      expect(result.provider).toBe('openrouter');
      expect(result.modelUsed).toBe('google/gemini-2.0-flash-001');
    });

    it('executes tool calling loop over OpenRouter and synthesizes final answer', async () => {
      // Turn 1: Model returns tool_calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_abc_1',
                    type: 'function',
                    function: {
                      name: 'get_days_of_inventory',
                      arguments: '{"category":"necklaces"}',
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      // Tool execution mock
      mockExecuteCoFounderTool.mockResolvedValueOnce({
        toolName: 'get_days_of_inventory',
        success: true,
        data: { daysOfInventory: 18.5, depletionDate: '2026-10-29' },
        summaryForVoice: 'Necklaces category has 18.5 days of inventory remaining.',
      });

      // Turn 2: Model receives tool result and returns final answer
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content:
                  'Our necklaces have 18.5 days of inventory left before stock-out.',
              },
            },
          ],
        }),
      });

      const result = await runOpenAICompatibleAgentLoop(
        [{ sender: 'user', text: 'How many days of necklace stock do we have?' }],
        {
          provider: 'openrouter',
          apiKey: 'sk-or-test',
        }
      );

      expect(result.success).toBe(true);
      expect(result.toolCallsExecuted).toBe(1);
      expect(result.iterations).toBe(2);
      expect(result.responseText).toContain('18.5 days');
      expect(mockExecuteCoFounderTool).toHaveBeenCalledWith(
        'get_days_of_inventory',
        { category: 'necklaces' },
        expect.any(Array)
      );

      // Verify Turn 2 request included tool role message
      const turn2Body = JSON.parse(mockFetch.mock.calls[1][1].body);
      const toolMsg = turn2Body.messages.find((m: any) => m.role === 'tool');
      expect(toolMsg).toBeDefined();
      expect(toolMsg.tool_call_id).toBe('call_abc_1');
      expect(JSON.parse(toolMsg.content).summary).toContain('18.5 days');
    });

    it('intercepts human approval requirement and halts loop immediately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_urgent',
                    type: 'function',
                    function: {
                      name: 'dispatch_worker_task',
                      arguments: '{"worker_id":"worker_execution","task":"Change price"}',
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      mockExecuteCoFounderTool.mockResolvedValueOnce({
        toolName: 'dispatch_worker_task',
        success: true,
        data: {
          pendingApprovalId: 'app_price_99',
          requiresApproval: true,
        },
        summaryForVoice: 'Price adjustment paused pending approval.',
      });

      const result = await runOpenAICompatibleAgentLoop(
        [{ sender: 'user', text: 'Change price of Silver Choker to ₹2999' }],
        { provider: 'openrouter', apiKey: 'sk-or-test' }
      );

      expect(result.success).toBe(true);
      expect(result.pausedForApproval).toBe(true);
      expect(result.pendingApproval?.pendingApprovalId).toBe('app_price_99');
      // Loop halted without 2nd fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('runCoFounderAgentLoop multi-provider fallback', () => {
    it('fails over to secondary provider in fallbackChain when primary fails', async () => {
      // Primary provider (OpenRouter) fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'OpenRouter Service Unavailable',
      });

      // Fallback provider (DeepSeek) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Response delivered via DeepSeek fallback.',
              },
            },
          ],
        }),
      });

      const result = await runCoFounderAgentLoop(
        [{ sender: 'user', text: 'Analyze orders' }],
        {
          provider: 'openrouter',
          apiKey: 'sk-or-bad-key',
          fallbackChain: [
            {
              provider: 'deepseek',
              apiKey: 'sk-ds-valid-key',
              modelName: 'deepseek-chat',
            },
          ],
        }
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('deepseek');
      expect(result.responseText).toBe('Response delivered via DeepSeek fallback.');
    });
  });

  describe('OpenRouterProvider.generateWithTools', () => {
    it('sends structured tools to OpenRouter API and parses function tool calls', async () => {
      const provider = new OpenRouterProvider();
      provider.initialize('sk-test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: {
                      name: 'get_store_metrics',
                      arguments: '{"date_range":"today"}',
                    },
                  },
                ],
              },
            },
          ],
          usage: { total_tokens: 150 },
        }),
      });

      const res = await provider.generateWithTools(
        'Check store metrics',
        'google/gemini-2.0-flash-001',
        [
          {
            name: 'get_store_metrics',
            description: 'Get metrics',
            parameters: { type: 'object', properties: {} },
            execute: async () => ({}),
          },
        ]
      );

      expect(res.toolCalls).toHaveLength(1);
      expect(res.toolCalls![0].name).toBe('get_store_metrics');
      expect(res.toolCalls![0].args).toEqual({ date_range: 'today' });
      expect(res.usage.tokens).toBe(150);
    });
  });
});
