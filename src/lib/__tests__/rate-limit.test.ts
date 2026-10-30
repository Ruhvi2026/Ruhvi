jest.mock('server-only', () => ({}));

import {
  getClientIp,
  checkApiRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '../rate-limit';
import { NextResponse } from 'next/server';

describe('API Rate Limit Module (Finding B4)', () => {
  describe('getClientIp', () => {
    it('extracts IP from cf-connecting-ip first', () => {
      const req = new Request('https://ruhvi.in/api/newsletter', {
        headers: {
          'cf-connecting-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 192.0.2.1',
          'x-real-ip': '198.51.100.1',
        },
      });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('extracts first IP from x-forwarded-for when cf-connecting-ip is missing', () => {
      const req = new Request('https://ruhvi.in/api/newsletter', {
        headers: {
          'x-forwarded-for': '198.51.100.1, 192.0.2.1',
          'x-real-ip': '192.0.2.1',
        },
      });
      expect(getClientIp(req)).toBe('198.51.100.1');
    });

    it('extracts x-real-ip when other proxy headers are missing', () => {
      const req = new Request('https://ruhvi.in/api/newsletter', {
        headers: {
          'x-real-ip': '198.51.100.25',
        },
      });
      expect(getClientIp(req)).toBe('198.51.100.25');
    });

    it('falls back to 127.0.0.1 when no IP headers are present', () => {
      const req = new Request('https://ruhvi.in/api/newsletter');
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('checkApiRateLimit (in-memory fallback when Redis is unconfigured)', () => {
    it('allows requests within limit and decrements remaining with isDegraded flag', async () => {
      const key = `test_rate_user_${Date.now()}`;
      const res1 = await checkApiRateLimit(key, 3, 60);
      expect(res1.success).toBe(true);
      expect(res1.limit).toBe(3);
      expect(res1.remaining).toBe(2);
      expect(res1.isDegraded).toBe(true);

      const res2 = await checkApiRateLimit(key, 3, 60);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await checkApiRateLimit(key, 3, 60);
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);

      // 4th request exceeds limit
      const res4 = await checkApiRateLimit(key, 3, 60);
      expect(res4.success).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfter).toBeGreaterThan(0);
      expect(res4.isDegraded).toBe(true);
    });
  });

  describe('createRateLimitResponse', () => {
    it('constructs 429 response with RFC headers and degraded flag', () => {
      const res = createRateLimitResponse({
        success: false,
        limit: 5,
        remaining: 0,
        resetAt: 1730000000,
        retryAfter: 35,
        isDegraded: true,
      });

      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('35');
      expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(res.headers.get('X-RateLimit-Reset')).toBe('1730000000');
      expect(res.headers.get('X-RateLimit-Degraded')).toBe('true');
    });
  });

  describe('addRateLimitHeaders', () => {
    it('attaches rate limit headers to response including degraded state', () => {
      const base = NextResponse.json({ ok: true });
      const enriched = addRateLimitHeaders(base, {
        success: true,
        limit: 10,
        remaining: 8,
        resetAt: 1730000000,
        retryAfter: 0,
        isDegraded: true,
      });

      expect(enriched.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(enriched.headers.get('X-RateLimit-Remaining')).toBe('8');
      expect(enriched.headers.get('X-RateLimit-Reset')).toBe('1730000000');
      expect(enriched.headers.get('X-RateLimit-Degraded')).toBe('true');
    });
  });
});
