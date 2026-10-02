import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';

export type AnalyticsTimeframe =
  'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export interface TimeRange {
  from: string; // ISO string
  to: string; // ISO string
  label: string;
}

export interface MetricComparison {
  current: number;
  baseline: number;
  absoluteChange: number;
  percentageChange: number | null; // null if baseline is 0
  trend: 'increasing' | 'decreasing' | 'stable';
  isAnomaly: boolean;
  anomalyConfidence: 'confirmed' | 'possible' | 'normal' | 'insufficient_data';
}

export interface StoreKpis {
  totalRevenue: number;
  netRevenue: number;
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  cancellationRate: number; // percentage
  aov: number;
  topSellingProducts: {
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }[];
  lowStockItemsCount: number;
  openSupportTicketsCount: number;
  urgentTicketsCount: number;
}

export interface AnalyticsReport {
  timeframe: AnalyticsTimeframe;
  period: TimeRange;
  baselinePeriod?: TimeRange;
  kpis: StoreKpis;
  comparisons?: {
    revenue: MetricComparison;
    orders: MetricComparison;
    aov: MetricComparison;
  };
  insights: {
    executiveVoiceSummary: string; // 1-3 crisp sentences for LiveKit voice
    structuredTextSummary: string[]; // Bulleted breakdown for text/admin dashboard
    anomalies: string[];
    crossDatasetObservations: string[];
  };
  evidence: {
    sourceTables: string[];
    sampleSizeOrders: number;
    sampleSizeItems: number;
    dataFreshnessTimestamp: string;
    isCached: boolean;
  };
}

/**
 * Resolve timeframe strings into ISO timestamps (IST / UTC aware).
 */
export function resolveTimeRange(
  timeframe: AnalyticsTimeframe,
  customFrom?: string,
  customTo?: string
): { current: TimeRange; baseline: TimeRange } {
  const now = new Date();

  // Helper for rolling days
  const getRollingDays = (
    days: number
  ): { current: TimeRange; baseline: TimeRange } => {
    const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const baselineFrom = new Date(
      currentFrom.getTime() - days * 24 * 60 * 60 * 1000
    );

    return {
      current: {
        from: currentFrom.toISOString(),
        to: now.toISOString(),
        label: `Last ${days} days`,
      },
      baseline: {
        from: baselineFrom.toISOString(),
        to: currentFrom.toISOString(),
        label: `Previous ${days} days`,
      },
    };
  };

  switch (timeframe) {
    case 'today': {
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const yesterdayStart = new Date(
        todayStart.getTime() - 24 * 60 * 60 * 1000
      );
      return {
        current: {
          from: todayStart.toISOString(),
          to: now.toISOString(),
          label: 'Today',
        },
        baseline: {
          from: yesterdayStart.toISOString(),
          to: todayStart.toISOString(),
          label: 'Yesterday',
        },
      };
    }
    case 'yesterday': {
      const yesterdayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const yesterdayStart = new Date(
        yesterdayEnd.getTime() - 24 * 60 * 60 * 1000
      );
      const dayBeforeYesterday = new Date(
        yesterdayStart.getTime() - 24 * 60 * 60 * 1000
      );
      return {
        current: {
          from: yesterdayStart.toISOString(),
          to: yesterdayEnd.toISOString(),
          label: 'Yesterday',
        },
        baseline: {
          from: dayBeforeYesterday.toISOString(),
          to: yesterdayStart.toISOString(),
          label: 'Day before yesterday',
        },
      };
    }
    case '7d':
      return getRollingDays(7);
    case '30d':
      return getRollingDays(30);
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      return {
        current: {
          from: startOfMonth.toISOString(),
          to: now.toISOString(),
          label: 'This Month',
        },
        baseline: {
          from: startOfLastMonth.toISOString(),
          to: endOfLastMonth.toISOString(),
          label: 'Last Month',
        },
      };
    }
    case 'last_month': {
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      const startOfTwoMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        1
      );
      const endOfTwoMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        0,
        23,
        59,
        59,
        999
      );
      return {
        current: {
          from: startOfLastMonth.toISOString(),
          to: endOfLastMonth.toISOString(),
          label: 'Last Month',
        },
        baseline: {
          from: startOfTwoMonthsAgo.toISOString(),
          to: endOfTwoMonthsAgo.toISOString(),
          label: 'Two Months Ago',
        },
      };
    }
    case 'custom': {
      const from =
        customFrom ||
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const to = customTo || now.toISOString();
      return {
        current: { from, to, label: 'Custom Range' },
        baseline: {
          from: new Date(
            new Date(from).getTime() -
              (new Date(to).getTime() - new Date(from).getTime())
          ).toISOString(),
          to: from,
          label: 'Prior equivalent period',
        },
      };
    }
  }
}

/**
 * Compare two metric numbers and detect trends and anomalies.
 */
