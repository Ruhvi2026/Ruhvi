'use client';

import { useEffect, useRef } from 'react';

/**
 * Registers the Ruhvi PWA service worker on the client.
 * Handles update detection and periodic runtime cache trimming.
 *
 * Mount once in the root layout (inside a Suspense boundary or directly).
 */
export function useServiceWorker() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    registered.current = true;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Check for updates every 60 minutes
        const UPDATE_INTERVAL = 60 * 60 * 1000;
        setInterval(() => {
          registration.update();
        }, UPDATE_INTERVAL);

        // Listen for a new SW waiting to activate
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new version is available — activate it immediately.
              // In a future iteration you could show a toast: "New version available, refresh?"
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });

        // Trim the runtime cache periodically (every 30 min)
        setInterval(
          () => {
            if (registration.active) {
              registration.active.postMessage('TRIM_CACHE');
            }
          },
          30 * 60 * 1000
        );
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    // Register after the page has fully loaded to avoid blocking first paint
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);
}
