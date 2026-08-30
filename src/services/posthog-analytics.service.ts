import { env } from '@/lib/env';
import type {
  DailyTrafficPoint,
  EventCount,
  FunnelStep,
  MarketingKpis,
  ProductPerformance,
  SessionRecording,
  SignupMethodCount,
  TopPage,
  TrafficSource,
} from '@/types/posthog-analytics';

/**
 * Executes a query against the PostHog API
 * Uses Next.js fetch with `revalidate` for caching (default 5 mins) to prevent rate limits.
 */
export async function fetchPostHogQuery(
  query: any,
  revalidate = 300,
  name?: string
) {
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
        body: JSON.stringify({
          query,
          ...(name ? { name } : {}),
        }),
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
 * Fetch Daily Pageviews over the last N days
 */
export async function getDailyPageviews(
  days = 30,
  revalidate = 300
): Promise<{ date: string; views: number }[]> {
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
      date_from: `-${days}d`,
    },
    interval: 'day',
  };

  const data = await fetchPostHogQuery(
    query,
    revalidate,
    'ruhvi_daily_pageviews'
  );

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

/**
 * Executes a raw HogQL query and normalizes the response rows into objects.
 * Returns an empty array on any failure (never throws) so dashboard panels can
 * render empty states gracefully.
 */
