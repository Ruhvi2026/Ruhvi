/**
 * Co-Founder Granular Rate Limiter & Request Throttling Engine
 *
 * Implements an in-memory sliding window token bucket rate limiter with:
 * - Tiered limits for text chat, voice streaming, tool execution, browser automation, and proactive tasks.
 * - Role-aware burst quotas (founder, admin, manager, staff, unauthenticated).
 * - Keying by user ID, session ID, or IP address.
 * - Standard RFC-compliant HTTP headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After).
 * - Automatic background store pruning to prevent memory leaks in long-running processes.
 * - Atomic check & consume operations.
 */

import { NextResponse } from 'next/server';

export type RateLimitTier =
  | 'chat'
  | 'voice'
  | 'tool_execution'
  | 'browser_automation'
  | 'proactive';

export interface RateLimitConfig {
  limit: number; // Max requests allowed per window
  windowSeconds: number; // Window duration in seconds
  burstLimit: number; // Max burst token capacity
  costPerRequest?: number; // Cost in tokens per request (default: 1)
}

export interface RateLimitResult {
  allowed: boolean;
  tier: RateLimitTier;
  limit: number;
  remaining: number;
  consumed: number;
  resetAt: number; // Epoch timestamp in milliseconds
  retryAfterSeconds: number; // Seconds to wait until next token is available
  key: string;
}

export interface RateLimitOptions {
  tier?: RateLimitTier;
  role?: string;
  customLimit?: number;
  customWindowSeconds?: number;
  tokensToConsume?: number;
  now?: number;
}

interface BucketEntry {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRatePerMs: number;
  windowMs: number;
  lastAccessed: number;
}

// In-memory bucket store
const bucketStore = new Map<string, BucketEntry>();

// Default tier limits structured by role hierarchy
export const DEFAULT_TIER_LIMITS: Record<
  RateLimitTier,
  Record<string, RateLimitConfig>
> = {
  chat: {
    founder: { limit: 60, windowSeconds: 60, burstLimit: 20 },
    admin: { limit: 60, windowSeconds: 60, burstLimit: 20 },
    manager: { limit: 45, windowSeconds: 60, burstLimit: 15 },
    staff: { limit: 30, windowSeconds: 60, burstLimit: 10 },
    default: { limit: 10, windowSeconds: 60, burstLimit: 3 },
  },
  voice: {
    founder: { limit: 40, windowSeconds: 60, burstLimit: 12 },
    admin: { limit: 40, windowSeconds: 60, burstLimit: 12 },
    manager: { limit: 25, windowSeconds: 60, burstLimit: 8 },
    staff: { limit: 15, windowSeconds: 60, burstLimit: 5 },
    default: { limit: 5, windowSeconds: 60, burstLimit: 2 },
  },
  tool_execution: {
    founder: { limit: 120, windowSeconds: 60, burstLimit: 30 },
    admin: { limit: 120, windowSeconds: 60, burstLimit: 30 },
    manager: { limit: 60, windowSeconds: 60, burstLimit: 15 },
    staff: { limit: 40, windowSeconds: 60, burstLimit: 10 },
    default: { limit: 15, windowSeconds: 60, burstLimit: 5 },
  },
  browser_automation: {
    founder: { limit: 15, windowSeconds: 60, burstLimit: 4 },
    admin: { limit: 15, windowSeconds: 60, burstLimit: 4 },
    manager: { limit: 8, windowSeconds: 60, burstLimit: 2 },
    staff: { limit: 4, windowSeconds: 60, burstLimit: 1 },
    default: { limit: 2, windowSeconds: 60, burstLimit: 1 },
  },
  proactive: {
    founder: { limit: 30, windowSeconds: 60, burstLimit: 8 },
    admin: { limit: 30, windowSeconds: 60, burstLimit: 8 },
    manager: { limit: 20, windowSeconds: 60, burstLimit: 5 },
    staff: { limit: 10, windowSeconds: 60, burstLimit: 3 },
    default: { limit: 5, windowSeconds: 60, burstLimit: 2 },
  },
};

/**
 * Resolves the configuration for a given tier and role.
 */
export function getTierConfig(
  tier: RateLimitTier = 'chat',
  role: string = 'default',
  overrides?: Partial<RateLimitConfig>
): RateLimitConfig {
  const tierConfig = DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.chat;
  const normalizedRole = (role || 'default').toLowerCase().trim();
  const baseConfig = tierConfig[normalizedRole] || tierConfig.default;

  return {
    limit: overrides?.limit ?? baseConfig.limit,
    windowSeconds: overrides?.windowSeconds ?? baseConfig.windowSeconds,
    burstLimit: overrides?.burstLimit ?? baseConfig.burstLimit,
    costPerRequest: overrides?.costPerRequest ?? baseConfig.costPerRequest ?? 1,
  };
}

/**
 * Generates a consistent cache key for rate-limiting.
 */
export function resolveRateLimitKey(
  identifier: string,
  tier: RateLimitTier = 'chat'
): string {
  const trimmed = (identifier || '').trim();
  const sanitizedId = (trimmed || 'anonymous').replace(/[:\s]+/g, '_');
  return `cofounder:rl:${tier}:${sanitizedId}`;
}


/**
 * Refills tokens for an existing bucket entry based on elapsed time.
 */