export function calculateComparison(
  current: number,
  baseline: number,
  sampleSize: number
): MetricComparison {
  const absoluteChange = Math.round((current - baseline) * 100) / 100;
  let percentageChange: number | null = null;
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

  if (baseline > 0) {
    percentageChange =
      Math.round(((current - baseline) / baseline) * 1000) / 10;
    if (percentageChange > 2) trend = 'increasing';
    else if (percentageChange < -2) trend = 'decreasing';
    else trend = 'stable';
  } else if (current > 0) {
    percentageChange = 100;
    trend = 'increasing';
  }

  // Anomaly evaluation
  let isAnomaly = false;
  let anomalyConfidence:
    'confirmed' | 'possible' | 'normal' | 'insufficient_data' = 'normal';

  if (sampleSize < 10) {
    anomalyConfidence = 'insufficient_data';
  } else if (percentageChange !== null && Math.abs(percentageChange) >= 40) {
    isAnomaly = true;
    anomalyConfidence = sampleSize >= 30 ? 'confirmed' : 'possible';
  } else if (percentageChange !== null && Math.abs(percentageChange) >= 25) {
    anomalyConfidence = 'possible';
  }

  return {
    current,
    baseline,
    absoluteChange,
    percentageChange,
    trend,
    isAnomaly,
    anomalyConfidence,
  };
}

/**
 * Fetch and compute comprehensive Store Analytics using real Supabase tables.
 */
