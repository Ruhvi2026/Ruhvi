import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitSliding } from '@/lib/redis';

export interface ApiRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  isDegraded?: boolean; // True when falling back to process in-memory sliding window (Finding B4)
}

// In-memory sliding window fallback store if Redis is unavailable
const memoryFallbackStore = new Map<string, number[]>();

/**
 * Extracts client IP from standard proxy and CDN headers safely.
 */
export function getClientIp(req: Request | NextRequest): string {
  const headers = req.headers;
  const cfConnecting = headers.get('cf-connecting-ip');
  if (cfConnecting) return cfConnecting.trim();

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Checks rate limit for a given key using distributed Redis sliding window.
 * Gracefully falls back to an in-memory sliding window if Redis is unconfigured or unreachable.
 * Emits an operational warning when degraded in-memory mode is active (Finding B4).
 */
export async function checkApiRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<ApiRateLimitResult> {
  const now = Math.floor(Date.now() / 1000);

  if (isRedisConfigured()) {
    try {
      const redisResult = await rateLimitSliding(
        `ratelimit:${key}`,
        limit,
        windowSeconds
      );
      const retryAfter = Math.max(1, redisResult.resetAt - now);

      return {
        success: redisResult.success,
        limit: redisResult.limit,
        remaining: redisResult.remaining,
        resetAt: redisResult.resetAt,
        retryAfter,
        isDegraded: false,
      };
    } catch (err: any) {
      console.warn(
        `[rate-limit] Redis unavailable (${err?.message || 'connection failed'}). Falling back to in-memory sliding window for key: "${key}".`
      );
    }
  }

  // In-memory sliding window fallback
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const timestamps = (memoryFallbackStore.get(key) || []).filter(
    (t) => nowMs - t < windowMs
  );

  if (timestamps.length >= limit) {
    memoryFallbackStore.set(key, timestamps);
    const oldest = timestamps[0] || nowMs;
    const resetAt = Math.floor((oldest + windowMs) / 1000);
    const retryAfter = Math.max(1, resetAt - now);

    return {
      success: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfter,
      isDegraded: true,
    };
  }

  timestamps.push(nowMs);
  memoryFallbackStore.set(key, timestamps);

  // Occasional cleanup to prevent memory growth
  if (memoryFallbackStore.size > 2000) {
    for (const [k, v] of memoryFallbackStore.entries()) {
      const valid = v.filter((t) => nowMs - t < windowMs);
      if (valid.length === 0) memoryFallbackStore.delete(k);
      else memoryFallbackStore.set(k, valid);
    }
  }

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - timestamps.length),
    resetAt: now + windowSeconds,
    retryAfter: 0,
    isDegraded: true,
  };
}

/**
 * Creates standard 429 Too Many Requests response with RFC-compliant headers.
 */
export function createRateLimitResponse(
  result: ApiRateLimitResult,
  message = 'Too many requests. Please try again later.'
): NextResponse {
  const res = NextResponse.json({ error: message }, { status: 429 });

  res.headers.set('Retry-After', String(result.retryAfter));
  res.headers.set('X-RateLimit-Limit', String(result.limit));
  res.headers.set('X-RateLimit-Remaining', String(result.remaining));
  res.headers.set('X-RateLimit-Reset', String(result.resetAt));
  if (result.isDegraded) {
    res.headers.set('X-RateLimit-Degraded', 'true');
  }

  return res;
}

/**
 * Attaches rate limit information headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: ApiRateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));
  if (result.isDegraded) {
    response.headers.set('X-RateLimit-Degraded', 'true');
  }
  return response;
}
