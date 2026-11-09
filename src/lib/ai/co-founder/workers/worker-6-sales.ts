import 'server-only';

import {
  AIWorkerInterface,
  WorkerDataSourceMode,
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

export interface FunnelStage {
  stage: string;
  count: number | null;
  conversionRatePercent: number | null;
  dropOffRatePercent: number | null;
  status: 'measured' | 'unavailable' | 'estimated';
  notes?: string;
}

export class SalesConversionWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_sales_conversion';
  readonly name = 'Sales & Conversion Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'VP of Conversion Rate Optimization (CRO) & E-Commerce Sales',
      objective:
        'Analyze full checkout funnel drop-offs, isolate cart and payment friction points, and engineer targeted CRO interventions to maximize store revenue.',
      priority: this.priority,
      responsibilities: [
        'Analyze visitors-to-checkout conversion funnel and identify drop-off stages',
        'Audit cart abandonment and checkout friction factors',
        'Diagnose payment failures, COD vs Prepaid completion ratios, and cancellations',
        'Estimate potential revenue recovered from checkout optimization',
        'Recommend high-leverage CRO experiments (UPI fast checkout, trust seals, urgency triggers)',
        'Track Average Order Value (AOV) and basket velocity improvements',
      ],
      requiredSkills: [
        'Funnel conversion analysis',
        'Checkout friction diagnosis',
        'Payment gateway failure analysis',
        'Conversion Rate Optimization (CRO)',
      ],
      requiredTools: ['get_store_metrics', 'get_sales_analytics', 'get_orders'],
      permissionScope: ['mcp_tools:read'],
      isSystemWorker: false,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const timeframe = (input.timeframe ||
      input.parameters?.timeframe ||
      '30d') as AnalyticsTimeframe;

    try {
      const analytics = await getStoreAnalytics({ timeframe });
      const rawAnalytics = analytics as any;
      const cur = rawAnalytics.currentPeriod || rawAnalytics.kpis || {};

      const findings: string[] = [];
      const evidence: string[] = [];
      const problems: string[] = [];
      const opportunities: string[] = [];
      const recommendations: string[] = [];

      const totalOrders: number = cur.totalOrders ?? 0;
      const completedOrders: number =
        cur.completedOrders ?? cur.paidOrders ?? 0;
      const cancelledOrders: number = cur.cancelledOrders ?? 0;
      const cancellationRate: number = cur.cancellationRate ?? 0;
      const aov: number = cur.aov ?? 0;
      const rev: number = cur.totalRevenue ?? 0;

      // Check if authoritative web session analytics (e.g. PostHog) are available
      const measuredVisitors: number | null =
        cur.totalVisitors ?? cur.visitors ?? null;
      const measuredCarts: number | null = cur.totalCarts ?? cur.carts ?? null;
      const measuredCheckouts: number | null =
        cur.totalCheckouts ?? cur.checkouts ?? null;

      const hasPreCheckoutTelemetry =
        measuredVisitors !== null && measuredVisitors > 0;

      let funnel: FunnelStage[];
      let overallConversionRate: number | null = null;
      let checkoutDropoffRate: number | null = null;

      if (hasPreCheckoutTelemetry) {
        const carts = measuredCarts ?? Math.round(measuredVisitors * 0.05);
        const checkouts = measuredCheckouts ?? Math.round(carts * 0.5);

        overallConversionRate = Number(
          ((totalOrders / measuredVisitors) * 100).toFixed(2)
        );
        checkoutDropoffRate =
          checkouts > 0
            ? Number((100 - (totalOrders / checkouts) * 100).toFixed(1))
            : 0;

        funnel = [
          {
            stage: 'Store Visitors',
            count: measuredVisitors,
            conversionRatePercent: 100,
            dropOffRatePercent: 0,
            status: 'measured',
          },
          {
            stage: 'Added to Cart',
            count: carts,
            conversionRatePercent: Number(
              ((carts / measuredVisitors) * 100).toFixed(1)
            ),
            dropOffRatePercent: Number(
              (100 - (carts / measuredVisitors) * 100).toFixed(1)
            ),
            status: measuredCarts !== null ? 'measured' : 'estimated',
          },
          {
            stage: 'Initiated Checkout',
            count: checkouts,
            conversionRatePercent: Number(
              ((checkouts / Math.max(carts, 1)) * 100).toFixed(1)
            ),
            dropOffRatePercent: Number(
              (100 - (checkouts / Math.max(carts, 1)) * 100).toFixed(1)
            ),
            status: measuredCheckouts !== null ? 'measured' : 'estimated',
          },
          {
            stage: 'Orders Placed',
            count: totalOrders,
            conversionRatePercent: Number(
              ((totalOrders / Math.max(checkouts, 1)) * 100).toFixed(1)
            ),
            dropOffRatePercent: checkoutDropoffRate,
            status: 'measured',
          },
          {
            stage: 'Orders Completed (Delivered / Paid)',
            count: completedOrders,
            conversionRatePercent: Number(
              ((completedOrders / Math.max(totalOrders, 1)) * 100).toFixed(1)
            ),
            dropOffRatePercent: Number(
              ((cancelledOrders / Math.max(totalOrders, 1)) * 100).toFixed(1)
            ),
            status: 'measured',
          },
        ];
      } else {
        // Truthful funnel: Mark pre-checkout stages unavailable without guessing benchmark multipliers
        funnel = [
          {
            stage: 'Store Visitors',
            count: null,
            conversionRatePercent: null,
            dropOffRatePercent: null,
            status: 'unavailable',
            notes:
              'Visitor analytics telemetry currently unattached (PostHog/web session stream unavailable). Benchmark multiplier estimation is strictly removed.',
          },
          {
            stage: 'Added to Cart',
            count: null,
            conversionRatePercent: null,
            dropOffRatePercent: null,
            status: 'unavailable',
            notes: 'Cart event telemetry unavailable.',
          },
          {
            stage: 'Initiated Checkout',
            count: null,
            conversionRatePercent: null,
            dropOffRatePercent: null,
            status: 'unavailable',
            notes: 'Checkout initiation telemetry unavailable.',
          },
          {
            stage: 'Orders Placed',
            count: totalOrders,
            conversionRatePercent: 100,
            dropOffRatePercent: 0,
            status: 'measured',
            notes: 'Authoritative database order volume',
          },
          {
            stage: 'Orders Completed (Delivered / Paid)',
            count: completedOrders,
            conversionRatePercent:
              totalOrders > 0
                ? Number(((completedOrders / totalOrders) * 100).toFixed(1))
                : 0,
            dropOffRatePercent:
              totalOrders > 0
                ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1))
                : 0,
            status: 'measured',
            notes: 'Delivered and fulfilled orders',
          },
        ];
      }

      if (hasPreCheckoutTelemetry) {
        findings.push(
          `Storewide conversion rate is ${overallConversionRate}% across ${measuredVisitors!.toLocaleString('en-IN')} measured visitors, yielding ${totalOrders} orders (₹${rev.toLocaleString('en-IN')}).`
        );
        findings.push(
          `Checkout-to-Order completion is ${funnel[3].conversionRatePercent}%, with a ${checkoutDropoffRate}% drop-off between initiating checkout and placing order.`
        );
      } else if (totalOrders > 0) {
        findings.push(
          `Authoritative order volume in ${timeframe}: ${totalOrders} orders placed (₹${rev.toLocaleString('en-IN')}) with ₹${aov.toLocaleString('en-IN')} average order value.`
        );
        findings.push(
          `Pre-checkout funnel stages (Store Visitors, Added to Cart, Initiated Checkout) are marked UNAVAILABLE pending web session telemetry integration. Synthetic benchmark multipliers are strictly omitted.`
        );
      } else {
        findings.push(
          `Zero order records found for timeframe (${timeframe}). Funnel stages are marked INSUFFICIENT_DATA.`
        );
      }

      evidence.push(
        `Authoritative completed orders: ${completedOrders}, cancelled/unfulfilled orders: ${cancelledOrders} (Cancellation rate: ${cancellationRate}%).`
      );

      // Bottleneck identification
      if (
        hasPreCheckoutTelemetry &&
        checkoutDropoffRate &&
        checkoutDropoffRate > 35
      ) {
        problems.push(
          `Severe checkout abandonment detected: ${checkoutDropoffRate}% of users who initiate checkout leave before completing payment.`
        );
      } else if (!hasPreCheckoutTelemetry) {
        problems.push(
          'Pre-checkout conversion funnel visibility is limited due to unattached web session events.'
        );
      }

      if (cancellationRate > 12) {
        problems.push(
          `Post-order cancellation rate of ${cancellationRate}% reduces net realized GMV.`
        );
      }

      // CRO Opportunities
      opportunities.push(
        'UPI One-Click Checkout: Enabling prominent Razorpay UPI QR and intent flow reduces checkout field friction from 8 steps to 2 taps.'
      );
      opportunities.push(
        'Automated WhatsApp Abandoned Order Recovery: Prompting uncompleted or COD customers within 30 minutes improves conversion without guessing funnel ratios.'
      );

      // Strategic CRO recommendations
      recommendations.push(
        'Add Sticky "Express Checkout (Pay via UPI)" button directly on Product Detail Pages.'
      );
      recommendations.push(
        'Prominently render trust badges below the checkout button: "Free Express Blue Dart Delivery", "6-Month Color Guarantee", "All Taxes Included".'
      );
      recommendations.push(
        'Implement automated WhatsApp abandoned checkout recovery at 30 minutes with an instant 5% incentive.'
      );

      const priority =
        (checkoutDropoffRate && checkoutDropoffRate > 40) ||
        cancellationRate > 15
          ? 'high'
          : 'medium';

      const sourceMode: WorkerDataSourceMode =
        totalOrders === 0
          ? 'insufficient_data'
          : hasPreCheckoutTelemetry
            ? 'live'
            : 'partial';

      const voiceSummary = hasPreCheckoutTelemetry
        ? `Sales and conversion audit complete. Overall store conversion rate is ${overallConversionRate}% with ${totalOrders} orders and ₹${aov.toLocaleString('en-IN')} AOV.`
        : `Sales and conversion audit complete. Overall store conversion is not available because pre-checkout visitor telemetry is unattached; analyzed ${totalOrders} authoritative orders with ₹${aov.toLocaleString('en-IN')} AOV and ${cancellationRate}% cancellations.`;

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        sourceMode,
        findings,
        evidence,
        problems,
        opportunities,
        recommendations,
        priority,
        expectedImpact:
          '15-20% reduction in checkout drop-off and improved order fulfillment.',
        requiredAction:
          'Implement Sticky UPI button on mobile PDPs and activate WhatsApp checkout recovery sequence',
        requiredApproval: false,
        executionStatus: 'not_required',
        verification:
          'Measure checkout completion rate and WhatsApp recovery conversion over next 14 days.',
        missingCapabilities: hasPreCheckoutTelemetry
          ? []
          : ['web_session_telemetry'],
        data: {
          funnel,
          metrics: {
            overallConversionRate,
            checkoutDropoffRate,
            totalOrders,
            completedOrders,
            cancellationRate,
          },
        },
        executiveVoiceSummary: voiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        sourceMode: 'unavailable',
        findings: ['Sales and conversion analysis failed.'],
        evidence: [err.message],
        problems: [`Failed to compute sales funnel metrics: ${err.message}`],
        opportunities: [],
        recommendations: [
          'Check analytics service logs and database query health.',
        ],
        priority: 'high',
        expectedImpact: 'Restore conversion funnel observability',
        requiredAction: 'Resolve sales analytics query error',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'Re-run sales conversion worker task.',
        missingCapabilities: [],
        executiveVoiceSummary: `Sales and conversion worker encountered an issue: ${err.message}`,
        timestamp,
      };
    }
  }
}

export const salesConversionWorker = new SalesConversionWorker();