export async function getStoreAnalytics(params: {
  timeframe?: AnalyticsTimeframe;
  customFrom?: string;
  customTo?: string;
}): Promise<AnalyticsReport> {
  const timeframe = params.timeframe || '30d';
  const { current, baseline } = resolveTimeRange(
    timeframe,
    params.customFrom,
    params.customTo
  );

  const supabase = getServiceClient();

  // 1. Parallel fetch current and baseline period orders, products, and support tickets
  const [currentOrdersRes, baselineOrdersRes, lowStockRes, openTicketsRes] =
    await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, order_number, total, status, payment_status, payment_method, created_at'
        )
        .gte('created_at', current.from)
        .lte('created_at', current.to)
        .order('created_at', { ascending: false }),

      supabase
        .from('orders')
        .select('id, total, status, payment_status, created_at')
        .gte('created_at', baseline.from)
        .lte('created_at', baseline.to),

      supabase
        .from('products')
        .select('id, name, sku, stock_quantity')
        .lte('stock_quantity', 5)
        .eq('status', 'active'),

      supabase
        .from('support_tickets')
        .select('id, status, priority, created_at')
        .in('status', ['open', 'in_progress']),
    ]);

  const currentOrders = currentOrdersRes.data || [];
  const baselineOrders = baselineOrdersRes.data || [];
  const lowStockItems = lowStockRes.data || [];
  const openTickets = openTicketsRes.data || [];

  // 2. Fetch order items for top products analysis in current period if orders exist
  let topSellingProducts: StoreKpis['topSellingProducts'] = [];
  const orderIds = currentOrders.slice(0, 100).map((o) => o.id);

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select(
        'product_id, sku, quantity, price_at_purchase, product:products(name)'
      )
      .in('order_id', orderIds);

    if (items && items.length > 0) {
      const productMap: Record<
        string,
        {
          productId: string;
          name: string;
          sku: string;
          unitsSold: number;
          revenue: number;
        }
      > = {};

      for (const item of items) {
        const prodId = item.product_id || item.sku || 'unknown';
        const pObj = Array.isArray(item.product)
          ? item.product[0]
          : item.product;
        const name = pObj?.name || item.sku || 'Jewellery Item';

        if (!productMap[prodId]) {
          productMap[prodId] = {
            productId: prodId,
            name,
            sku: item.sku || '',
            unitsSold: 0,
            revenue: 0,
          };
        }
        productMap[prodId].unitsSold += item.quantity || 0;
        productMap[prodId].revenue +=
          (item.quantity || 0) * Number(item.price_at_purchase || 0);
      }

      topSellingProducts = Object.values(productMap)
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, 5);
    }
  }

  // 3. Compute Current Period Metrics
  const totalOrders = currentOrders.length;
  const nonCancelledOrders = currentOrders.filter(
    (o) => o.status !== 'cancelled'
  );
  const cancelledOrders = currentOrders.filter(
    (o) => o.status === 'cancelled'
  ).length;
  const paidOrders = currentOrders.filter(
    (o) => o.payment_status === 'paid'
  ).length;

  const totalRevenue = currentOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const netRevenue = nonCancelledOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const cancellationRate =
    totalOrders > 0
      ? Math.round((cancelledOrders / totalOrders) * 1000) / 10
      : 0;
  const aov =
    nonCancelledOrders.length > 0
      ? Math.round(netRevenue / nonCancelledOrders.length)
      : 0;

  // 4. Compute Baseline Period Metrics
  const baselineTotalOrders = baselineOrders.length;
  const baselineNonCancelled = baselineOrders.filter(
    (o) => o.status !== 'cancelled'
  );
  const baselineNetRevenue = baselineNonCancelled.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const baselineAov =
    baselineNonCancelled.length > 0
      ? Math.round(baselineNetRevenue / baselineNonCancelled.length)
      : 0;

  // 5. Comparisons
  const revenueComp = calculateComparison(
    netRevenue,
    baselineNetRevenue,
    totalOrders
  );
  const ordersComp = calculateComparison(
    totalOrders,
    baselineTotalOrders,
    totalOrders
  );
  const aovComp = calculateComparison(aov, baselineAov, totalOrders);

  // 6. Anomalies & Cross-Dataset Observations
  const anomalies: string[] = [];
  if (revenueComp.isAnomaly) {
    anomalies.push(
      `Revenue changed ${revenueComp.percentageChange}% from ₹${baselineNetRevenue.toLocaleString(
        'en-IN'
      )} to ₹${netRevenue.toLocaleString('en-IN')}. (${revenueComp.anomalyConfidence} anomaly)`
    );
  }
  if (cancellationRate >= 20 && totalOrders >= 5) {
    anomalies.push(
      `Unusually high cancellation rate of ${cancellationRate}% detected across ${totalOrders} orders.`
    );
  }

  const urgentTickets = openTickets.filter(
    (t) => t.priority === 'urgent' || t.priority === 'high'
  );
  const crossDatasetObservations: string[] = [];
  if (urgentTickets.length > 0) {
    crossDatasetObservations.push(
      `There are ${urgentTickets.length} urgent/high priority support tickets pending while processing ${totalOrders} orders.`
    );
  }
  if (lowStockItems.length > 0 && topSellingProducts.length > 0) {
    const lowStockTopSeller = topSellingProducts.find((tp) =>
      lowStockItems.some((ls) => ls.id === tp.productId || ls.sku === tp.sku)
    );
    if (lowStockTopSeller) {
      crossDatasetObservations.push(
        `Top seller '${lowStockTopSeller.name}' is currently flagged with low stock (<= 5 units remaining).`
      );
    }
  }

  // 7. Executive Voice Summary (Voice brevity: 1-3 spoken sentences)
  let voiceSummary = `In the ${current.label.toLowerCase()}, net revenue is ₹${netRevenue.toLocaleString(
    'en-IN'
  )} across ${totalOrders} orders with an average order value of ₹${aov.toLocaleString('en-IN')}.`;

  if (
    revenueComp.percentageChange !== null &&
    Math.abs(revenueComp.percentageChange) >= 5
  ) {
    const dir = revenueComp.percentageChange > 0 ? 'up' : 'down';
    voiceSummary += ` That is ${dir} ${Math.abs(revenueComp.percentageChange)}% compared to the ${baseline.label.toLowerCase()}.`;
  }
  if (lowStockItems.length > 0) {
    voiceSummary += ` Note that ${lowStockItems.length} products have low inventory.`;
  }

  // 8. Structured Text Summary
  const structuredTextSummary = [
    `**Net Revenue**: ₹${netRevenue.toLocaleString('en-IN')} (${
      revenueComp.percentageChange !== null
        ? `${revenueComp.percentageChange}% vs baseline`
        : 'N/A'
    })`,
    `**Total Orders**: ${totalOrders} (${paidOrders} paid, ${cancelledOrders} cancelled)`,
    `**Average Order Value (AOV)**: ₹${aov.toLocaleString('en-IN')}`,
    `**Cancellation Rate**: ${cancellationRate}%`,
    `**Catalog Health**: ${lowStockItems.length} products under safety stock threshold`,
    `**Support Queue**: ${openTickets.length} active tickets (${urgentTickets.length} urgent)`,
  ];

  return {
    timeframe,
    period: current,
    baselinePeriod: baseline,
    kpis: {
      totalRevenue,
      netRevenue,
      totalOrders,
      paidOrders,
      cancelledOrders,
      cancellationRate,
      aov,
      topSellingProducts,
      lowStockItemsCount: lowStockItems.length,
      openSupportTicketsCount: openTickets.length,
      urgentTicketsCount: urgentTickets.length,
    },
    comparisons: {
      revenue: revenueComp,
      orders: ordersComp,
      aov: aovComp,
    },
    insights: {
      executiveVoiceSummary: voiceSummary,
      structuredTextSummary,
      anomalies,
      crossDatasetObservations,
    },
    evidence: {
      sourceTables: ['orders', 'order_items', 'products', 'support_tickets'],
      sampleSizeOrders: totalOrders,
      sampleSizeItems: topSellingProducts.length,
      dataFreshnessTimestamp: new Date().toISOString(),
      isCached: false,
    },
  };
}
