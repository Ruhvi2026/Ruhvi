'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DynamicFcmInit = dynamic(
  () => import('@/components/FcmInit').then((mod) => mod.FcmInit),
  { ssr: false }
);

export function LazyFcmInit() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const hasSession =
      document.cookie.includes('__session') ||
      !!localStorage.getItem('supabaseToken') ||
      !!localStorage.getItem('ruhvi_auth');

    if (hasSession) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const id = (window as any).requestIdleCallback(
          () => setShouldLoad(true),
          { timeout: 3000 }
        );
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const timer = setTimeout(() => setShouldLoad(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!shouldLoad) return null;
  return <DynamicFcmInit />;
}
