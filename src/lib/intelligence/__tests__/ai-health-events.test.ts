jest.mock('server-only', () => ({}));

import {
  observeAiRequestCompleted,
  observeAiFailoverTriggered,
  observeAiRateLimitHit,
  fetchAiHealthEvents,
} from '../ai-health-events';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('AI & Infrastructure Health Intelligence Pipeline (Phase 13)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('observeAiRequestCompleted', () => {
    it('observes a successful AI request telemetry signal strictly without prompt text', async () => {
      const result = await observeAiRequestCompleted({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        feature: 'gia_chat',
        tokensUsed: 450,
        latencyMs: 380,
        estimatedCost: 0.00025,
        status: 'success',
        credentialId: 'cred_groq_primary',
        correlationId: 'req_corr_12345',
        httpStatusCode: 200,
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('AI_REQUEST_COMPLETED');
      expect(result.event.entity.type).toBe('ai_service');
      expect(result.event.entity.id).toBe('groq');
      expect(result.event.entity.code).toBe('llama-3.3-70b-versatile');
      expect(result.event.payload.tokensUsed).toBe(450);
      expect(result.event.payload.latencyMs).toBe(380);
      expect(result.event.payload.correlationId).toBe('req_corr_12345');

      // Verify prompt text or query text is strictly absent
      expect((result.event.payload as any).prompt).toBeUndefined();
      expect((result.event.payload as any).query).toBeUndefined();
      expect((result.event.payload as any).text).toBeUndefined();
    });
  });

  describe('observeAiFailoverTriggered', () => {
    it('observes a multi-credential failover transition signal', async () => {
      const result = await observeAiFailoverTriggered({
        feature: 'co_founder',
        primaryProvider: 'groq',
        failedProvider: 'groq',
        fallbackProvider: 'gemini',
        model: 'gemini-1.5-flash',
        errorType: 'RATE_LIMIT',
        providerErrorCode: 'rate_limit_exceeded',
        recoveryStatus: 'recovered',
        latencyMs: 1250,
        retryCount: 1,
        correlationId: 'corr_failover_999',
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('AI_FAILOVER_TRIGGERED');
      expect(result.event.entity.type).toBe('ai_service');
      expect(result.event.entity.id).toBe('groq');
      expect(result.event.entity.code).toBe('gemini');
      expect(result.event.payload.failedProvider).toBe('groq');
      expect(result.event.payload.fallbackProvider).toBe('gemini');
      expect(result.event.payload.recoveryStatus).toBe('recovered');
      expect(result.event.idempotencyKey).toBe(
        'idemp_ai_failover_corr_failover_999_groq_gemini'
      );
    });
  });

  describe('observeAiRateLimitHit', () => {
    it('observes a rate-limit trigger with HTTP 429 status and retry count', async () => {
      const result = await observeAiRateLimitHit({
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        feature: 'smart_search',
        httpStatusCode: 429,
        retryCount: 2,
        correlationId: 'corr_rl_555',
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('AI_RATE_LIMIT_HIT');
      expect(result.event.entity.type).toBe('ai_service');
      expect(result.event.entity.id).toBe('groq');
      expect(result.event.payload.httpStatusCode).toBe(429);
      expect(result.event.payload.retryCount).toBe(2);
      expect(result.event.idempotencyKey).toBe(
        'idemp_ai_ratelimit_corr_rl_555_groq'
      );
    });
  });

  describe('fetchAiHealthEvents', () => {
    it('fetches AI logs from database and normalizes into BusinessEvents', async () => {
      const mockLogs = [
        {
          id: 'log_001_uuid',
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          feature: 'gia_chat',
          tokens_used: 512,
          estimated_cost: 0.0003,
          status: 'success',
          latency_ms: 290,
          created_at: '2026-10-26T18:00:00.000Z',
          credential_id: 'cred_1',
          correlation_id: 'corr_1',
        },
      ];

      mockSupabase.limit.mockResolvedValueOnce({
        data: mockLogs,
        error: null,
      });

      const events = await fetchAiHealthEvents({ provider: 'groq', limit: 10 });

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('AI_REQUEST_COMPLETED');
      expect(events[0].entity.type).toBe('ai_service');
      expect(events[0].entity.id).toBe('groq');
      expect(events[0].payload.tokensUsed).toBe(512);
      expect(events[0].idempotencyKey).toBe('idemp_ai_log_log_001_uuid');
    });

    it('returns empty array when database returns error', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: new Error('Database query failed'),
      });

      const events = await fetchAiHealthEvents();
      expect(events).toEqual([]);
    });
  });
});
