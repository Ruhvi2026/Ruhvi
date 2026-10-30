'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Detects browser online/offline connectivity transitions.
 * Displays an accessible, non-intrusive alert when connection is lost (Finding E4 & 27).
 */
export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial state
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in slide-in-from-bottom-2 fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-center space-x-2 bg-red-600 px-4 py-2 text-xs font-semibold text-white"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>
        You appear to be offline. Please reconnect to continue shopping.
      </span>
    </div>
  );
}
