export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-7LY7LND9S9';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// https://developers.google.com/analytics/devguides/collection/ga4/views?client_type=gtag
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/ga4/events?client_type=gtag
export const event = ({ action, category, label, value }: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Ecommerce specific events
// https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag
export const ecommerceEvent = (eventName: string, params: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};
