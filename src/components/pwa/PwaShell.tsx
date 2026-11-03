'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { PwaInstallPrompt } from './PwaInstallPrompt';

/**
 * PwaShell
 *
 * Single component that initializes the entire PWA infrastructure:
 * 1. Registers the service worker for offline caching & install eligibility.
 * 2. Renders the install prompt banner (Chromium + iOS Safari).
 *
 * Mount once in the root layout. Renders nothing visible until install prompt triggers.
 */
export function PwaShell() {
  useServiceWorker();

  return <PwaInstallPrompt />;
}
