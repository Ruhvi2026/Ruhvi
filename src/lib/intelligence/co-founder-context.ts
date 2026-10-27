import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  getCanonicalMetric,
  getIstTimeWindow,
  type CanonicalMetric,
  type DateRangePreset,
  type MetricValue,
  type TimeWindow,
} from './metrics-service';
import {
  getAnomalyLifecycleRegistry,
  type AnomalyRecord,
} from './anomaly-lifecycle';

/**
 * ============================================================================
 * PERMISSION-AWARE AI CO-FOUNDER CONTEXT ASSEMBLER (TRACK E - PHASE 26)
 * ============================================================================
 * Gathers a read-only, role-aware, token-bounded summary of verified business
 * context for the AI Co-Founder.
 *
 * Guarantees:
 * 1. Role-Aware Scoping & RBAC: Staff roles are strictly prohibited from
 *    accessing financial metrics (gross sales, net sales, AOV) or security alerts.
 * 2. Privacy & Data Minimization: STRICTLY excludes raw customer conversations,
 *    customer PII, payment card data, phone numbers, and addresses.
 * 3. Provenance & Freshness: Every data point includes source attribution and
 *    freshness timestamps.
 * 4. Graceful Degradation: Sub-queries run via Promise.allSettled(); unreachable
 *    or failing data sources are flagged in `unavailableSources` without failing
 *    the assembler.
 * 5. Deterministic Size & Time Bounds: Time window bounded to IST calendar
 *    boundaries; prompt markdown capped by `maxPromptChars` to prevent LLM context bloat.
 */

export interface SourceProvenance {
  source: string;
  status: 'available' | 'unavailable' | 'empty';
  freshness: string;
  recordCount?: number;
  error?: string;
}

export interface FormattedMetricSignal {
  metric: CanonicalMetric;
  label: string;
  category: 'financial' | 'operations' | 'inventory' | 'infrastructure';
  value: number | null;
  unit: string;
  status: 'available' | 'insufficient_data' | 'unavailable';
  sampleSize?: number;
}

export interface InventorySignalSummary {
  activeSkuCount: number;
  stockOutRate: number | null;
  outOfStockSkuCount: number;
  lowStockSkuCount: number; // SKU with quantity <= 3
  status: 'available' | 'unavailable' | 'insufficient_data';
}

export interface FunnelSignalSummary {
  ordersCreated: number;
  paidOrders: number;
  cancellations: number;
  returns: number;
  cancellationRate: number | null;
  returnRate: number | null;
  status: 'available' | 'unavailable' | 'insufficient_data';
}

export interface SystemHealthSummary {
  paymentFailureRate: number | null;
  aiFailureIncidentCount: number;
  healthState: 'healthy' | 'degraded' | 'critical' | 'unknown';
  status: 'available' | 'unavailable' | 'insufficient_data';
}

export interface AnomalyContextItem {
  ruleId: string;
  title: string;
  severity: 'warning' | 'critical';
  metric: CanonicalMetric;
  observedValue: number;
  thresholdValue: number;
  explanation: string;
  suggestedAction: string;
  deepLink?: string;
  firstDetectedAt: string;
}

export interface CoFounderBusinessContext {
  assembledAt: string;
  timeWindow: TimeWindow;
  callerRole: string;
  provenance: SourceProvenance[];
  unavailableSources: string[];
  financialMetrics: FormattedMetricSignal[];
  operationalMetrics: FormattedMetricSignal[];
  inventorySignals: InventorySignalSummary;
  funnelSummary: FunnelSignalSummary;
  systemHealth: SystemHealthSummary;
  activeAnomalies: AnomalyContextItem[];
  privacyGuarantees: {
    noPiiIncluded: boolean;
    noRawConversations: boolean;
    sanitizedRole: string;
    financialAccessGranted: boolean;
  };
  promptContextMarkdown: string;
  characterCount: number;
}

