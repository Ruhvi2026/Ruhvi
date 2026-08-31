'use client';

import dynamic from 'next/dynamic';

const PostHogPageView = dynamic(() => import('@/components/PostHogPageView'), {
  ssr: false,
});

// GA4 (GoogleAnalytics) and the global Meta Pixel were removed in the
// analytics consolidation (Fix 13): PostHog is the primary analytics tool.
// Meta Pixel is now loaded only on checkout and product-detail pages where it
// is used for ad attribution, and its server-side CAPI events still fire via
// /api/capi. Vercel Speed Insights is unaffected.

export default function AnalyticsScripts() {
  return (
    <>
      <PostHogPageView />
    </>
  );
}
