jest.mock('server-only', () => ({}));

import {
  CoFounderCache,
  getOrSetCached,
  invalidateCoFounderCacheTag,
  invalidateCoFounderCachePrefix,
  resetCoFounderCache,
  getCoFounderCacheStats,
} from '../cache';

describe('Phase 10 Step 1 — CoFounderCache Engine & Memoization', () => {
  beforeEach(() => {
    resetCoFounderCache();
    jest.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('sets, retrieves, and checks existence of entries', () => {
      const cache = new CoFounderCache({ maxEntries: 10, defaultTtlMs: 5000 });

      expect(cache.has('k1')).toBe(false);
      expect(cache.get('k1')).toBeUndefined();

      cache.set('k1', { value: 42 }, { tags: ['test'] });

      expect(cache.has('k1')).toBe(true);
      expect(cache.get('k1')).toEqual({ value: 42 });

      expect(cache.delete('k1')).toBe(true);
      expect(cache.has('k1')).toBe(false);

      cache.destroy();
    });

    it('tracks hits, misses, and hitRatio accurately in stats', () => {
      const cache = new CoFounderCache({ maxEntries: 10 });

      cache.get('miss1'); // miss
      cache.get('miss2'); // miss

      cache.set('hit1', 'val1');
      cache.get('hit1'); // hit
      cache.get('hit1'); // hit

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.entryCount).toBe(1);
      expect(stats.hitRatio).toBe(0.5); // 2 hits / 4 total

      cache.destroy();
    });
  });

  describe('LRU Eviction Policy', () => {
    it('evicts the least recently used item when maxEntries is exceeded', () => {
      const cache = new CoFounderCache({ maxEntries: 3, defaultTtlMs: 10000 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.getStats().entryCount).toBe(3);

      // Add 4th item -> 'a' should be evicted as oldest
      cache.set('d', 4);

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
      expect(cache.getStats().evictions).toBe(1);

      cache.destroy();
    });

    it('accessing an item refreshes its LRU priority so it is not evicted first', () => {
      const cache = new CoFounderCache({ maxEntries: 3, defaultTtlMs: 10000 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' so 'b' becomes the oldest
      expect(cache.get('a')).toBe(1);

      // Add 4th item -> 'b' should be evicted, 'a' should remain
      cache.set('d', 4);

      expect(cache.has('b')).toBe(false);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);

      cache.destroy();
    });
  });

  describe('getOrSet with SWR (Stale-While-Revalidate)', () => {
    it('computes fresh value on miss and serves from cache on subsequent calls', async () => {
      const cache = new CoFounderCache({ maxEntries: 10 });
      let fetchCount = 0;
      const fetcher = jest.fn(async () => {
        fetchCount++;
        return { count: fetchCount };
      });

      const first = await cache.getOrSet('test-key', fetcher, { ttlMs: 1000 });
      expect(first).toEqual({ count: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1);

      const second = await cache.getOrSet('test-key', fetcher, { ttlMs: 1000 });
      expect(second).toEqual({ count: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1); // Cached, fetcher not re-invoked

      cache.destroy();
    });

    it('serves stale entry immediately while triggering revalidation in background', async () => {
      const cache = new CoFounderCache({ maxEntries: 10 });
      let counter = 100;
      const fetcher = jest.fn(async () => {
        counter += 10;
        return counter;
      });

      // Insert item with 50ms TTL, 200ms stale TTL
      await cache.getOrSet('swr-key', fetcher, { ttlMs: 50, staleTtlMs: 200 });
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Fast forward time past fresh TTL (70ms), but inside stale window
      const originalNow = Date.now;
      const fakeNow = originalNow() + 70;
      jest.spyOn(Date, 'now').mockReturnValue(fakeNow);

      // Call during stale window: returns stale value immediately
      const staleResult = await cache.getOrSet('swr-key', fetcher, {
        ttlMs: 50,
        staleTtlMs: 200,
      });
      expect(staleResult).toBe(110); // Returned stale value
      expect(cache.getStats().staleHits).toBe(1);

      // Wait a tick for background revalidation promise to complete
      await new Promise((r) => setTimeout(r, 10));
      expect(fetcher).toHaveBeenCalledTimes(2);

      // Restore time
      (Date.now as any).mockRestore();
      cache.destroy();
    });
  });

  describe('Tag & Prefix Invalidation', () => {
    it('invalidates entries by tag correctly', () => {
      const cache = new CoFounderCache({ maxEntries: 10 });

      cache.set('orders:1', { id: 1 }, { tags: ['orders', 'finance'] });
      cache.set('orders:2', { id: 2 }, { tags: ['orders'] });
      cache.set('products:1', { id: 1 }, { tags: ['catalog'] });

      expect(cache.getStats().entryCount).toBe(3);

      const invalidatedCount = cache.invalidateTag('orders');
      expect(invalidatedCount).toBe(2);

      expect(cache.has('orders:1')).toBe(false);
      expect(cache.has('orders:2')).toBe(false);
      expect(cache.has('products:1')).toBe(true);

      cache.destroy();
    });

    it('invalidates entries by key prefix correctly', () => {
      const cache = new CoFounderCache({ maxEntries: 10 });

      cache.set('user:session:1', 'token1');
      cache.set('user:session:2', 'token2');
      cache.set('admin:session:1', 'admintoken');

      const removed = cache.invalidatePrefix('user:session:');
      expect(removed).toBe(2);

      expect(cache.has('user:session:1')).toBe(false);
      expect(cache.has('user:session:2')).toBe(false);
      expect(cache.has('admin:session:1')).toBe(true);

      cache.destroy();
    });
  });

  describe('Global Singleton & Convenience Helpers', () => {
    it('provides getOrSetCached, invalidateCoFounderCacheTag, and resetCoFounderCache', async () => {
      let run = 0;
      const res1 = await getOrSetCached('global-test', async () => ++run, {
        tags: ['global'],
      });
      expect(res1).toBe(1);

      const res2 = await getOrSetCached('global-test', async () => ++run, {
        tags: ['global'],
      });
      expect(res2).toBe(1); // Cached

      const stats = getCoFounderCacheStats();
      expect(stats.hits).toBe(1);

      invalidateCoFounderCacheTag('global');
      const res3 = await getOrSetCached('global-test', async () => ++run, {
        tags: ['global'],
      });
      expect(res3).toBe(2); // Fresh calculation after tag invalidation

      resetCoFounderCache();
      expect(getCoFounderCacheStats().entryCount).toBe(0);
    });
  });
});