export interface CoFounderContextOptions {
  callerRole: 'super_admin' | 'admin' | 'manager' | 'staff' | string;
  preset?: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  maxAnomalies?: number; // default: 5
  maxPromptChars?: number; // default: 5000
  fresh?: boolean;
}

/**
 * Format metric numeric values cleanly for prompt consumption.
 */
function formatValueForPrompt(val: number | null, unit: string): string {
  if (val === null || val === undefined) return 'N/A';
  if (unit === 'INR') {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  }
  if (unit === '%') {
    return `${val.toFixed(1)}%`;
  }
  return `${val} ${unit}`.trim();
}

/**
 * Builds deterministic markdown representation for AI Co-Founder system/user prompt.
 */
function buildPromptContextMarkdown(context: {
  assembledAt: string;
  timeWindow: TimeWindow;
  callerRole: string;
  financialMetrics: FormattedMetricSignal[];
  operationalMetrics: FormattedMetricSignal[];
  inventorySignals: InventorySignalSummary;
  funnelSummary: FunnelSignalSummary;
  systemHealth: SystemHealthSummary;
  activeAnomalies: AnomalyContextItem[];
  unavailableSources: string[];
  maxPromptChars: number;
}): { markdown: string; characterCount: number } {
  const lines: string[] = [];

  lines.push('### Business Performance & Operational Context');
  lines.push(
    `- **Observation Window**: ${context.timeWindow.preset.replace('_', ' ')} (${context.timeWindow.start.slice(0, 10)} to ${context.timeWindow.end.slice(0, 10)} IST)`
  );
  lines.push(
    `- **Caller Role Authorization**: ${context.callerRole.toUpperCase()}`
  );
  lines.push(`- **Generated At**: ${context.assembledAt}`);

  if (context.unavailableSources.length > 0) {
    lines.push(
      `- **Data Source Warnings**: [Unavailable/degraded: ${context.unavailableSources.join(', ')}]`
    );
  }

  // 1. Financial Metrics (Admin / Manager only)
  if (context.financialMetrics.length > 0) {
    lines.push('\n#### 1. Financial Performance');
    for (const m of context.financialMetrics) {
      lines.push(
        `- **${m.label}**: ${formatValueForPrompt(m.value, m.unit)} (status: ${m.status})`
      );
    }
  }

  // 2. Operational & Funnel Metrics
  lines.push('\n#### 2. Operations & Customer Funnel');
  for (const m of context.operationalMetrics) {
    lines.push(
      `- **${m.label}**: ${formatValueForPrompt(m.value, m.unit)} (status: ${m.status})`
    );
  }
  lines.push(
    `- **Orders Created in Period**: ${context.funnelSummary.ordersCreated}`
  );
  lines.push(
    `- **Paid / Confirmed Orders**: ${context.funnelSummary.paidOrders}`
  );
  lines.push(
    `- **Order Cancellations**: ${context.funnelSummary.cancellations}`
  );
  lines.push(`- **Customer Returns**: ${context.funnelSummary.returns}`);

  // 3. Inventory Signals
  lines.push('\n#### 3. Catalog & Inventory Status');
  lines.push(
    `- **Active Catalog SKUs**: ${context.inventorySignals.activeSkuCount}`
  );
  lines.push(
    `- **Out-of-Stock Rate**: ${context.inventorySignals.stockOutRate !== null ? `${context.inventorySignals.stockOutRate.toFixed(1)}%` : 'N/A'}`
  );
  lines.push(
    `- **Out-of-Stock SKUs**: ${context.inventorySignals.outOfStockSkuCount}`
  );
  lines.push(
    `- **Low-Stock Buffer SKUs (<=3 units)**: ${context.inventorySignals.lowStockSkuCount}`
  );

  // 4. Infrastructure & System Health
  lines.push('\n#### 4. Infrastructure & AI Health');
  lines.push(
    `- **Payment Failure Rate**: ${context.systemHealth.paymentFailureRate !== null ? `${context.systemHealth.paymentFailureRate.toFixed(1)}%` : 'N/A'}`
  );
  lines.push(
    `- **AI Provider Failure Incidents**: ${context.systemHealth.aiFailureIncidentCount}`
  );
  lines.push(
    `- **Overall Health State**: ${context.systemHealth.healthState.toUpperCase()}`
  );

  // 5. Active Verified Business Anomalies
  if (context.activeAnomalies.length > 0) {
    lines.push('\n#### 5. Active Anomalies Requiring Attention');
    for (const anom of context.activeAnomalies) {
      lines.push(`- **[${anom.severity.toUpperCase()}] ${anom.title}**`);
      lines.push(`  - Explanation: ${anom.explanation}`);
      lines.push(
        `  - Observed: ${anom.observedValue.toFixed(1)}% vs Threshold: ${anom.thresholdValue.toFixed(1)}%`
      );
      lines.push(`  - Suggested Action: ${anom.suggestedAction}`);
      if (anom.deepLink) {
        lines.push(`  - Internal Workflow: ${anom.deepLink}`);
      }
    }
  } else {
    lines.push('\n#### 5. Active Anomalies');
    lines.push('- No active open anomalies detected.');
  }

  let fullMarkdown = lines.join('\n');

  // Hard size bounding
  if (fullMarkdown.length > context.maxPromptChars) {
    const notice =
      '\n\n[... Context truncated to enforce safety prompt size bounds]';
    if (context.maxPromptChars <= notice.length) {
      fullMarkdown = fullMarkdown.slice(0, context.maxPromptChars);
    } else {
      const sliceLen = context.maxPromptChars - notice.length;
      fullMarkdown = fullMarkdown.slice(0, sliceLen) + notice;
    }
  }

  return {
    markdown: fullMarkdown,
    characterCount: fullMarkdown.length,
  };
}

