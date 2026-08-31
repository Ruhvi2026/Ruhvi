'use client';

import { ReactNode, useLayoutEffect, useState } from 'react';

function isPortalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'admin.ruhvi.in' ||
    h.startsWith('admin.localhost') ||
    h === 'support.ruhvi.in' ||
    h.startsWith('support.localhost') ||
    h === 'auth.ruhvi.in' ||
    h.startsWith('auth.localhost') ||
    h === 'operation.ruhvi.in' ||
    h.startsWith('operation.localhost') ||
    h === 'marketing.ruhvi.in' ||
    h.startsWith('marketing.localhost') ||
    h === 'orders.ruhvi.in' ||
    h.startsWith('orders.localhost')
  );
}

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const [isPortal, setIsPortal] = useState(false);

  useLayoutEffect(() => {
    setIsPortal(
      typeof window !== 'undefined' &&
        isPortalHostname(window.location.hostname)
    );
  }, []);

  if (isPortal) return null;

  return <>{children}</>;
}
