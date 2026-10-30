import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';

/**
 * ============================================================================
 * SHARED READ-ONLY METRICS SERVICE (TRACK B - PHASE 15)
 * ============================================================================
 * Single, permission-checked, cached read interface for canonical business KPIs.
 * Adheres strictly to the Business KPI Dictionary (docs/BUSINESS_KPI_DICTIONARY.md)
 * and Privacy/Authorization Model (docs/PRIVACY_AUTHORIZATION_ACTION_SAFETY_MODEL.md).
 *
 * Guarantees:
 * 1. Single Source of Truth: Evaluates metrics from authoritative PostgreSQL tables
 *    (orders, returns, order_events, products) rather than disconnected analytics.
 * 2. Asia/Kolkata Timezone Integrity: Date ranges are calculated in IST (UTC+05:30).
 * 3. Strict RBAC: Staff roles cannot access financial revenue/AOV metrics.
 * 4. Explicit Insufficient Data States: Zero division returns 'insufficient_data'
 *    with value null rather than invented zeroes.
 * 5. Bounded Query & Caching: Bounded query limits and in-memory caching (60s TTL).
 */

export type CanonicalMetric =
  | 'gross_sales'
  | 'net_sales'
  | 'paid_orders_count'
  | 'average_order_value'
  | 'cancellation_rate'
  | 'rto_rate'
  | 'return_rate'
  | 'stock_out_rate'
  | 'payment_failure_rate';

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'custom';

export interface TimeWindow {
  start: string; // ISO string in UTC
  end: string; // ISO string in UTC
  timezone: string; // Always 'Asia/Kolkata'
  preset: DateRangePreset;
}

export interface MetricValue<T = number> {
  metric: CanonicalMetric;
  value: T | null;
  status: 'available' | 'insufficient_data' | 'unavailable';
  currency?: string;
  unit?: string;
  sampleSize?: number;
  metadata?: Record<string, any>;
  calculatedAt: string;
  timeWindow: TimeWindow;
}

export interface GetMetricOptions {
  callerRole:
    'customer' | 'staff' | 'manager' | 'admin' | 'super_admin' | string;
  preset?: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  fresh?: boolean;
}

export class MetricsAuthorizationError extends Error {
  constructor(role: string, metric: string) {
    super(
      `Role '${role}' is not authorized to read canonical metric '${metric}'`
    );
    this.name = 'MetricsAuthorizationError';
  }
}

// In-memory cache for aggregate metrics (60s TTL)
interface CacheEntry {
  metricValue: MetricValue;
  expiresAt: number;
}
const metricsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Computes exact start and end UTC timestamps corresponding to Asia/Kolkata boundaries.
 */
export function getIstTimeWindow(
  preset: DateRangePreset = 'last_30_days',
  customStart?: string,
  customEnd?: string
): TimeWindow {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30
  const nowUtc = Date.now();
  const nowIst = new Date(nowUtc + IST_OFFSET_MS);

  if (preset === 'custom' && customStart && customEnd) {
    return {
      start: new Date(customStart).toISOString(),
      end: new Date(customEnd).toISOString(),
      timezone: 'Asia/Kolkata',
      preset: 'custom',
    };
  }

  // Calculate midnight today in IST
  const year = nowIst.getUTCFullYear();
  const month = nowIst.getUTCMonth();
  const date = nowIst.getUTCDate();

  const istMidnightUtcMs = Date.UTC(year, month, date) - IST_OFFSET_MS;

  let startUtcMs = istMidnightUtcMs;
  let endUtcMs = nowUtc;

  switch (preset) {
    case 'today':
      startUtcMs = istMidnightUtcMs;
      endUtcMs = nowUtc;
      break;
    case 'yesterday':
      startUtcMs = istMidnightUtcMs - 24 * 60 * 60 * 1000;
      endUtcMs = istMidnightUtcMs - 1; // 23:59:59.999
      break;
    case 'last_7_days':
      startUtcMs = istMidnightUtcMs - 7 * 24 * 60 * 60 * 1000;
      endUtcMs = nowUtc;
      break;
    case 'last_30_days':
      startUtcMs = istMidnightUtcMs - 30 * 24 * 60 * 60 * 1000;
      endUtcMs = nowUtc;
      break;
    case 'this_month':
      startUtcMs = Date.UTC(year, month, 1) - IST_OFFSET_MS;
      endUtcMs = nowUtc;
      break;
  }

  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString(),
    timezone: 'Asia/Kolkata',
    preset,
  };
}

