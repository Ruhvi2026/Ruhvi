'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

/**
 * BeforeInstallPromptEvent — browser-native install prompt event.
 * Only fired in Chromium-based browsers (Chrome, Edge, Samsung Internet, Opera).
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'ruhvi-pwa-install-dismissed';
const DISMISS_EXPIRY_DAYS = 14; // Don't show again for 14 days after dismissal

/**
 * PwaInstallPrompt
 *
 * A non-intrusive bottom banner that appears when:
 * 1. The browser fires beforeinstallprompt (Chromium PWA-installable).
 * 2. The user hasn't dismissed it in the last 14 days.
 * 3. The app is not already installed (standalone mode).
 *
 * On iOS Safari (which doesn't fire beforeinstallprompt) it shows a gentle
 * "Add to Home Screen" instruction instead.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    // Don't show if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as any).standalone === true) return;

    // Don't show if recently dismissed
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince =
        (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_EXPIRY_DAYS) return;
    }

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIos && isSafari) {
      setIsIosSafari(true);
      // Show iOS banner after 5 seconds
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }

    // Chromium: Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a short delay to not interrupt browsing
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch {
      // User cancelled or error
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  if (!showBanner) return null;

  return (
    <div
      role="complementary"
      aria-label="Install Ruhvi App"
      className="animate-in slide-in-from-bottom-4 fixed bottom-0 left-0 right-0 z-[90] border-t border-gold-200/30 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-lg dark:border-gold-800/30 dark:bg-charcoal-900/95 dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        {/* App Icon */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-charcoal-900 shadow-md dark:bg-gold-500/10">
          <Smartphone className="h-6 w-6 text-gold-500" aria-hidden="true" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
            Install Ruhvi App
          </p>
          <p className="truncate text-xs text-charcoal-500 dark:text-charcoal-400">
            {isIosSafari
              ? 'Tap the share button, then "Add to Home Screen"'
              : 'Quick access from your home screen — no download needed'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {!isIosSafari && (
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-charcoal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-900 active:scale-[0.97] dark:bg-gold-500 dark:text-charcoal-900 dark:hover:bg-gold-400"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="rounded-full p-1.5 text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-900 dark:text-charcoal-500 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
