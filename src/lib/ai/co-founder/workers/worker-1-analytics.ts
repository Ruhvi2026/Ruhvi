import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import {
  getStoreAnalytics,
  type AnalyticsTimeframe,
} from '@/lib/ai/co-founder/analytics';
import { runBusinessIntelligenceScan } from '@/lib/ai/co-founder/business-intelligence';

export class AnalyticsPerformanceWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_analytics_performance';
  readonly name = 'Analytics & Performance Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Chief Data Scientist & Performance Analyst',
      objective:
        'Continuous analysis of store sales, traffic, conversion rates, and funnel drops to detect anomalies and quantify revenue impact.',
      priority: this.priority,
      responsibilities: [
        'Analyze store traffic, orders, revenue, and AOV metrics',
        'Compare performance against normalized baseline periods (e.g. 7d, 30d)',
        'Detect statistical anomalies and metric degradation',
        'Identify conversion bottlenecks and checkout drop-off rates',
        'Provide empirical evidence and historical comparisons for findings',
        'Formulate actionable, prioritized data-backed recommendations',
      ],
      requiredSkills: [
        'Statistical analysis',
        'Funnel conversion modeling',
        'Cohort and period-over-period comparison',
        'Anomaly detection',
      ],
      requiredTools: [
        'get_store_metrics',
        'get_sales_analytics',
        'run_business_intelligence_scan',
      ],
      permissionScope: ['mcp_tools:read', 'admin:analytics'],
      isSystemWorker: false,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const timeframe = (input.timeframe ||
      input.parameters?.timeframe ||
      '30d') as AnalyticsTimeframe;

    try {
      // 1. Ingest core store analytics & period-over-period baseline
      const report = await getStoreAnalytics({ timeframe });

      // 2. Ingest proactive business intelligence scan (anomalies, opportunities, risks)
      const biScan = await runBusinessIntelligenceScan(
        timeframe === '7d' ? '7d' : '30d'
      );

      const findings: string[] = [];
      const evidence: string[] = [];
      const problems: string[] = [];
      const opportunities: string[] = [];
      const recommendations: string[] = [];

      // Synthesize findings
      const rev = report.currentPeriod.totalRevenue;
      const orders = report.currentPeriod.totalOrders;
      const aov = report.currentPeriod.aov;
      const cancellationRate = report.currentPeriod.cancellationRate;

      findings.push(
        `Revenue for ${report.currentPeriod.timeframeLabel} is ₹${rev.toLocaleString('en-IN')} across ${orders} orders (AOV: ₹${aov.toLocaleString('en-IN')}).`
      );

      if (report.comparison) {
        const revDelta = report.comparison.revenueGrowthPercent;
        const sign = revDelta >= 0 ? '+' : '';
        findings.push(
          `Period-over-period revenue growth is ${sign}${revDelta.toFixed(1)}% vs baseline (₹${report.comparison.baselineRevenue.toLocaleString('en-IN')}).`
        );
        evidence.push(
          `Baseline comparison: Current orders ${orders} vs Baseline orders ${report.comparison.baselineOrders}.`
        );
      }

      evidence.push(
        `Authoritative metrics derived from live Supabase orders and order_items.`
      );

      // Analyze anomalies & problems
      if (cancellationRate > 15) {
        problems.push(
          `High order cancellation rate detected: ${cancellationRate.toFixed(1)}% (Threshold: 15%).`
        );
        evidence.push(
          `Cancelled orders: ${report.currentPeriod.cancelledOrders} out of ${orders} total orders.`
        );
        recommendations.push(
          `Trigger root-cause investigation on cancellation reasons and inspect payment gateway timeout logs.`
        );
      }

      if (report.insights.anomalies.length > 0) {
        for (const anomaly of report.insights.anomalies) {
          problems.push(
            `Metric Anomaly [${anomaly.metric.toUpperCase()}]: Current ${anomaly.currentValue} deviates from baseline ${anomaly.expectedBaseline} (Severity: ${anomaly.severity}).`
          );
          evidence.push(
            `Anomaly delta: ${(anomaly.deviationPercent >= 0 ? '+' : '') + anomaly.deviationPercent.toFixed(1)}% in ${anomaly.metric}.`
          );
        }
      }

      // Ingest BI scan problems and opportunities
      if (biScan.problems.length > 0) {
        for (const p of biScan.problems.slice(0, 2)) {
          if (!problems.includes(p.description)) {
            problems.push(p.description);
            evidence.push(
              `BI Evidence: Severity ${p.severity} in ${p.category}.`
            );
          }
        }
      }

      if (biScan.opportunities.length > 0) {
        for (const opp of biScan.opportunities.slice(0, 2)) {
          opportunities.push(
            `${opp.title}: Expected upside of ₹${opp.potentialRevenueUpside.toLocaleString('en-IN')}.`
          );
          recommendations.push(opp.recommendedAction);
        }
      }

      if (recommendations.length === 0) {
        recommendations.push(
          'Maintain current conversion cadence; monitor low-stock SKUs to prevent stockout drop-offs.'
        );
      }

      const priority =
        problems.length > 0
          ? cancellationRate > 25
            ? 'critical'
            : 'high'
          : 'medium';

      const expectedImpact =
        opportunities.length > 0
          ? `Estimated revenue recovery / upside of ₹${(biScan.summary?.totalOpportunityUpside || 50000).toLocaleString('en-IN')}`
          : 'Stabilize conversion velocity and reduce return/cancellation leakage';

      const voiceSummary =
        report.insights.executiveVoiceSummary ||
        `Analytics check complete for ${timeframe}. Revenue is ₹${rev.toLocaleString('en-IN')} with ${orders} orders and an AOV of ₹${aov.toLocaleString('en-IN')}.`;

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings,
        evidence,
        problems,
        opportunities,
        recommendations,
        priority,
        expectedImpact,
        requiredAction:
          problems.length > 0
            ? 'Review flagged anomalies and initiate corrective action planning'
            : 'No immediate corrective action required',
        requiredApproval: false,
        executionStatus: 'not_required',
        verification:
          'Compare post-intervention 7d order conversion rate and cancellation rate against current baseline.',
        missingCapabilities: [],
        data: {
          metrics: report.currentPeriod,
          comparison: report.comparison,
          anomalies: report.insights.anomalies,
        },
        executiveVoiceSummary: voiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: ['Analytics calculation failed due to an error.'],
        evidence: [err.message || 'Unknown database or computation error'],
        problems: [`Error encountered while querying store metrics: ${err.message}`],
        opportunities: [],
        recommendations: [
          'Verify Supabase connection health and database telemetry logs.',
        ],
        priority: 'high',
        expectedImpact: 'Restore telemetry observability',
        requiredAction: 'Investigate analytics service exceptions',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'Re-run analytics scan after error resolution.',
        missingCapabilities: [],
        executiveVoiceSummary: `I encountered an issue querying analytics data: ${err.message}`,
        timestamp,
      };
    }
  }
}

export const analyticsWorker = new AnalyticsPerformanceWorker();
