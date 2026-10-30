import 'server-only';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
let _redisReadOnly: Redis | null = null;

export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token && url.startsWith('http'));
}

export function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    _redis = new Redis({ url, token });
  }
  return _redis;
}

export function getRedisReadOnly(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }
  if (!_redisReadOnly) {
    const url = process.env.UPSTASH_REDIS_REST_READONLY_URL;
    const token = process.env.UPSTASH_REDIS_REST_READONLY_TOKEN;
    _redisReadOnly = url && token ? new Redis({ url, token }) : getRedis();
  }
  return _redisReadOnly;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get<T>(key);
  } catch (err) {
    console.warn(`[Redis] cacheGet failed for ${key}:`, err);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[Redis] cacheSet failed for ${key}:`, err);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    console.warn(`[Redis] cacheDelete failed for ${key}:`, err);
  }
}

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const client = getRedis();
  if (client) {
    try {
      const cached = await client.get<T>(key);
      if (cached !== null && cached !== undefined) return cached;
    } catch (err) {
      console.warn(`[Redis] cacheWrap get failed for ${key}:`, err);
    }
  }

  const value = await fetcher();

  if (client) {
    try {
      await client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.warn(`[Redis] cacheWrap set failed for ${key}:`, err);
    }
  }

  return value;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

let _fixedWindowScript: any = null;

function getFixedWindowScript(client: Redis) {
  if (!_fixedWindowScript) {
    _fixedWindowScript = client.createScript(
      `local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  ttl = tonumber(ARGV[1])
end
return { current, ttl }`
    );
  }
  return _fixedWindowScript;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const client = getRedis();
  if (!client) {
    return {
      success: true,
      limit,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
    };
  }
  try {
    const script = getFixedWindowScript(client);
    const [current, ttl] = (await script.exec(
      [key],
      [String(windowSeconds)]
    )) as [number, number];
    return {
      success: current <= limit,
      limit,
      remaining: Math.max(0, limit - current),
      resetAt: Math.floor(Date.now() / 1000) + ttl,
    };
  } catch (err) {
    console.warn(`[Redis] rateLimit degraded for ${key}:`, err);
    return {
      success: true,
      limit,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
    };
  }
}

export async function rateLimitSliding(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const client = getRedis();
  if (!client) {
    return {
      success: true,
      limit,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
    };
  }
  try {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    await client.zremrangebyscore(key, 0, windowStart);
    const count = await client.zcard(key);
    if (count >= limit) {
      const oldest = await client.zrange(key, 0, 0, { withScores: true });
      const oldestScore = oldest.length > 1 ? Number(oldest[1]) : windowStart;
      return {
        success: false,
        limit,
        remaining: 0,
        resetAt: Math.floor((oldestScore + windowSeconds * 1000) / 1000),
      };
    }
    await client.zadd(key, {
      score: now,
      member: `${now}-${Math.random().toString(36).slice(2)}`,
    });
    await client.expire(key, windowSeconds);
    return {
      success: true,
      limit,
      remaining: limit - count - 1,
      resetAt: Math.floor(now / 1000) + windowSeconds,
    };
  } catch (err) {
    console.warn(`[Redis] rateLimitSliding degraded for ${key}:`, err);
    return {
      success: true,
      limit,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
    };
  }
}
