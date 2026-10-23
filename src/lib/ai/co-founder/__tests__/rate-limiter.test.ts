import {
  checkRateLimit,
  consumeRateLimit,
  createRateLimitHeaders,
  createRateLimitErrorResponse,
  enforceCoFounderRateLimit,
  getTierConfig,
  resolveRateLimitKey,
  resetRateLimiterStore,
  pruneInactiveBuckets,
  getRateLimiterDiagnostics,
  DEFAULT_TIER_LIMITS,
} from '../rate-limiter';

describe('Co-Founder Rate Limiter & Throttling Engine', () => {
  beforeEach(() => {
    resetRateLimiterStore();
  });

  afterEach(() => {
    resetRateLimiterStore();
  });

  describe('Tier & Role Configuration', () => {
    it('resolves default limits correctly for founder', () => {
      const config = getTierConfig('chat', 'founder');
      expect(config.limit).toBe(120);
      expect(config.windowSeconds).toBe(60);
      expect(config.burstLimit).toBe(40);
    });

    it('resolves tier limits correctly for staff role', () => {
      const config = getTierConfig('chat', 'staff');
      expect(config.limit).toBe(50);
      expect(config.burstLimit).toBe(15);
    });

    it('resolves tool_execution tier limits for admin', () => {
      const config = getTierConfig('tool_execution', 'admin');
      expect(config.limit).toBe(150);
      expect(config.burstLimit).toBe(40);
    });

    it('falls back to default role limits for unknown roles', () => {
      const config = getTierConfig('chat', 'unknown_visitor');
      expect(config.limit).toBe(DEFAULT_TIER_LIMITS.chat.default.limit);
      expect(config.burstLimit).toBe(
        DEFAULT_TIER_LIMITS.chat.default.burstLimit
      );
    });

    it('applies custom configuration overrides', () => {
      const config = getTierConfig('chat', 'founder', {
        limit: 100,
        windowSeconds: 120,
        burstLimit: 50,
      });
      expect(config.limit).toBe(100);
      expect(config.windowSeconds).toBe(120);
      expect(config.burstLimit).toBe(50);
    });
  });

  describe('Key Resolution', () => {
    it('constructs sanitized rate limit keys', () => {
      const key = resolveRateLimitKey('user:123-abc', 'chat');
      expect(key).toBe('cofounder:rl:chat:user_123-abc');
    });

    it('handles empty or whitespace identifiers', () => {
      const key = resolveRateLimitKey('   ', 'voice');
      expect(key).toBe('cofounder:rl:voice:anonymous');
    });
  });

  describe('Token Bucket Consumption & Checking', () => {
    it('allows initial requests and decrements remaining tokens', () => {
      const checkBefore = checkRateLimit('user_test_1', {
        tier: 'chat',
        role: 'founder',
      });
      expect(checkBefore.allowed).toBe(true);
      expect(checkBefore.consumed).toBe(0);
      expect(checkBefore.remaining).toBe(40); // Initial burst capacity for founder

      const consumeRes = consumeRateLimit('user_test_1', {
        tier: 'chat',
        role: 'founder',
      });
      expect(consumeRes.allowed).toBe(true);
      expect(consumeRes.consumed).toBe(1);
      expect(consumeRes.remaining).toBe(39);

      const checkAfter = checkRateLimit('user_test_1', {
        tier: 'chat',
        role: 'founder',
      });
      expect(checkAfter.remaining).toBe(39);
    });

    it('enforces limit when burst tokens are exhausted', () => {
      const userId = 'user_burst_test';
      const role = 'default'; // Burst limit is 10

      // Consume 10 tokens
      for (let i = 0; i < 10; i++) {
        expect(consumeRateLimit(userId, { tier: 'chat', role }).allowed).toBe(
          true
        );
      }

      // 11th request should be rejected
      const rejected = consumeRateLimit(userId, { tier: 'chat', role });
      expect(rejected.allowed).toBe(false);
      expect(rejected.remaining).toBe(0);
      expect(rejected.consumed).toBe(0);
      expect(rejected.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('refills tokens over time', () => {
      const userId = 'user_refill_test';
      const startTime = 1700000000000;

      // Exhaust tokens (default burst is 10, limit is 40 per 60s => 2 tokens per 3s)
      consumeRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        tokensToConsume: 10,
        now: startTime,
      });
      const exhausted = checkRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        now: startTime,
      });
      expect(exhausted.remaining).toBe(0);

      // Advance time by 15 seconds (should refill: 40 tokens / 60s * 15s = 10 tokens, capped at burst capacity 10)
      const after15s = checkRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        now: startTime + 15000,
      });
      expect(after15s.allowed).toBe(true);
      expect(after15s.remaining).toBe(10);

      // Consume 1 token after refill
      const consumedAfterRefill = consumeRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        now: startTime + 15000,
      });
      expect(consumedAfterRefill.allowed).toBe(true);
      expect(consumedAfterRefill.remaining).toBe(9);
    });

    it('caps token refill at maximum burst capacity', () => {
      const userId = 'user_cap_test';
      const startTime = 1700000000000;

      consumeRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        tokensToConsume: 5,
        now: startTime,
      });

      // Advance time by 1 hour (far beyond window)
      const after1h = checkRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        now: startTime + 3600000,
      });
      expect(after1h.remaining).toBe(10); // Should not exceed burst limit of 10
    });
  });

  describe('Isolation & Segregation', () => {
    it('isolates different tiers for the same user', () => {
      const userId = 'user_multi_tier';

      // Exhaust chat tier
      consumeRateLimit(userId, {
        tier: 'chat',
        role: 'default',
        tokensToConsume: 10,
      });
      expect(
        consumeRateLimit(userId, { tier: 'chat', role: 'default' }).allowed
      ).toBe(false);

      // tool_execution tier should still be completely available
      const toolCheck = consumeRateLimit(userId, {
        tier: 'tool_execution',
        role: 'default',
      });
      expect(toolCheck.allowed).toBe(true);
      expect(toolCheck.tier).toBe('tool_execution');

      // voice tier should still be available
      const voiceCheck = consumeRateLimit(userId, {
        tier: 'voice',
        role: 'default',
      });
      expect(voiceCheck.allowed).toBe(true);
      expect(voiceCheck.tier).toBe('voice');
    });

    it('isolates distinct users on the same tier', () => {
      const userA = 'user_a';
      const userB = 'user_b';

      // User A exhausts quota
      consumeRateLimit(userA, {
        tier: 'chat',
        role: 'default',
        tokensToConsume: 10,
      });
      expect(
        consumeRateLimit(userA, { tier: 'chat', role: 'default' }).allowed
      ).toBe(false);

      // User B is unaffected
      const userBResult = consumeRateLimit(userB, {
        tier: 'chat',
        role: 'default',
      });
      expect(userBResult.allowed).toBe(true);
      expect(userBResult.remaining).toBe(9);
    });
  });

  describe('HTTP Headers & Response Generation', () => {
    it('generates standard RFC rate limit headers for allowed request', () => {
      const result = consumeRateLimit('user_header_1', {
        tier: 'chat',
        role: 'founder',
      });
      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('120');
      expect(headers['X-RateLimit-Remaining']).toBe('39');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('generates Retry-After header for rejected requests', () => {
      consumeRateLimit('user_header_rej', {
        tier: 'chat',
        role: 'default',
        tokensToConsume: 10,
      });
      const rejected = consumeRateLimit('user_header_rej', {
        tier: 'chat',
        role: 'default',
      });
      const headers = createRateLimitHeaders(rejected);

      expect(headers['X-RateLimit-Limit']).toBe('40');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBeDefined();
      expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
    });

    it('creates standard 429 NextResponse with error payload and headers', async () => {
      consumeRateLimit('user_429_test', {
        tier: 'voice',
        role: 'default',
        tokensToConsume: 5,
      });
      const rejected = consumeRateLimit('user_429_test', {
        tier: 'voice',
        role: 'default',
      });
      const response = createRateLimitErrorResponse(
        rejected,
        'Voice limit reached'
      );

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('15');

      const body = await response.json();
      expect(body.error).toBe('Too Many Requests');
      expect(body.message).toBe('Voice limit reached');
      expect(body.tier).toBe('voice');
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('enforceCoFounderRateLimit Middleware Helper', () => {
    it('returns success: true when within quota', () => {
      const outcome = enforceCoFounderRateLimit('admin_mw_1', {
        tier: 'tool_execution',
        role: 'admin',
      });

      expect(outcome.success).toBe(true);
      expect(outcome.response).toBeUndefined();
      expect(outcome.result.allowed).toBe(true);
    });

    it('returns success: false with 429 response when exceeding quota', () => {
      const userId = 'admin_mw_burst';
      // Founder tool burst limit is 50
      enforceCoFounderRateLimit(userId, {
        tier: 'tool_execution',
        role: 'founder',
        tokensToConsume: 50,
      });

      const outcome = enforceCoFounderRateLimit(userId, {
        tier: 'tool_execution',
        role: 'founder',
      });

      expect(outcome.success).toBe(false);
      expect(outcome.response).toBeDefined();
      expect(outcome.response?.status).toBe(429);
      expect(outcome.result.allowed).toBe(false);
    });
  });

  describe('Diagnostics & Memory Maintenance', () => {
    it('tracks active keys in diagnostics', () => {
      consumeRateLimit('user_diag_1', { tier: 'chat' });
      consumeRateLimit('user_diag_2', { tier: 'voice' });

      const diagnostics = getRateLimiterDiagnostics();
      expect(diagnostics.totalActiveKeys).toBe(2);
      expect(diagnostics.keys).toContain('cofounder:rl:chat:user_diag_1');
      expect(diagnostics.keys).toContain('cofounder:rl:voice:user_diag_2');
    });

    it('prunes inactive buckets after idle threshold', () => {
      const now = 1700000000000;
      consumeRateLimit('user_active', { tier: 'chat', now: now + 500000 });
      consumeRateLimit('user_stale', { tier: 'chat', now: now });

      // Stale entry was accessed at `now`, current time is `now + 500000` (idle = 500s > 300s)
      // Pass idle threshold of 300,000ms
      const pruned = pruneInactiveBuckets(300000);
      expect(pruned).toBeGreaterThanOrEqual(1);

      const diagnostics = getRateLimiterDiagnostics();
      expect(diagnostics.keys).not.toContain('cofounder:rl:chat:user_stale');
    });

    it('resets specific key prefixes or entire store', () => {
      consumeRateLimit('prefix_a_1', { tier: 'chat' });
      consumeRateLimit('prefix_b_1', { tier: 'chat' });

      resetRateLimiterStore('prefix_a');
      const diagnostics1 = getRateLimiterDiagnostics();
      expect(diagnostics1.keys.some((k) => k.includes('prefix_a'))).toBe(false);
      expect(diagnostics1.keys.some((k) => k.includes('prefix_b'))).toBe(true);

      resetRateLimiterStore();
      const diagnostics2 = getRateLimiterDiagnostics();
      expect(diagnostics2.totalActiveKeys).toBe(0);
    });
  });
});
