import { env } from '@/lib/env';

/**
 * Executes a query against the PostHog API
 * Uses Next.js fetch with `revalidate` for caching (default 5 mins) to prevent rate limits.
 */
export async function fetchPostHogQuery(query: any, revalidate = 300) {
  const { POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID } = env;

  if (!POSTHOG_PERSONAL_API_KEY || !POSTHOG_PROJECT_ID) {
    console.warn(
      'PostHog API Key or Project ID is missing. Returning empty analytics data.'
    );
    return null;
  }

  // The base URL for PostHog API
  // Using the host defined in env (e.g. https://eu.i.posthog.com or https://app.posthog.com)
  const baseUrl = env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

  try {
    const res = await fetch(
      `${baseUrl}/api/projects/${POSTHOG_PROJECT_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
        },
        body: JSON.stringify({ query }),
        next: {
          revalidate, // Cache for 5 minutes by default
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`PostHog API Error: ${res.status} ${res.statusText}`, text);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching from PostHog:', error);
    return null;
  }
}

/**
 * Example: Fetch Daily Pageviews over the last 30 days
 */
export async function getDailyPageviews() {
  // PostHog HogQL / Query API for daily pageviews
  const query = {
    kind: 'TrendsQuery',
    series: [
      {
        kind: 'EventsNode',
        event: '$pageview',
        math: 'total',
      },
    ],
    dateRange: {
      date_from: '-30d',
    },
    interval: 'day',
  };

  const data = await fetchPostHogQuery(query);

  if (!data || !data.results || !data.results[0]) {
    return [];
  }

  // Map PostHog data format (arrays of dates and values) to Recharts object format
  const result = data.results[0];
  const dates = result.days;
  const values = result.data;

  // Combine into [{ date, views }]
  const mappedData = dates.map((dateStr: string, index: number) => {
    return {
      date: dateStr,
      views: values[index] || 0,
    };
  });

  return mappedData;
}
