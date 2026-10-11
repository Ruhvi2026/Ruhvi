jest.mock('server-only', () => ({}));

import {
  classifyError,
  startSpan,
  CoFounderTelemetryStore,
  recordLLMTelemetry,
  recordToolTelemetry,
  getTelemetrySummary,
  resetTelemetry,
  runCoFounderHealthCanary,
  telemetry,
} from '../telemetry';

// Mock Supabase service client for canary probe
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [{ id: 'prod_1' }], error: null })),
      })),
    })),
  })),
}));

describe('Phase 10 Step 2 — Telemetry, OpenTelemetry Spans & Production Canary', () => {
  beforeEach(() => {
    resetTelemetry();
  });

  describe('Error Classification Taxonomy', () => {
    it('accurately classifies rate limits', () => {
      expect(classifyError({ status: 429, message: 'Too many requests' })).toBe('rate_limit');
      expect(classifyError(new Error('Rate limit quota exceeded'))).toBe('rate_limit');
    });

    it('accurately classifies authentication and permission denials', () => {
      expect(classifyError({ status: 403, message: 'Forbidden' })).toBe('auth_denied');
      expect(classifyError(new Error('Missing permission: products:write'))).toBe('auth_denied');
      expect(classifyError({ code: 401, message: 'Unauthorized session' })).toBe('auth_denied');
    });

    it('accurately classifies network and upstream timeouts', () => {
      expect(classifyError({ status: 504, message: 'Gateway timeout' })).toBe('upstream_timeout');
      expect(classifyError(new Error('Connection ETIMEDOUT'))).toBe('upstream_timeout');
    });

    it('accurately classifies validation and schema errors', () => {
      expect(classifyError({ status: 422, message: 'Unprocessable entity' })).toBe('validation_error');
      expect(classifyError(new Error('Zod validation failed on parameter quantity'))).toBe('validation_error');
    });

    it('accurately classifies budget and context limits', () => {
      expect(classifyError(new Error('Session token budget exhausted'))).toBe('budget_exhausted');
    });

    it('accurately classifies upstream server errors', () => {
      expect(classifyError({ status: 502, message: 'Bad Gateway' })).toBe('upstream_error');
      expect(classifyError(new Error('Gemini API returned 503 Service Unavailable'))).toBe('upstream_error');
    });

    it('falls back to internal_error for unclassified exceptions', () => {
      expect(classifyError(new Error('Unknown memory glitch'))).toBe('internal_error');
      expect(classifyError(null)).toBe('internal_error');
    });
  });

  describe('OpenTelemetry-Compatible Spans', () => {
    it('creates span with trace context, attributes, and duration timing', () => {
      const span = startSpan('co_founder_reasoning_step', { step: 1 });

      expect(span.name).toBe('co_founder_reasoning_step');
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.attributes.step).toBe(1);

      span.setAttribute('model', 'gemini-2.0-flash');
      expect(span.attributes.model).toBe('gemini-2.0-flash');

      span.addEvent('tool_dispatched', { tool: 'get_store_metrics' });
      expect(span.events.length).toBe(1);
      expect(span.events[0].name).toBe('tool_dispatched');

      span.end('ok');
      expect(span.status).toBe('ok');
      expect(span.endTime).toBeDefined();
      expect(span.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('records exception and categorizes error in span attributes', () => {
      const span = startSpan('execute_inventory_update');

      span.recordException(new Error('Missing permission: inventory:write'));
      expect(span.status).toBe('error');
      expect(span.attributes['error.category']).toBe('auth_denied');
      expect(span.attributes['error.message']).toContain('Missing permission');

      span.end();
      expect(span.status).toBe('error');
    });
  });

  describe('Bounded Telemetry Buffer & Aggregation', () => {
    it('records LLM events and enforces buffer capacity bounds', () => {
      const customStore = new CoFounderTelemetryStore({ maxBufferSize: 5 });

      for (let i = 1; i <= 7; i++) {
        customStore.recordLLM({
          traceId: `tr_${i}`,
          spanId: `sp_${i}`,
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          channel: 'chat',
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          durationMs: 400 + i * 10,
          success: true,
        });
      }

      // Buffer bounded to 5 items -> items 1 and 2 evicted
      const recent = customStore.getRecentLLMEvents(10);
      expect(recent.length).toBe(5);
      expect(recent[0].traceId).toBe('tr_7'); // Reverse chronological
      expect(recent[4].traceId).toBe('tr_3');
    });

    it('computes comprehensive summary statistics (tokens, p95 latency, rates)', () => {
      // 1. Success event
      recordLLMTelemetry({
        traceId: 'tr_1',
        spanId: 'sp_1',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        channel: 'chat',
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        durationMs: 500,
        success: true,
      });

      // 2. Slower success event on another provider
      recordLLMTelemetry({
        traceId: 'tr_2',
        spanId: 'sp_2',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        channel: 'voice',
        promptTokens: 150,
        completionTokens: 50,
        totalTokens: 200,
        durationMs: 250,
        success: true,
      });

      // 3. Failed event (rate limit)
      recordLLMTelemetry({
        traceId: 'tr_3',
        spanId: 'sp_3',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        channel: 'chat',
        promptTokens: 100,
        completionTokens: 0,
        totalTokens: 100,
        durationMs: 120,
        success: false,
        errorCategory: 'rate_limit',
        errorMessage: 'Quota exhausted',
      });

      // Tool events
      recordToolTelemetry({
        traceId: 'tr_1',
        spanId: 'sp_t1',
        toolName: 'get_store_metrics',
        durationMs: 80,
        success: true,
      });

      recordToolTelemetry({
        traceId: 'tr_1',
        spanId: 'sp_t2',
        toolName: 'get_store_metrics',
        durationMs: 70,
        success: true,
      });

      recordToolTelemetry({
        traceId: 'tr_2',
        spanId: 'sp_t3',
        toolName: 'adjust_product_price',
        durationMs: 120,
        success: false,
        errorCategory: 'auth_denied',
        errorMessage: 'Unauthorized',
      });

      const summary = getTelemetrySummary();

      // LLM totals
      expect(summary.totalLLMCalls).toBe(3);
      expect(summary.totalPromptTokens).toBe(450);
      expect(summary.totalCompletionTokens).toBe(150);
      expect(summary.totalTokens).toBe(600);
      expect(summary.llmSuccessRate).toBe(0.667); // 2/3
      expect(summary.errorsByCategory.rate_limit).toBe(1);

      // Tool totals
      expect(summary.totalToolExecutions).toBe(3);
      expect(summary.toolSuccessRate).toBe(0.667); // 2/3
      expect(summary.errorsByCategory.auth_denied).toBe(1);

      // Top tools
      expect(summary.topTools[0].toolName).toBe('get_store_metrics');
      expect(summary.topTools[0].executions).toBe(2);

      // Provider breakdown
      expect(summary.providerBreakdown.gemini.calls).toBe(2);
      expect(summary.providerBreakdown.groq.calls).toBe(1);
    });
  });

  describe('Production Canary Health Probe', () => {
    it('runs health canary probes across DB, cache, rate limiter, and credentials', async () => {
      const originalRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const originalGeminiKey = process.env.GEMINI_API_KEY;

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key';
      process.env.GEMINI_API_KEY = 'test_gemini';

      try {
        const report = await runCoFounderHealthCanary();

        expect(report.status).toBe('healthy');
        expect(report.timestamp).toBeDefined();
        expect(report.probes.length).toBe(4);

        const dbProbe = report.probes.find((p) => p.name === 'supabase_db');
        expect(dbProbe).toBeDefined();
        expect(dbProbe?.status).toBe('healthy');

        const cacheProbe = report.probes.find((p) => p.name === 'lru_cache');
        expect(cacheProbe).toBeDefined();
        expect(cacheProbe?.status).toBe('healthy');

        const rlProbe = report.probes.find((p) => p.name === 'rate_limiter');
        expect(rlProbe).toBeDefined();
        expect(rlProbe?.status).toBe('healthy');

        const credsProbe = report.probes.find((p) => p.name === 'llm_providers');
        expect(credsProbe).toBeDefined();
        expect(credsProbe?.status).toBe('healthy');
        expect(credsProbe?.details).toContain('gemini');
      } finally {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalRoleKey;
        process.env.GEMINI_API_KEY = originalGeminiKey;
      }
    });

    it('reports degraded status when LLM credentials are not configured', async () => {
      const originalGemini = process.env.GEMINI_API_KEY;
      const originalGroq = process.env.GROQ_API_KEY;
      const originalOpenRouter = process.env.OPENROUTER_API_KEY;
      const originalOpenAI = process.env.OPENAI_API_KEY;

      delete process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const report = await runCoFounderHealthCanary();
        expect(report.status).toBe('degraded');
        const credsProbe = report.probes.find((p) => p.name === 'llm_providers');
        expect(credsProbe?.status).toBe('degraded');
      } finally {
        if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
        if (originalGroq) process.env.GROQ_API_KEY = originalGroq;
        if (originalOpenRouter) process.env.OPENROUTER_API_KEY = originalOpenRouter;
        if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
      }
    });
  });
});
