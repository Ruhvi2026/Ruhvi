import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { getStoreAnalytics } from './analytics';

export type BiCategory =
  'PROBLEM' | 'TREND_ANOMALY' | 'RISK' | 'GROWTH_OPPORTUNITY';
export type BiSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BiFinding {
  id: string;
  category: BiCategory;
  severity: BiSeverity;
  title: string;
  summary: string;
  detail: string;
  dataPoints: Record<string, any>;
  recommendedInvestigation?: string;
  potentialImpact: string;
}

export interface BusinessIntelligenceDigest {
  timestamp: string;
  timeframe: string;
  problems: BiFinding[];
  trendsAndAnomalies: BiFinding[];
  risks: BiFinding[];
  growthOpportunities: BiFinding[];
  totalFindingsCount: number;
  executiveVoiceSummary: string;
}

/**
 * Executes a multi-dimensional Business Intelligence scan across
 * Problems, Trends/Anomalies, Operational Risks, and Revenue Growth Opportunities.
 */
export async function runBusinessIntelligenceScan(
  timeframe: '7d' | '30d' = '7d'
): Promise<BusinessIntelligenceDigest> {
  const analytics = await getStoreAnalytics({ timeframe });
  const kpis = analytics.kpis;
  const comparisons = analytics.comparisons;
  const supabase = getServiceClient();

  const problems: BiFinding[] = [];
  const trendsAndAnomalies: BiFinding[] = [];
  const risks: BiFinding[] = [];
  const growthOpportunities: BiFinding[] = [];

  // ── 1. PROBLEMS DETECTION ────────────────────────────────────────────────
  // High cancellation rate
  if (kpis.cancellationRate >= 15 && kpis.totalOrders >= 5) {
    problems.push({
      id: `prob_cancel_${Date.now()}`,
      category: 'PROBLEM',
      severity: kpis.cancellationRate >= 25 ? 'critical' : 'high',
      title: 'Elevated Order Cancellation Rate',
      summary: `Order cancellation rate is currently at ${kpis.cancellationRate}%, exceeding the 10% healthy benchmark.`,
      detail: `Out of ${kpis.totalOrders} orders in the last ${timeframe}, ${kpis.cancelledOrders} were cancelled. This damages customer retention and inventory turnover.`,
      dataPoints: {
        totalOrders: kpis.totalOrders,
        cancelledOrders: kpis.cancelledOrders,
        cancellationRate: kpis.cancellationRate,
      },
      recommendedInvestigation:
        'Check payment failures, COD verification delays, and out-of-stock cancellations in order timeline.',
      potentialImpact: `Recovering half of cancelled orders could salvage approximately ₹${Math.round(kpis.cancelledOrders * kpis.aov * 0.5).toLocaleString('en-IN')} in revenue.`,
    });
  }

  // Support ticket bottleneck
  if (kpis.urgentTicketsCount > 0 || kpis.openSupportTicketsCount >= 10) {
    problems.push({
      id: `prob_support_${Date.now()}`,
      category: 'PROBLEM',
      severity: kpis.urgentTicketsCount > 0 ? 'high' : 'medium',
      title: 'Customer Support Queue Backlog',
      summary: `${kpis.openSupportTicketsCount} customer support tickets remain unresolved, including ${kpis.urgentTicketsCount} marked as urgent.`,
      detail: `Unresolved customer tickets directly suppress repurchase rate and increase negative social proof.`,
      dataPoints: {
        openTickets: kpis.openSupportTicketsCount,
        urgentTickets: kpis.urgentTicketsCount,
      },
      recommendedInvestigation:
        'Review open tickets with priority="urgent" and check for courier dispatch or defective product complaints.',
      potentialImpact: 'Prevent negative reviews and order disputes.',
    });
  }

  // ── 2. TRENDS & ANOMALIES DETECTION ──────────────────────────────────────
  if (comparisons?.revenue) {
    const rev = comparisons.revenue;
    if (rev.isAnomaly && rev.percentageChange !== null) {
      const isDrop = rev.percentageChange < 0;
      trendsAndAnomalies.push({
        id: `trend_rev_${Date.now()}`,
        category: 'TREND_ANOMALY',
        severity: isDrop
          ? Math.abs(rev.percentageChange) > 35
            ? 'critical'
            : 'high'
          : 'medium',
        title: isDrop
          ? 'Significant Revenue Downtrend'
          : 'Revenue Growth Surge',
        summary: `Revenue has ${isDrop ? 'dropped' : 'surged'} by ${Math.abs(rev.percentageChange)}% compared to the prior ${timeframe} period.`,
        detail: `Current revenue stands at ₹${rev.current.toLocaleString('en-IN')} vs baseline ₹${rev.baseline.toLocaleString('en-IN')} (absolute delta: ₹${rev.absoluteChange.toLocaleString('en-IN')}).`,
        dataPoints: {
          current: rev.current,
          baseline: rev.baseline,
          percentageChange: rev.percentageChange,
          anomalyConfidence: rev.anomalyConfidence,
        },
        recommendedInvestigation:
          'Investigate traffic sources, conversion rates, and checkout abandonment logs.',
        potentialImpact: `${isDrop ? 'Risk of missing monthly run-rate' : 'Momentum to double down on high-performing marketing channels'}.`,
      });
    }
  }

  if (comparisons?.aov) {
    const aovComp = comparisons.aov;
    if (
      aovComp.percentageChange !== null &&
      Math.abs(aovComp.percentageChange) >= 20
    ) {
      trendsAndAnomalies.push({
        id: `trend_aov_${Date.now()}`,
        category: 'TREND_ANOMALY',
        severity: aovComp.percentageChange < 0 ? 'medium' : 'low',
        title:
          aovComp.percentageChange < 0
            ? 'Average Order Value Contraction'
            : 'Average Order Value Expansion',
        summary: `AOV changed by ${aovComp.percentageChange}% from ₹${aovComp.baseline.toLocaleString('en-IN')} to ₹${aovComp.current.toLocaleString('en-IN')}.`,
        detail: `Higher AOV improves contribution margins, whereas declining AOV points to discount usage or lower-priced basket mixes.`,
        dataPoints: {
          currentAov: aovComp.current,
          baselineAov: aovComp.baseline,
          percentageChange: aovComp.percentageChange,
        },
        potentialImpact:
          'Directly dictates unit economics and ad spend profitability.',
      });
    }
  }

  // ── 3. OPERATIONAL RISKS DETECTION ───────────────────────────────────────
  // Stockout projection & inventory depletion risk
  const { data: activeProducts } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, price')
    .eq('status', 'active')
    .lte('stock_quantity', 4)
    .gt('stock_quantity', 0)
    .limit(10);

  if (activeProducts && activeProducts.length > 0) {
    risks.push({
      id: `risk_stockout_${Date.now()}`,
      category: 'RISK',
      severity: activeProducts.some((p) => p.stock_quantity <= 2)
        ? 'high'
        : 'medium',
      title: 'Imminent Stockout on Core Catalog Items',
      summary: `${activeProducts.length} high-demand jewelry products have fewer than 5 units remaining in inventory.`,
      detail: `Products nearing depletion: ${activeProducts.map((p) => `${p.name} (${p.stock_quantity} left)`).join(', ')}.`,
      dataPoints: {
        productsAtRisk: activeProducts.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock_quantity,
        })),
      },
      recommendedInvestigation:
        'Audit production schedules, supplier lead times, and replenish batch orders.',
      potentialImpact:
        'Stockouts on top performers cause direct sales loss and degrade search rankings.',
    });
  }

  // Overdue internal tasks risk
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, task_id_text, title, due_date, priority:task_priorities(name)')
    .lt('due_date', todayStr)
    .is('deleted_at', null)
    .limit(5);

  if (overdueTasks && overdueTasks.length > 0) {
    risks.push({
      id: `risk_tasks_${Date.now()}`,
      category: 'RISK',
      severity: 'medium',
      title: 'Overdue Departmental Tasks Detected',
      summary: `${overdueTasks.length} internal tasks have passed their completion deadline without being marked completed.`,
      detail: `Overdue items include: ${overdueTasks.map((t: any) => `${t.task_id_text} (${t.title})`).join(', ')}.`,
      dataPoints: { overdueCount: overdueTasks.length },
      recommendedInvestigation:
        'Check bottlenecks with assigned department managers.',
      potentialImpact:
        'Execution lag ripples into order fulfillment delays and marketing delays.',
    });
  }

  // ── 4. GROWTH OPPORTUNITIES DETECTION ────────────────────────────────────
  if (kpis.topSellingProducts.length > 0) {
    const topProd = kpis.topSellingProducts[0];
    growthOpportunities.push({
      id: `opp_scale_top_${Date.now()}`,
      category: 'GROWTH_OPPORTUNITY',
      severity: 'medium',
      title: `Scale Momentum on Top Seller: ${topProd.name}`,
      summary: `${topProd.name} generated ₹${topProd.revenue.toLocaleString('en-IN')} (${topProd.unitsSold} units) and is our highest-velocity product.`,
      detail: `Promoting this product as a hero piece via targeted social campaigns or creating complementary matching sets (e.g., matching earrings/bracelet) will drive upsell revenue.`,
      dataPoints: {
        productId: topProd.productId,
        name: topProd.name,
        unitsSold: topProd.unitsSold,
        revenue: topProd.revenue,
      },
      potentialImpact: `Estimated +15-20% revenue expansion on complementary bundle checkout.`,
    });
  }

  const totalFindingsCount =
    problems.length +
    trendsAndAnomalies.length +
    risks.length +
    growthOpportunities.length;

  const executiveVoiceSummary =
    totalFindingsCount === 0
      ? 'Business intelligence scan shows all metrics, stock levels, and queues are healthy.'
      : `Intelligence scan detected ${problems.length} problems, ${trendsAndAnomalies.length} metric anomalies, ${risks.length} operational risks, and ${growthOpportunities.length} growth opportunities. Key highlight: ${
          problems[0]?.title ||
          risks[0]?.title ||
          trendsAndAnomalies[0]?.title ||
          growthOpportunities[0]?.title
        }.`;

  return {
    timestamp: new Date().toISOString(),
    timeframe,
    problems,
    trendsAndAnomalies,
    risks,
    growthOpportunities,
    totalFindingsCount,
    executiveVoiceSummary,
  };
}