async function fetchHogQL(
  query: string,
  revalidate = 300,
  name = 'ruhvi_hogql'
): Promise<Record<string, any>[]> {
  const data = await fetchPostHogQuery(
    { kind: 'HogQLQuery', query },
    revalidate,
    name
  );
  if (!data || !Array.isArray(data.results)) {
    return [];
  }
  const columns: string[] = Array.isArray(data.columns) ? data.columns : [];
  return data.results.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Daily unique visitors over the last N days, based on `$pageview` events.
 */
export async function getDailyUniqueVisitors(
  days = 30,
  revalidate = 300
): Promise<{ date: string; visitors: number }[]> {
  const rows = await fetchHogQL(
    `select
       toStartOfDay(timestamp) as day,
       uniqExact(person_id) as visitors
     from events
     where event = '$pageview'
       and timestamp >= now() - INTERVAL ${days} DAY
     group by day
     order by day asc`,
    revalidate,
    'ruhvi_daily_unique_visitors'
  );

  return rows.map((r) => ({
    date: String(r.day ?? ''),
    visitors: Number(r.visitors) || 0,
  }));
}

/**
 * Merges daily pageviews + unique visitors into a single traffic series,
 * zero-filling any days where either series has no entry.
 */
export async function getDailyTraffic(
  days = 30,
  revalidate = 300
): Promise<DailyTrafficPoint[]> {
  const [pageviews, visitors] = await Promise.all([
    getDailyPageviews(days, revalidate),
    getDailyUniqueVisitors(days, revalidate),
  ]);

  const visitorMap = new Map(
    visitors.map((v) => [v.date, v.visitors] as const)
  );
  const pageviewMap = new Map(pageviews.map((p) => [p.date, p.views] as const));

  const allDates = new Set<string>([
    ...pageviewMap.keys(),
    ...visitorMap.keys(),
  ]);

  return [...allDates].sort().map((date) => ({
    date,
    views: pageviewMap.get(date) || 0,
    visitors: visitorMap.get(date) || 0,
  }));
}

/**
 * Top viewed pages over the last N days (from `$pageview` events).
 */
export async function getTopPages(
  limit = 10,
  days = 30,
  revalidate = 300
): Promise<TopPage[]> {
  const rows = await fetchHogQL(
    `select
       properties.$pathname as path,
       count() as views,
       uniqExact(person_id) as unique_visitors
     from events
     where event = '$pageview'
       and timestamp >= now() - INTERVAL ${days} DAY
     group by path
     order by views desc
     limit ${limit}`,
    revalidate,
    'ruhvi_top_pages'
  );

  return rows.map((r) => ({
    path: String(r.path ?? 'unknown'),
    views: Number(r.views) || 0,
    unique: Number(r.unique_visitors) || 0,
  }));
}

/**
 * Traffic sources over the last N days (UTM source, falling back to referring domain).
 */
export async function getTrafficSources(
  limit = 8,
  days = 30,
  revalidate = 300
): Promise<TrafficSource[]> {
  const rows = await fetchHogQL(
    `select
       coalesce(
         nullIf(properties.$utm_source, ''),
         nullIf(properties.$referring_domain, ''),
         '(direct)'
       ) as source,
       count() as count
     from events
     where event = '$pageview'
       and timestamp >= now() - INTERVAL ${days} DAY
     group by source
     order by count desc
     limit ${limit}`,
    revalidate,
    'ruhvi_traffic_sources'
  );

  return rows.map((r) => ({
    source: String(r.source ?? '(direct)'),
    count: Number(r.count) || 0,
  }));
}

const FUNNEL_EVENTS = [
  'product_viewed',
  'product_added_to_cart',
  'checkout_started',
  'purchase_completed',
] as const;

const FUNNEL_STEP_LABELS: Record<string, string> = {
  product_viewed: 'Product Viewed',
  product_added_to_cart: 'Added to Cart',
  checkout_started: 'Checkout Started',
  purchase_completed: 'Purchased',
};

/**
 * Purchase funnel (unique persons reaching each stage over the last N days).
 * Uses uniqExact per stage so each step is the count of distinct people who
 * performed that event — no double counting across sessions.
 */
export async function getPurchaseFunnel(
  days = 30,
  revalidate = 600
): Promise<FunnelStep[]> {
  const stageSelects = FUNNEL_EVENTS.map(
    (evt, i) => `uniqExactIf(person_id, event = '${evt}') as stage_${i}`
  ).join(',\n       ');

  const rows = await fetchHogQL(
    `select ${stageSelects}
     from events
     where timestamp >= now() - INTERVAL ${days} DAY`,
    revalidate,
    'ruhvi_purchase_funnel'
  );

  const first = rows[0];
  const baseline = first ? Number(first.stage_0) || 0 : 0;

  return FUNNEL_EVENTS.map((evt, i) => {
    const count = first ? Number(first[`stage_${i}`]) || 0 : 0;
    return {
      step: FUNNEL_STEP_LABELS[evt],
      count,
      conversion: baseline > 0 ? Math.round((count / baseline) * 100) : 0,
    };
  });
}

/**
 * Counts of the Phase-4 e-commerce events over the last N days.
 */
export async function getEventCounts(
  days = 30,
  revalidate = 300
): Promise<EventCount[]> {
  const events = [
    'product_viewed',
    'product_added_to_cart',
    'product_added_to_wishlist',
    'checkout_started',
    'purchase_completed',
    'signup_completed',
  ];
  const quoted = events.map((e) => `'${e}'`).join(', ');

  const rows = await fetchHogQL(
    `select event, count() as count
     from events
     where event in (${quoted})
       and timestamp >= now() - INTERVAL ${days} DAY
     group by event
     order by count desc`,
    revalidate,
    'ruhvi_event_counts'
  );

  return rows.map((r) => ({
    event: String(r.event ?? 'unknown'),
    count: Number(r.count) || 0,
  }));
}

/**
 * signup_completed split by method (email / google / phone / facebook).
 */
export async function getSignupBreakdown(
  days = 30,
  revalidate = 600
): Promise<SignupMethodCount[]> {
  const rows = await fetchHogQL(
    `select
       properties.method as method,
       count() as count
     from events
     where event = 'signup_completed'
       and timestamp >= now() - INTERVAL ${days} DAY
     group by method
     order by count desc`,
    revalidate,
    'ruhvi_signup_breakdown'
  );

  return rows.map((r) => ({
    method: String(r.method ?? 'unknown'),
    count: Number(r.count) || 0,
  }));
}

/**
 * Per-product view → add-to-cart performance over the last N days.
 */
export async function getProductPerformance(
  limit = 10,
  days = 30,
  revalidate = 600
): Promise<ProductPerformance[]> {
  const rows = await fetchHogQL(
    `select
       properties.product_id as product_id,
       argMax(properties.name, timestamp) as name,
       countIf(event = 'product_viewed') as viewed,
       countIf(event = 'product_added_to_cart') as added_to_cart
     from events
     where event in ('product_viewed', 'product_added_to_cart')
       and timestamp >= now() - INTERVAL ${days} DAY
     group by product_id
     order by viewed desc
     limit ${limit}`,
    revalidate,
    'ruhvi_product_performance'
  );

  return rows
    .filter((r) => r.product_id)
    .map((r) => {
      const viewed = Number(r.viewed) || 0;
      const addedToCart = Number(r.added_to_cart) || 0;
      return {
        product_id: String(r.product_id),
        name: String(r.name ?? r.product_id),
        viewed,
        added_to_cart: addedToCart,
        view_to_cart_pct:
          viewed > 0 ? Math.round((addedToCart / viewed) * 100) : 0,
      };
    });
}

/**
 * Recent session recordings (metadata only) for deep-linking into the PostHog
 * replay UI. Returns an empty array when the key is missing or the API fails.
 */
export async function getRecentSessionRecordings(
  limit = 6,
  revalidate = 600
): Promise<SessionRecording[]> {
  const { POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID } = env;
  if (!POSTHOG_PERSONAL_API_KEY || !POSTHOG_PROJECT_ID) {
    return [];
  }

  const baseUrl = env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
  try {
    const res = await fetch(
      `${baseUrl}/api/projects/${POSTHOG_PROJECT_ID}/session_recordings/?limit=${limit}&ordering=-start_time&has_recording=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
        },
        next: { revalidate },
      }
    );
    if (!res.ok) {
      console.error(
        `PostHog session recordings error: ${res.status} ${res.statusText}`
      );
      return [];
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.slice(0, limit).map((r: any) => ({
      id: String(r.id ?? ''),
      url: String(r.url ?? ''),
      duration: Number(r.recording_duration ?? r.duration ?? 0),
      recorded_at: String(r.start_time ?? r.created_at ?? ''),
    }));
  } catch (error) {
    console.error('Error fetching PostHog session recordings:', error);
    return [];
  }
}

/**
 * Derived marketing KPIs (rates only — revenue stays in Supabase as the
 * source of truth).
 */
export async function getMarketingKpis(
  days = 30,
  revalidate = 600
): Promise<MarketingKpis> {
  const eventCounts = await getEventCounts(days, revalidate);

  const countOf = (name: string) =>
    eventCounts.find((e) => e.event === name)?.count ?? 0;
  const viewed = countOf('product_viewed');
  const added = countOf('product_added_to_cart');
  const checkout = countOf('checkout_started');
  const purchased = countOf('purchase_completed');

  return {
    conversionRate: viewed > 0 ? Math.round((purchased / viewed) * 100) : 0,
    addToCartRate: viewed > 0 ? Math.round((added / viewed) * 100) : 0,
    checkoutRate: added > 0 ? Math.round((checkout / added) * 100) : 0,
  };
}
