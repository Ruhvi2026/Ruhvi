import posthog from 'posthog-js';

// GA4 was removed in the analytics consolidation (Fix 13). These helpers are
// kept so call sites keep working, but events are captured by PostHog — the
// primary analytics tool — so the e-commerce funnel is not lost.

export const pageview = (url: string) => {
  if (typeof window !== 'undefined') {
    posthog.capture('$pageview', { $current_url: url });
  }
};

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined') {
    posthog.capture(action, { category, label, value });
  }
};

export const ecommerceEvent = (
  eventName: string,
  params: Record<string, any>
) => {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, params);
  }
};
