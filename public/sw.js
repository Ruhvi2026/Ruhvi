/// <reference lib="webworker" />

// ─────────────────────────────────────────────────────────────────────────────
// Ruhvi PWA Service Worker
// Handles: Offline caching, navigation fallback, and static asset caching.
// Push notifications are handled separately by firebase-messaging-sw.js.
// ─────────────────────────────────────────────────────────────────────────────

const SW_VERSION = '1.0.0';
const CACHE_PREFIX = 'ruhvi-pwa';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${SW_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-v${SW_VERSION}`;

// Assets to pre-cache on install (app shell)
const APP_SHELL = [
  '/offline.html',
  '/logo.png',
  '/favicon.ico',
  '/android-chrome-192x192.png',
];

// Routes that should NEVER be cached (authenticated/dynamic)
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /\/account\//,
  /\/admin\//,
  /\/co-founder\//,
  /\/operations\//,
  /\/portal-orders\//,
  /\/support\//,
  /\/marketing\//,
  /\/tech\//,
  /\/cart/,
  /\/checkout/,
  /\/login/,
  /\/signup/,
  /\/set-password/,
  /\/reset-password/,
  /\/forgot-password/,
  /\/complete-profile/,
  /\/wishlist/,
  /\/order-success/,
  /\/tracking\//,
  /\/_next\/webpack-hmr/,
];

// ─────────────────────────────────────────────────────────────────────────────
// Install: Pre-cache app shell
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────────────────
// Activate: Clean up old caches
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Claim all open tabs immediately
  self.clients.claim();
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch: Network-first for pages, Cache-first for static assets
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: non-GET, chrome-extension, or cross-origin (analytics, CDN images, etc.)
  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Skip: Routes that must never be cached
  if (NO_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) return;

  // Strategy 1: Cache-first for static assets (images, fonts, CSS, JS bundles)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Strategy 2: Network-first for HTML navigation (pages)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Strategy 3: Stale-while-revalidate for everything else (API responses for public data, etc.)
  event.respondWith(staleWhileRevalidate(request));
});

// ─────────────────────────────────────────────────────────────────────────────
// Caching strategies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache-first: Serve from cache if available, fall back to network.
 * Best for versioned static assets that rarely change.
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // For images, return a transparent 1x1 pixel to avoid broken image icons
    if (request.destination === 'image') {
      return new Response(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        {
          headers: { 'Content-Type': 'image/gif' },
          status: 200,
        }
      );
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first for navigation: Try network, fall back to cache, then offline page.
 * Ensures users always get the freshest page when online.
 */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try to serve the cached version of this page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Last resort: offline fallback page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;

    return new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Stale-while-revalidate: Serve from cache immediately, update cache in background.
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Check if a URL points to a static asset worth caching */
function isStaticAsset(url) {
  const staticExtensions = /\.(js|css|woff2|woff|ttf|png|jpg|jpeg|webp|avif|svg|ico|gif)$/i;
  // Next.js hashed static chunks
  if (url.pathname.startsWith('/_next/static/')) return true;
  return staticExtensions.test(url.pathname);
}

// ─────────────────────────────────────────────────────────────────────────────
// Periodic cache cleanup (keep runtime cache under 200 entries)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'TRIM_CACHE') {
    trimCache(RUNTIME_CACHE, 200);
  }
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

