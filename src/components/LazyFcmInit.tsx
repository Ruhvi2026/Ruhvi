'use client';
import dynamic from 'next/dynamic';
export const LazyFcmInit = dynamic(
  () => import('@/components/FcmInit').then((mod) => mod.FcmInit),
  { ssr: false }
);