function updateBucket(entry: BucketEntry, now: number): void {
  const elapsed = Math.max(0, now - entry.lastRefill);
  if (elapsed > 0) {
    const tokensToAdd = elapsed * entry.refillRatePerMs;
    entry.tokens = Math.min(entry.capacity, entry.tokens + tokensToAdd);
    entry.lastRefill = now;
  }
  entry.lastAccessed = now;
}

/**
 * Checks and optionally consumes tokens from the token bucket.
 */
function evaluateRateLimit(
  identifier: string,
  options: RateLimitOptions = {},
  consume: boolean = true
): RateLimitResult {
  const tier: RateLimitTier = options.tier || 'chat';
  const role: string = options.role || 'default';
  const now: number = options.now ?? Date.now();
  const tokensToConsume = Math.max(1, options.tokensToConsume ?? 1);

  const config = getTierConfig(tier, role, {
    limit: options.customLimit,
    windowSeconds: options.customWindowSeconds,
  });

  const key = resolveRateLimitKey(identifier, tier);
  const capacity = config.burstLimit;
  const windowMs = config.windowSeconds * 1000;
  const refillRatePerMs = config.limit / windowMs;

  let entry = bucketStore.get(key);

  if (!entry) {
    entry = {
      tokens: capacity,
      lastRefill: now,
      capacity,
      refillRatePerMs,
      windowMs,
      lastAccessed: now,
    };
    bucketStore.set(key, entry);
  } else {
    // If capacity or window config changed dynamically, adapt entry
    entry.capacity = capacity;
    entry.refillRatePerMs = refillRatePerMs;
    entry.windowMs = windowMs;
    updateBucket(entry, now);
  }

  const allowed = entry.tokens >= tokensToConsume;
  let remaining = Math.max(0, Math.floor(entry.tokens));

  if (allowed && consume) {
    entry.tokens -= tokensToConsume;
    remaining = Math.max(0, Math.floor(entry.tokens));
  }

  // Calculate retryAfter in seconds if not allowed or 0
  let retryAfterSeconds = 0;
  if (!allowed) {
    const tokensNeeded = tokensToConsume - entry.tokens;
    const msToWait = tokensNeeded / refillRatePerMs;
    retryAfterSeconds = Math.max(1, Math.ceil(msToWait / 1000));
  }

  const resetAt = Math.ceil(now + ((entry.capacity - entry.tokens) / refillRatePerMs));

  return {
    allowed,
    tier,
    limit: config.limit,
    remaining,
    consumed: allowed && consume ? tokensToConsume : 0,
    resetAt,
    retryAfterSeconds,
    key,
  };
}

/**
 * Read-only check: Determines if a request would be permitted without consuming tokens.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  return evaluateRateLimit(identifier, options, false);
}

/**
 * Consumes tokens and returns rate limit evaluation.
 */
export function consumeRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  return evaluateRateLimit(identifier, options, true);
}

/**
 * Generates standard HTTP headers for rate-limiting.
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }

  return headers;
}

/**
 * Creates a standard HTTP 429 NextResponse with structured error and rate limit headers.
 */
export function createRateLimitErrorResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const headers = createRateLimitHeaders(result);
  const message =
    customMessage ||
    `Too many requests on ${result.tier} tier. Please retry in ${result.retryAfterSeconds} second${result.retryAfterSeconds === 1 ? '' : 's'}.`;

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message,
      tier: result.tier,
      limit: result.limit,
      remaining: result.remaining,
      retryAfter: result.retryAfterSeconds,
      resetAt: result.resetAt,
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * High-level middleware helper for API routes.
 * Checks and consumes tokens, returning `{ success: false, response }` if rate limit is exceeded.
 */
export function enforceCoFounderRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): {
  success: boolean;
  response?: NextResponse;
  result: RateLimitResult;
} {
  const result = consumeRateLimit(identifier, options);

  if (!result.allowed) {
    return {
      success: false,
      response: createRateLimitErrorResponse(result),
      result,
    };
  }

  return {
    success: true,
    result,
  };
}

/**
 * Clears or resets the bucket store.
 * Useful for automated tests and administrative maintenance.
 */
export function resetRateLimiterStore(prefix?: string): void {
  if (!prefix) {
    bucketStore.clear();
    return;
  }
  for (const key of bucketStore.keys()) {
    if (key.includes(prefix)) {
      bucketStore.delete(key);
    }
  }
}

/**
 * Returns diagnostic metadata about the current in-memory rate limiter store.
 */
export function getRateLimiterDiagnostics(): {
  totalActiveKeys: number;
  keys: string[];
} {
  return {
    totalActiveKeys: bucketStore.size,
    keys: Array.from(bucketStore.keys()),
  };
}

/**
 * Prunes expired / inactive keys that haven't been accessed for more than maxIdleMs.
 */
export function pruneInactiveBuckets(maxIdleMs: number = 300000): number {
  const now = Date.now();
  let prunedCount = 0;

  for (const [key, entry] of bucketStore.entries()) {
    if (now - entry.lastAccessed > maxIdleMs) {
      bucketStore.delete(key);
      prunedCount++;
    }
  }

  return prunedCount;
}

// Background pruning timer setup (runs every 5 minutes in long-running Node processes)
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    pruneInactiveBuckets();
  }, 300000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}