/**
 * Validates caller permissions for requested metric.
 */
export function verifyMetricsAuthorization(
  callerRole: string,
  metric: CanonicalMetric
): boolean {
  const normalizedRole = callerRole.toLowerCase();

  // Super admins and admins have full access
  if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
    return true;
  }

  // Customers have zero access to aggregate store metrics
  if (normalizedRole === 'customer' || !normalizedRole) {
    return false;
  }

  // Financial metrics (Gross/Net Sales, AOV) are strictly Admin/Manager
  const financialMetrics: CanonicalMetric[] = [
    'gross_sales',
    'net_sales',
    'average_order_value',
  ];
  if (financialMetrics.includes(metric)) {
    return normalizedRole === 'manager';
  }

  // Operational metrics (Cancellation, RTO, Return, Stockout, Payment failure)
  const operationalMetrics: CanonicalMetric[] = [
    'cancellation_rate',
    'rto_rate',
    'return_rate',
    'stock_out_rate',
    'paid_orders_count',
    'payment_failure_rate',
  ];
  if (operationalMetrics.includes(metric)) {
    return normalizedRole === 'staff' || normalizedRole === 'manager';
  }

  return false;
}

/**
 * Detects whether an order record is an automated QA synthetic test or sandbox artifact.
 */
export function isSyntheticOrTestOrder(order: any): boolean {
  if (!order || typeof order !== 'object') return false;
  if (order.is_test === true || order.is_test === 'true') return true;
  if (order.status === 'cancelled_synthetic_test') return true;
  if (order.payment_method === 'synthetic_test_sandbox') return true;
  if (
    typeof order.order_number === 'string' &&
    order.order_number.startsWith('SYNTH_ORD_')
  ) {
    return true;
  }
  if (
    typeof order.user_id === 'string' &&
    order.user_id.startsWith('usr_synth_qa_')
  ) {
    return true;
  }
  return false;
}

/**
 * Terminal, non-realized, or contested statuses excluded from net sales realization.
 */
export const NON_NET_SALES_STATUSES = new Set([
  'pending',
  'cancelled',
  'returned',
  'return_requested',
  'return_approved',
  'rto_initiated',
  'rto_received',
  'delivery_failed',
  'refunded',
]);

/**
 * Statuses that invalidate a pure COD order from being counted as paid/committed.
 */
export const NON_PAID_COD_STATUSES = new Set([
  'pending',
  'cancelled',
  'returned',
  'return_requested',
  'return_approved',
  'rto_initiated',
  'rto_received',
  'delivery_failed',
  'refunded',
]);

/**
 * Safely executes order reads across PostgREST row limits with automatic pagination
 * when supported, falling back cleanly for standard test mocks.
 */
