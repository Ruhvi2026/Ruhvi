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
      setShouldLoad(true);
    }
  }, []);

  if (!shouldLoad) return null;
  return <DynamicFcmInit />;
}
