'use client';

import dynamic from 'next/dynamic';

const PostHogPageView = dynamic(() => import('@/components/PostHogPageView'), {
  ssr: false,
});
const GoogleAnalytics = dynamic(() => import('@/components/GoogleAnalytics'), {
  ssr: false,
});
const MetaPixel = dynamic(() => import('@/components/MetaPixel'), {
  ssr: false,
});

export default function AnalyticsScripts() {
  return (
    <>
      <GoogleAnalytics />
      <PostHogPageView />
      <MetaPixel />
    </>
  );
}
