// GA4 was removed in the analytics consolidation (Fix 13). These helpers are
// kept so call sites keep working, but events are captured by PostHog — the
// primary analytics tool — so the e-commerce funnel is not lost.

let posthogPromise: Promise<any> | null = null;
function getPostHog() {
  if (typeof window === 'undefined') return null;
  if (!posthogPromise) {
    posthogPromise = import('posthog-js/dist/module.slim').then(
      (m) => m.default
    );
  }
  return posthogPromise;
}

export const pageview = (url: string) => {
  getPostHog()?.then((ph) => {
    ph.capture('$pageview', { $current_url: url });
  });
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
  getPostHog()?.then((ph) => {
    ph.capture(action, { category, label, value });
  });
};

export const ecommerceEvent = (
  eventName: string,
  params: Record<string, any>
) => {
  getPostHog()?.then((ph) => {
    ph.capture(eventName, params);
  });
};
