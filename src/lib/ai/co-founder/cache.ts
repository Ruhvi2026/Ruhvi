import 'server-only';

export interface CacheOptions {
  ttlMs?: number; // Time-to-live before entry is considered expired (default: 60,000ms = 60s)
  staleTtlMs?: number; // Stale-while-revalidate window (default: ttlMs * 2)
  tags?: string[]; // Namespace tags for targeted invalidation (e.g., ['analytics', 'orders'])
  enableSwr?: boolean; // Whether stale-while-revalidate is permitted (default: true)
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  staleExpiresAt: number;
  tags: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  entryCount: number;
  hitRatio: number;
}

export class CoFounderCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxEntries: number;
  private defaultTtlMs: number;
  private stats: {
    hits: number;
    misses: number;
    staleHits: number;
    evictions: number;
  } = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private inFlightRevalidations: Set<string> = new Set();

  constructor(options?: { maxEntries?: number; defaultTtlMs?: number }) {
    this.maxEntries = options?.maxEntries || 500;
    this.defaultTtlMs = options?.defaultTtlMs || 60_000;

    // Background interval to prune fully expired items every 2 minutes.
    // Use .unref() to ensure Jest and Node process exits cleanly.
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        this.pruneExpired();
      }, 120_000);
      if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Retrieves an item from cache or computes it via fetcher with LRU and SWR semantics.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const now = Date.now();
    const entry = this.store.get(key);

    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const staleTtlMs = options?.staleTtlMs ?? ttlMs * 2;
    const enableSwr = options?.enableSwr ?? true;
    const tags = options?.tags || [];

    if (entry) {
      // 1. Fresh hit: Return immediately and update LRU order
      if (now < entry.expiresAt) {
        this.stats.hits++;
        this.touch(key, entry);
        return entry.value as T;
      }

      // 2. Stale hit (within SWR window): Return stale data immediately and revalidate in background
      if (enableSwr && now < entry.staleExpiresAt) {
        this.stats.staleHits++;
        this.touch(key, entry);

        // Trigger background revalidation if not already in-flight
        if (!this.inFlightRevalidations.has(key)) {
          this.inFlightRevalidations.add(key);
          Promise.resolve()
            .then(async () => {
              try {
                const freshValue = await fetcher();
                this.set(key, freshValue, { ttlMs, staleTtlMs, tags });
              } catch (err: any) {
                // Background revalidation failure silently keeps existing stale entry
              } finally {
                this.inFlightRevalidations.delete(key);
              }
            });
        }

        return entry.value as T;
      }

      // 3. Fully expired: Delete stale entry
      this.store.delete(key);
    }

    // 4. Cache Miss: Compute fresh value synchronously
    this.stats.misses++;
    const freshValue = await fetcher();
    this.set(key, freshValue, { ttlMs, staleTtlMs, tags });
    return freshValue;
  }

  /**
   * Set a value in the cache, managing LRU capacity and tags.
   */
  set<T>(key: string, value: T, options?: CacheOptions): void {
    const now = Date.now();
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const staleTtlMs = options?.staleTtlMs ?? ttlMs * 2;
    const tags = options?.tags || [];

    // If key already exists, delete it first to ensure it's re-inserted at tail (most recently used)
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map iterator)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
      staleExpiresAt: now + staleTtlMs,
      tags,
    };

    this.store.set(key, entry);
  }

  /**
   * Get an item directly from cache without computing.
   */
  get<T>(key: string): T | undefined {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (now >= entry.staleExpiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }

    if (now >= entry.expiresAt) {
      this.stats.staleHits++;
    } else {
      this.stats.hits++;
    }

    this.touch(key, entry);
    return entry.value as T;
  }

  /**
   * Check if active or stale entry exists for key.
   */
  has(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry) return false;
    if (now >= entry.staleExpiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete specific key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidates all cache entries with matching tag.
   */
  invalidateTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidates all cache entries whose key starts with prefix.
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Prune all expired entries past their staleExpiresAt window.
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.staleExpiresAt) {
        this.store.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Updates LRU access ordering by re-inserting to tail.
   */
  private touch(key: string, entry: CacheEntry<any>): void {
    this.store.delete(key);
    this.store.set(key, entry);
  }

  /**
   * Get diagnostic performance statistics.
   */
  getStats(): CacheStats {
    const totalRequests =
      this.stats.hits + this.stats.staleHits + this.stats.misses;
    const hitRatio =
      totalRequests > 0
        ? Math.round(
            ((this.stats.hits + this.stats.staleHits) / totalRequests) * 1000
          ) / 1000
        : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      staleHits: this.stats.staleHits,
      evictions: this.stats.evictions,
      entryCount: this.store.size,
      hitRatio,
    };
  }

  /**
   * Reset store and stats (ideal for testing and teardowns).
   */
  clear(): void {
    this.store.clear();
    this.inFlightRevalidations.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0,
    };
  }

  /**
   * Dispose cleanup timer.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Global Singleton for AI Co-Founder operations
export const coFounderCache = new CoFounderCache({
  maxEntries: 500,
  defaultTtlMs: 60_000,
});

/**
 * Convenience helper to get or set cached data with singleton.
 */
export async function getOrSetCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return coFounderCache.getOrSet(key, fetcher, options);
}

/**
 * Invalidate all items carrying tag.
 */
export function invalidateCoFounderCacheTag(tag: string): number {
  return coFounderCache.invalidateTag(tag);
}

/**
 * Invalidate all items with prefix.
 */
export function invalidateCoFounderCachePrefix(prefix: string): number {
  return coFounderCache.invalidatePrefix(prefix);
}

/**
 * Reset co-founder cache store and stats.
 */
export function resetCoFounderCache(): void {
  coFounderCache.clear();
}

/**
 * Get co-founder cache diagnostic statistics.
 */
export function getCoFounderCacheStats(): CacheStats {
  return coFounderCache.getStats();
}
