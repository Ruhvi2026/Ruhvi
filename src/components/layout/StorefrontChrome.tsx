'use client';

import { ReactNode, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function isPortalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'admin.ruhvi.vercel.app' ||
    h.startsWith('admin.localhost') ||
    h === 'support.ruhvi.vercel.app' ||
    h.startsWith('support.localhost') ||
    h === 'auth.ruhvi.vercel.app' ||
    h.startsWith('auth.localhost') ||
    h === 'operation.ruhvi.vercel.app' ||
    h.startsWith('operation.localhost') ||
    h === 'marketing.ruhvi.vercel.app' ||
    h.startsWith('marketing.localhost') ||
    h === 'orders.ruhvi.vercel.app' ||
    h.startsWith('orders.localhost') ||
    h === 'tech.ruhvi.vercel.app' ||
    h.startsWith('tech.localhost')
  );
}

const PORTAL_PATHS = [
  '/admin',
  '/manager',
  '/staff',
  '/operations',
  '/portal-orders',
  '/support',
  '/marketing',
  '/tech',
];

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Predict if it's a portal based on pathname for SSR
  const isPortalPath = PORTAL_PATHS.some(
    (p) => pathname === p || (pathname && pathname.startsWith(p + '/'))
  );

  const [isPortal, setIsPortal] = useState(isPortalPath);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const isPortalHost = isPortalHostname(window.location.hostname);
      setIsPortal(isPortalHost || isPortalPath);
    }
  }, [isPortalPath]);

  if (isPortal) return null;

  return <>{children}</>;
}