export async function fetchOrdersPaginated(
  supabase: any,
  selectFields: string,
  timeWindow: TimeWindow,
  pageSize = 1000
): Promise<{ data: any[] | null; error: any }> {
  try {
    const baseQuery = supabase
      .from('orders')
      .select(selectFields)
      .gte('created_at', timeWindow.start)
      .lte('created_at', timeWindow.end);

    // If PostgREST client supports .range() pagination (production runtime)
    if (typeof baseQuery?.range === 'function') {
      const allRows: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select(selectFields)
          .gte('created_at', timeWindow.start)
          .lte('created_at', timeWindow.end)
          .range(offset, offset + pageSize - 1);

        if (error) return { data: null, error };
        if (!data || data.length === 0) break;

        allRows.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }
      return { data: allRows, error: null };
    }

    // Direct resolution for Jest test doubles where .range is not mocked
    const res = await baseQuery;
    return { data: res?.data || null, error: res?.error || null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Retrieves a single canonical metric with permission checks, caching, and fallback handling.
 */
export async function getCanonicalMetric(
  metric: CanonicalMetric,
  options: GetMetricOptions
): Promise<MetricValue> {
  const {
    callerRole,
    preset = 'last_30_days',
    customStart,
    customEnd,
    fresh = false,
  } = options;

  // 1. RBAC Check
  if (!verifyMetricsAuthorization(callerRole, metric)) {
    throw new MetricsAuthorizationError(callerRole, metric);
  }

  // 2. Time Window Calculation
  const timeWindow = getIstTimeWindow(preset, customStart, customEnd);

  // 3. Cache Lookup
  const cacheKey =
    preset === 'custom'
      ? `${metric}_custom_${customStart}_${customEnd}`
      : `${metric}_${preset}`;
  if (!fresh) {
    const cached = metricsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.metricValue;
    }
  }

  const supabase = getServiceClient();
  const calculatedAt = new Date().toISOString();

  let metricValue: MetricValue;

  switch (metric) {
    case 'gross_sales': {
      // Sum of orders.total where status != 'pending', excluding synthetic/test orders
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'total, status, order_number, user_id, payment_method, is_test',
        timeWindow
      );

      if (error || !rawOrders) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          currency: 'INR',
          unit: '₹',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      // Exclude synthetic/test orders and pending unconfirmed checkouts
      const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));
      const validOrders = orders.filter((o) => o.status !== 'pending');
      const totalGross = validOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );

      // Collect demand deductions breakdown in metadata
      const cancelledDemand = validOrders
        .filter((o) => o.status === 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const returnedDemand = validOrders
        .filter(
          (o) =>
            o.status === 'returned' ||
            o.status === 'return_approved' ||
            o.status === 'return_requested'
        )
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const rtoDemand = validOrders
        .filter(
          (o) => o.status === 'rto_received' || o.status === 'rto_initiated'
        )
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      metricValue = {
        metric,
        value: Number(totalGross.toFixed(2)),
        status: 'available',
        currency: 'INR',
        unit: '₹',
        sampleSize: validOrders.length,
        metadata: {
          testOrdersExcludedCount: rawOrders.length - orders.length,
          cancelledDemand: Number(cancelledDemand.toFixed(2)),
          returnedDemand: Number(returnedDemand.toFixed(2)),
          rtoDemand: Number(rtoDemand.toFixed(2)),
          note: 'Gross sales represents total placed customer demand before deductions per Business KPI Dictionary.',
        },
        calculatedAt,
        timeWindow,
      };
      break;
    }

    case 'net_sales': {
      // Gross sales excluding cancellations, returns, RTOs, delivery failures, and refunds
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'total, status, id, order_number, user_id, payment_status, payment_method, is_test',
        timeWindow
      );

      if (error || !rawOrders) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          currency: 'INR',
          unit: '₹',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));
      const eligibleOrders = orders.filter(
        (o) =>
          !NON_NET_SALES_STATUSES.has(o.status) &&
          o.payment_status !== 'refunded'
      );
      const totalNet = eligibleOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );

      metricValue = {
        metric,
        value: Number(totalNet.toFixed(2)),
        status: 'available',
        currency: 'INR',
        unit: '₹',
        sampleSize: eligibleOrders.length,
        metadata: {
          testOrdersExcludedCount: rawOrders.length - orders.length,
          excludedNonNetCount: orders.length - eligibleOrders.length,
        },
        calculatedAt,
        timeWindow,
      };
      break;
    }

    case 'paid_orders_count': {
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'id, payment_status, is_partial_cod, payment_method, status, order_number, user_id, is_test',
        timeWindow
      );

      if (error || !rawOrders) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          unit: 'orders',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));

      let onlinePrepaidCount = 0;
      let partialCodCount = 0;
      let codSettledCount = 0;
      let codInTransitCount = 0;

      const paidOrders = orders.filter((o) => {
        if (
          o.payment_method === 'cod' &&
          !NON_PAID_COD_STATUSES.has(o.status)
        ) {
          if (o.status === 'delivered' || o.payment_status === 'paid') {
            codSettledCount++;
          } else {
            codInTransitCount++;
          }
          return true;
        }
        if (
          o.is_partial_cod &&
          (o.payment_status === 'paid' || o.payment_status === 'partial_paid')
        ) {
          partialCodCount++;
          return true;
        }
        if (o.payment_status === 'paid') {
          onlinePrepaidCount++;
          return true;
        }
        return false;
      });

      metricValue = {
        metric,
        value: paidOrders.length,
        status: 'available',
        unit: 'orders',
        sampleSize: orders.length,
        metadata: {
          onlinePrepaidCount,
          partialCodCount,
          codCommittedCount: codSettledCount + codInTransitCount,
          codSettledCount,
          codInTransitCount,
          testOrdersExcludedCount: rawOrders.length - orders.length,
        },
        calculatedAt,
        timeWindow,
      };
      break;
    }

    case 'average_order_value': {
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'total, status, order_number, user_id, is_test',
        timeWindow
      );

      if (error || !rawOrders) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          currency: 'INR',
          unit: '₹',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));
      const confirmedOrders = orders.filter(
        (o) => o.status !== 'pending' && o.status !== 'cancelled'
      );

      if (confirmedOrders.length === 0) {
        metricValue = {
          metric,
          value: null,
          status: 'insufficient_data',
          currency: 'INR',
          unit: '₹',
          sampleSize: 0,
          calculatedAt,
          timeWindow,
        };
      } else {
        const sum = confirmedOrders.reduce(
          (acc, o) => acc + (Number(o.total) || 0),
          0
        );
        const aov = Number((sum / confirmedOrders.length).toFixed(2));
        metricValue = {
          metric,
          value: aov,
          status: 'available',
          currency: 'INR',
          unit: '₹',
          sampleSize: confirmedOrders.length,
          metadata: {
            testOrdersExcludedCount: rawOrders.length - orders.length,
          },
          calculatedAt,
          timeWindow,
        };
      }
      break;
    }

    case 'cancellation_rate': {
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'id, status, order_number, user_id, is_test',
        timeWindow
      );

      if (error || !rawOrders || rawOrders.length === 0) {
        metricValue = {
          metric,
          value: null,
          status: error ? 'unavailable' : 'insufficient_data',
          unit: '%',
          sampleSize: rawOrders?.length || 0,
          calculatedAt,
          timeWindow,
        };
      } else {
        const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));
        if (orders.length === 0) {
          metricValue = {
            metric,
            value: null,
            status: 'insufficient_data',
            unit: '%',
            sampleSize: 0,
            calculatedAt,
            timeWindow,
          };
          break;
        }
        const cancelled = orders.filter((o) => o.status === 'cancelled').length;
        const rate = Number(((cancelled / orders.length) * 100).toFixed(2));
        metricValue = {
          metric,
          value: rate,
          status: 'available',
          unit: '%',
          sampleSize: orders.length,
          metadata: {
            cancelledCount: cancelled,
            totalCount: orders.length,
            testOrdersExcludedCount: rawOrders.length - orders.length,
          },
          calculatedAt,
          timeWindow,
        };
      }
      break;
    }

    case 'rto_rate': {
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'id, status, order_number, user_id, is_test',
        timeWindow
      );

      if (error || !rawOrders) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          unit: '%',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));
      const shippedOrders = orders.filter(
        (o) =>
          o.status === 'shipped' ||
          o.status === 'out_for_delivery' ||
          o.status === 'delivered' ||
          o.status === 'returned' ||
          o.status === 'return_requested' ||
          o.status === 'return_approved' ||
          o.status === 'rto_initiated' ||
          o.status === 'rto_received'
      );

      if (shippedOrders.length === 0) {
        metricValue = {
          metric,
          value: null,
          status: 'insufficient_data',
          unit: '%',
          sampleSize: 0,
          calculatedAt,
          timeWindow,
        };
      } else {
        const rtoCount = shippedOrders.filter(
          (o) => o.status === 'rto_initiated' || o.status === 'rto_received'
        ).length;
        const rate = Number(
          ((rtoCount / shippedOrders.length) * 100).toFixed(2)
        );
        metricValue = {
          metric,
          value: rate,
          status: 'available',
          unit: '%',
          sampleSize: shippedOrders.length,
          metadata: {
            rtoCount,
            shippedCount: shippedOrders.length,
            testOrdersExcludedCount: rawOrders.length - orders.length,
          },
          calculatedAt,
          timeWindow,
        };
      }
      break;
    }

    case 'return_rate': {
      const { data: rawOrders, error } = await fetchOrdersPaginated(
        supabase,
        'id, status, order_number, user_id, is_test',
        timeWindow
      );

      if (error || !rawOrders) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          unit: '%',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      const orders = rawOrders.filter((o) => !isSyntheticOrTestOrder(o));
      const deliveredOrders = orders.filter((o) => o.status === 'delivered');

      if (deliveredOrders.length === 0) {
        metricValue = {
          metric,
          value: null,
          status: 'insufficient_data',
          unit: '%',
          sampleSize: 0,
          calculatedAt,
          timeWindow,
        };
      } else {
        const returnedCount = orders.filter(
          (o) =>
            o.status === 'returned' ||
            o.status === 'return_requested' ||
            o.status === 'return_approved'
        ).length;
        const rate = Number(
          ((returnedCount / deliveredOrders.length) * 100).toFixed(2)
        );
        metricValue = {
          metric,
          value: rate,
          status: 'available',
          unit: '%',
          sampleSize: deliveredOrders.length,
          metadata: {
            returnedCount,
            deliveredCount: deliveredOrders.length,
            testOrdersExcludedCount: rawOrders.length - orders.length,
          },
          calculatedAt,
          timeWindow,
        };
      }
      break;
    }

    case 'stock_out_rate': {
      // Evaluates current active catalog status
      const { data: products, error } = await supabase
        .from('products')
        .select('id, status, stock_quantity');

      if (error || !products) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          unit: '%',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      const activeProducts = products.filter(
        (p) => p.status === 'active' || p.status === 'published'
      );

      if (activeProducts.length === 0) {
        metricValue = {
          metric,
          value: null,
          status: 'insufficient_data',
          unit: '%',
          sampleSize: 0,
          calculatedAt,
          timeWindow,
        };
      } else {
        const outOfStock = activeProducts.filter(
          (p) => (Number(p.stock_quantity) || 0) <= 0
        ).length;
        const rate = Number(
          ((outOfStock / activeProducts.length) * 100).toFixed(2)
        );
        metricValue = {
          metric,
          value: rate,
          status: 'available',
          unit: '%',
          sampleSize: activeProducts.length,
          metadata: {
            outOfStockCount: outOfStock,
            totalActiveCount: activeProducts.length,
          },
          calculatedAt,
          timeWindow,
        };
      }
      break;
    }

    case 'payment_failure_rate': {
      const { data: orderEvents, error } = await supabase
        .from('order_events')
        .select('id, event_type')
        .in('event_type', [
          'PAYMENT_ATTEMPTED',
          'PAYMENT_CONFIRMED',
          'PAYMENT_FAILED',
        ])
        .gte('created_at', timeWindow.start)
        .lte('created_at', timeWindow.end);

      if (error || !orderEvents) {
        metricValue = {
          metric,
          value: null,
          status: 'unavailable',
          unit: '%',
          calculatedAt,
          timeWindow,
        };
        break;
      }

      if (orderEvents.length === 0) {
        metricValue = {
          metric,
          value: null,
          status: 'insufficient_data',
          unit: '%',
          sampleSize: 0,
          calculatedAt,
          timeWindow,
        };
      } else {
        const failedAttempts = orderEvents.filter(
          (e) => e.event_type === 'PAYMENT_FAILED'
        ).length;
        const rate = Number(
          ((failedAttempts / orderEvents.length) * 100).toFixed(2)
        );
        metricValue = {
          metric,
          value: rate,
          status: 'available',
          unit: '%',
          sampleSize: orderEvents.length,
          metadata: { failedAttempts, totalAttempts: orderEvents.length },
          calculatedAt,
          timeWindow,
        };
      }
      break;
    }

    default:
      metricValue = {
        metric,
        value: null,
        status: 'unavailable',
        calculatedAt,
        timeWindow,
      };
  }

  // Store in cache
  metricsCache.set(cacheKey, {
    metricValue,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return metricValue;
}

/**
 * Batched retrieval of multiple metrics for efficient dashboard and radar population.
 */
export async function getBatchMetrics(
  metrics: CanonicalMetric[],
  options: GetMetricOptions
): Promise<Record<CanonicalMetric, MetricValue>> {
  const results: Partial<Record<CanonicalMetric, MetricValue>> = {};

  for (const metric of metrics) {
    try {
      results[metric] = await getCanonicalMetric(metric, options);
    } catch (err: any) {
      if (err instanceof MetricsAuthorizationError) {
        throw err;
      }
      results[metric] = {
        metric,
        value: null,
        status: 'unavailable',
        calculatedAt: new Date().toISOString(),
        timeWindow: getIstTimeWindow(
          options.preset,
          options.customStart,
          options.customEnd
        ),
        metadata: { error: err?.message || String(err) },
      };
    }
  }

  return results as Record<CanonicalMetric, MetricValue>;
}

/**
 * Clears the in-memory metrics cache (useful for testing or cache invalidation).
 */
export function clearMetricsCache(): void {
  metricsCache.clear();
}