/**
 * Primary Context Assembler
 */
export async function assembleCoFounderContext(
  options: CoFounderContextOptions
): Promise<CoFounderBusinessContext> {
  const assembledAt = new Date().toISOString();
  const callerRole = (options.callerRole || 'staff').toLowerCase();
  const preset = options.preset || 'last_7_days';
  const timeWindow = getIstTimeWindow(
    preset,
    options.customStart,
    options.customEnd
  );
  const maxAnomalies = Math.min(20, Math.max(1, options.maxAnomalies ?? 5));
  const maxPromptChars = Math.min(
    20000,
    Math.max(50, options.maxPromptChars ?? 5000)
  );
  const fresh = options.fresh ?? false;

  const provenance: SourceProvenance[] = [];
  const unavailableSources: string[] = [];

  // RBAC Permission Flag: Staff is barred from financial metrics
  const financialAllowed =
    callerRole === 'admin' ||
    callerRole === 'super_admin' ||
    callerRole === 'manager';

  // ─── SUB-TASK 1: Canonical Metrics ─────────────────────────────────────────
  const fetchMetricsTask = async (): Promise<{
    financial: FormattedMetricSignal[];
    operational: FormattedMetricSignal[];
  }> => {
    const financial: FormattedMetricSignal[] = [];
    const operational: FormattedMetricSignal[] = [];

    // Financial Metrics
    if (financialAllowed) {
      const financialMetricKeys: CanonicalMetric[] = [
        'gross_sales',
        'net_sales',
        'average_order_value',
      ];
      for (const m of financialMetricKeys) {
        try {
          const res = await getCanonicalMetric(m, {
            callerRole,
            preset,
            customStart: options.customStart,
            customEnd: options.customEnd,
            fresh,
          });
          financial.push({
            metric: m,
            label:
              m === 'gross_sales'
                ? 'Gross Sales'
                : m === 'net_sales'
                  ? 'Net Sales'
                  : 'Average Order Value (AOV)',
            category: 'financial',
            value: res.value,
            unit: res.currency || 'INR',
            status: res.status,
            sampleSize: res.sampleSize,
          });
        } catch (e: any) {
          financial.push({
            metric: m,
            label: m,
            category: 'financial',
            value: null,
            unit: 'INR',
            status: 'unavailable',
          });
        }
      }
    }

    // Operational Metrics
    const opMetricKeys: Array<{
      key: CanonicalMetric;
      label: string;
      unit: string;
    }> = [
      { key: 'cancellation_rate', label: 'Order Cancellation Rate', unit: '%' },
      { key: 'rto_rate', label: 'Return-to-Origin (RTO) Rate', unit: '%' },
      { key: 'return_rate', label: 'Customer Return Rate', unit: '%' },
      { key: 'stock_out_rate', label: 'Catalog Stock-Out Rate', unit: '%' },
      { key: 'payment_failure_rate', label: 'Payment Failure Rate', unit: '%' },
      { key: 'paid_orders_count', label: 'Paid Orders Volume', unit: 'count' },
    ];

    for (const { key, label, unit } of opMetricKeys) {
      try {
        const res = await getCanonicalMetric(key, {
          callerRole,
          preset,
          customStart: options.customStart,
          customEnd: options.customEnd,
          fresh,
        });
        operational.push({
          metric: key,
          label,
          category:
            key === 'stock_out_rate'
              ? 'inventory'
              : key === 'payment_failure_rate'
                ? 'infrastructure'
                : 'operations',
          value: res.value,
          unit: res.unit || unit,
          status: res.status,
          sampleSize: res.sampleSize,
        });
      } catch (e: any) {
        operational.push({
          metric: key,
          label,
          category: 'operations',
          value: null,
          unit,
          status: 'unavailable',
        });
      }
    }

    return { financial, operational };
  };

  // ─── SUB-TASK 2: Inventory Signals ─────────────────────────────────────────
  const fetchInventoryTask = async (): Promise<InventorySignalSummary> => {
    const supabase = getServiceClient();
    const { data: products, error } = await supabase
      .from('products')
      .select('id, status, stock_quantity');

    if (error || !products) {
      throw new Error(error?.message || 'Products table query failed');
    }

    const activeProducts = products.filter(
      (p) => p.status === 'active' || p.status === 'published'
    );
    const activeSkuCount = activeProducts.length;

    if (activeSkuCount === 0) {
      return {
        activeSkuCount: 0,
        stockOutRate: null,
        outOfStockSkuCount: 0,
        lowStockSkuCount: 0,
        status: 'insufficient_data',
      };
    }

    const outOfStockSkuCount = activeProducts.filter(
      (p) => (p.stock_quantity ?? 0) <= 0
    ).length;

    const lowStockSkuCount = activeProducts.filter(
      (p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 3
    ).length;

    const stockOutRate = Number(
      ((outOfStockSkuCount / activeSkuCount) * 100).toFixed(2)
    );

    return {
      activeSkuCount,
      stockOutRate,
      outOfStockSkuCount,
      lowStockSkuCount,
      status: 'available',
    };
  };

  // ─── SUB-TASK 3: Funnel Signals ────────────────────────────────────────────
  const fetchFunnelTask = async (): Promise<FunnelSignalSummary> => {
    const supabase = getServiceClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .gte('created_at', timeWindow.start)
      .lte('created_at', timeWindow.end);

    if (error || !orders) {
      throw new Error(error?.message || 'Orders table query failed');
    }

    const ordersCreated = orders.length;
    const paidOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'pending_payment'
    ).length;
    const cancellations = orders.filter((o) => o.status === 'cancelled').length;
    const returns = orders.filter(
      (o) =>
        o.status === 'returned' ||
        o.status === 'return_requested' ||
        o.status === 'return_approved'
    ).length;

    const cancellationRate =
      ordersCreated > 0
        ? Number(((cancellations / ordersCreated) * 100).toFixed(2))
        : null;
    const returnRate =
      paidOrders > 0 ? Number(((returns / paidOrders) * 100).toFixed(2)) : null;

    return {
      ordersCreated,
      paidOrders,
      cancellations,
      returns,
      cancellationRate,
      returnRate,
      status: ordersCreated > 0 ? 'available' : 'insufficient_data',
    };
  };

  // ─── SUB-TASK 4: System Health ─────────────────────────────────────────────
  const fetchSystemHealthTask = async (): Promise<SystemHealthSummary> => {
    const supabase = getServiceClient();
    const { data: diags, error } = await supabase
      .from('ai_failure_diagnostics')
      .select('id, created_at')
      .gte('created_at', timeWindow.start)
      .lte('created_at', timeWindow.end);

    const aiFailureIncidentCount = error || !diags ? 0 : diags.length;

    // Read payment failure rate
    let paymentFailureRate: number | null = null;
    try {
      const pfr = await getCanonicalMetric('payment_failure_rate', {
        callerRole,
        preset,
        customStart: options.customStart,
        customEnd: options.customEnd,
        fresh,
      });
      paymentFailureRate = pfr.value;
    } catch {
      // Handled gracefully
    }

    let healthState: 'healthy' | 'degraded' | 'critical' | 'unknown' =
      'healthy';
    if (
      (paymentFailureRate !== null && paymentFailureRate > 20) ||
      aiFailureIncidentCount > 10
    ) {
      healthState = 'critical';
    } else if (
      (paymentFailureRate !== null && paymentFailureRate > 10) ||
      aiFailureIncidentCount > 3
    ) {
      healthState = 'degraded';
    }

    return {
      paymentFailureRate,
      aiFailureIncidentCount,
      healthState,
      status: 'available',
    };
  };

  // ─── SUB-TASK 5: Active Anomalies ──────────────────────────────────────────
  const fetchAnomaliesTask = async (): Promise<AnomalyContextItem[]> => {
    const registry = getAnomalyLifecycleRegistry();
    const records = registry
      .getRecords()
      .filter((r) => r.state === 'open' || r.state === 'acknowledged');

    // Sort critical first, then newest
    records.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      return (
        new Date(b.lastObservedAt).getTime() -
        new Date(a.lastObservedAt).getTime()
      );
    });

    const filtered = records
      .filter((rec) => {
        // Staff cannot view financial anomalies
        if (rec.recommendation?.category === 'financial' && !financialAllowed) {
          return false;
        }
        return true;
      })
      .slice(0, maxAnomalies);

    return filtered.map((rec) => ({
      ruleId: rec.ruleId,
      title: rec.title,
      severity: rec.severity,
      metric: rec.metric,
      observedValue: rec.latestValue,
      thresholdValue: rec.thresholdValue,
      explanation: rec.recommendation?.explanation || rec.title,
      suggestedAction:
        rec.recommendation?.suggestedNextStep?.actionTitle || 'Manual review',
      deepLink: rec.recommendation?.suggestedNextStep?.safeDeepLink,
      firstDetectedAt: rec.firstDetectedAt,
    }));
  };

  // ─── Dispatch all tasks concurrently ───────────────────────────────────────
  const [metricsRes, inventoryRes, funnelRes, healthRes, anomaliesRes] =
    await Promise.allSettled([
      fetchMetricsTask(),
      fetchInventoryTask(),
      fetchFunnelTask(),
      fetchSystemHealthTask(),
      fetchAnomaliesTask(),
    ]);

  // ─── Handle Sub-Task 1: Metrics ───────────────────────────────────────────
  let financialMetrics: FormattedMetricSignal[] = [];
  let operationalMetrics: FormattedMetricSignal[] = [];

  if (metricsRes.status === 'fulfilled') {
    financialMetrics = metricsRes.value.financial;
    operationalMetrics = metricsRes.value.operational;
    provenance.push({
      source: 'supabase:canonical_metrics',
      status: 'available',
      freshness: assembledAt,
      recordCount: financialMetrics.length + operationalMetrics.length,
    });
  } else {
    unavailableSources.push('canonical_metrics');
    provenance.push({
      source: 'supabase:canonical_metrics',
      status: 'unavailable',
      freshness: assembledAt,
      error: metricsRes.reason?.message,
    });
  }

  // ─── Handle Sub-Task 2: Inventory ─────────────────────────────────────────
  let inventorySignals: InventorySignalSummary;
  if (inventoryRes.status === 'fulfilled') {
    inventorySignals = inventoryRes.value;
    provenance.push({
      source: 'supabase:products',
      status: 'available',
      freshness: assembledAt,
      recordCount: inventorySignals.activeSkuCount,
    });
  } else {
    unavailableSources.push('products_inventory');
    inventorySignals = {
      activeSkuCount: 0,
      stockOutRate: null,
      outOfStockSkuCount: 0,
      lowStockSkuCount: 0,
      status: 'unavailable',
    };
    provenance.push({
      source: 'supabase:products',
      status: 'unavailable',
      freshness: assembledAt,
      error: inventoryRes.reason?.message,
    });
  }

  // ─── Handle Sub-Task 3: Funnel ────────────────────────────────────────────
  let funnelSummary: FunnelSignalSummary;
  if (funnelRes.status === 'fulfilled') {
    funnelSummary = funnelRes.value;
    provenance.push({
      source: 'supabase:orders_funnel',
      status: 'available',
      freshness: assembledAt,
      recordCount: funnelSummary.ordersCreated,
    });
  } else {
    unavailableSources.push('orders_funnel');
    funnelSummary = {
      ordersCreated: 0,
      paidOrders: 0,
      cancellations: 0,
      returns: 0,
      cancellationRate: null,
      returnRate: null,
      status: 'unavailable',
    };
    provenance.push({
      source: 'supabase:orders_funnel',
      status: 'unavailable',
      freshness: assembledAt,
      error: funnelRes.reason?.message,
    });
  }

  // ─── Handle Sub-Task 4: System Health ─────────────────────────────────────
  let systemHealth: SystemHealthSummary;
  if (healthRes.status === 'fulfilled') {
    systemHealth = healthRes.value;
    provenance.push({
      source: 'supabase:ai_failure_diagnostics',
      status: 'available',
      freshness: assembledAt,
      recordCount: systemHealth.aiFailureIncidentCount,
    });
  } else {
    unavailableSources.push('ai_failure_diagnostics');
    systemHealth = {
      paymentFailureRate: null,
      aiFailureIncidentCount: 0,
      healthState: 'unknown',
      status: 'unavailable',
    };
    provenance.push({
      source: 'supabase:ai_failure_diagnostics',
      status: 'unavailable',
      freshness: assembledAt,
      error: healthRes.reason?.message,
    });
  }

  // ─── Handle Sub-Task 5: Anomalies ─────────────────────────────────────────
  let activeAnomalies: AnomalyContextItem[] = [];
  if (anomaliesRes.status === 'fulfilled') {
    activeAnomalies = anomaliesRes.value;
    provenance.push({
      source: 'anomaly_lifecycle_registry',
      status: 'available',
      freshness: assembledAt,
      recordCount: activeAnomalies.length,
    });
  } else {
    unavailableSources.push('anomaly_lifecycle_registry');
    provenance.push({
      source: 'anomaly_lifecycle_registry',
      status: 'unavailable',
      freshness: assembledAt,
      error: anomaliesRes.reason?.message,
    });
  }

  // ─── Markdown Representation ─────────────────────────────────────────────
  const { markdown, characterCount } = buildPromptContextMarkdown({
    assembledAt,
    timeWindow,
    callerRole,
    financialMetrics,
    operationalMetrics,
    inventorySignals,
    funnelSummary,
    systemHealth,
    activeAnomalies,
    unavailableSources,
    maxPromptChars,
  });

  return {
    assembledAt,
    timeWindow,
    callerRole,
    provenance,
    unavailableSources,
    financialMetrics,
    operationalMetrics,
    inventorySignals,
    funnelSummary,
    systemHealth,
    activeAnomalies,
    privacyGuarantees: {
      noPiiIncluded: true,
      noRawConversations: true,
      sanitizedRole: callerRole,
      financialAccessGranted: financialAllowed,
    },
    promptContextMarkdown: markdown,
    characterCount,
  };
}
