import 'server-only';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
let _redisReadOnly: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    _redis = url && token ? new Redis({ url, token }) : Redis.fromEnv();
  }
  return _redis;
}

export function getRedisReadOnly(): Redis {
  if (!_redisReadOnly) {
    const url = process.env.UPSTASH_REDIS_REST_READONLY_URL;
    const token = process.env.UPSTASH_REDIS_REST_READONLY_TOKEN;
    _redisReadOnly = url && token ? new Redis({ url, token }) : getRedis();
  }
  return _redisReadOnly;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  return getRedis().get<T>(key);
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await getRedis().set(key, value, { ex: ttlSeconds });
}

export async function cacheDelete(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getRedis().get<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await getRedis().set(key, value, { ex: ttlSeconds });
  return value;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

let _fixedWindowScript: ReturnType<
  ReturnType<typeof getRedis>['createScript']
> | null = null;

function getFixedWindowScript() {
  if (!_fixedWindowScript) {
    _fixedWindowScript = getRedis().createScript(
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
  const [current, ttl] = (await getFixedWindowScript().exec(
    [key],
    [String(windowSeconds)]
  )) as [number, number];
  return {
    success: current <= limit,
    limit,
    remaining: Math.max(0, limit - current),
    resetAt: Math.floor(Date.now() / 1000) + ttl,
  };
}

export async function rateLimitSliding(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const client = getRedis();
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
}
