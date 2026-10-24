import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import { getServiceClient } from '@/lib/supabase/service';

export interface OrderPipelineMetrics {
  totalMonitoredOrders: number;
  statusCounts: Record<string, number>;
  deliveryFailedCount: number;
  rtoCount: number;
  activeReturnsCount: number;
  recentReturnsByReason: { reason: string; count: number }[];
  handledCallRemarksCount: number;
  unhandledFailedDeliveries: {
    orderId: string;
    orderNumber?: string;
    shippingCity?: string;
    status: string;
    callRemarkStatus?: string;
    lastCallBy?: string;
  }[];
}

export class OrdersLogisticsWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_orders_logistics';
  readonly name = 'Orders & Logistics Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Head of Order Fulfillment & Logistics Intelligence',
      objective:
        'Monitor active fulfillment pipelines, detect delivery failures, track courier SLA transit times, analyze customer return reasons, and inspect order call follow-up remarks without exposing financial turnover.',
      priority: this.priority,
      responsibilities: [
        'Real-time order pipeline monitoring (Pending, Processing, Shipped, Out for Delivery, Delivered)',
        'Delivery failure and RTO triage (preventing duplicate calls to customers)',
        'Courier partner performance tracking (Shiprocket, BlueDart, Delhivery transit times)',
        'Customer return requests monitoring and root-cause reason classification (Size, Defective, Wrong item)',
        'Order call remarks and follow-up status auditing via order_call_remarks',
        'Strict financial secrecy: Gross sales, revenue values, and margins are strictly excluded',
      ],
      requiredSkills: [
        'Logistics & fulfillment orchestration',
        'RTO reduction & delivery failure mitigation',
        'Return request root-cause analysis',
        'Call collision prevention & customer remark auditing',
      ],
      requiredTools: [
        'get_order_pipeline_status',
        'get_delivery_failed_and_rto_orders',
        'get_courier_sla_delays',
        'get_return_requests_and_reasons',
        'get_order_call_remarks',
        'add_order_call_remark',
      ],
      permissionScope: ['orders:read', 'orders:write', 'mcp_tools:read'],
      isSystemWorker: false,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const supabase = getServiceClient();

    const findings: string[] = [];
    const evidence: string[] = [];
    const problems: string[] = [];
    const opportunities: string[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Fetch recent orders status pipeline (strictly omitting monetary amounts)
      const { data: recentOrders, error: ordersError } = await supabase
        .from('orders')
        .select(
          'id, order_number, status, shipping_address, created_at, updated_at'
        )
        .order('created_at', { ascending: false })
        .limit(100);

      const orderList = recentOrders || [];
      const statusCounts: Record<string, number> = {};

      for (const ord of orderList) {
        const st = ord.status || 'pending';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      }

      const pendingOrders = statusCounts['pending'] || 0;
      const processingOrders = statusCounts['processing'] || 0;
      const shippedOrders = statusCounts['shipped'] || 0;
      const outForDelivery = statusCounts['out_for_delivery'] || 0;
      const deliveredOrders = statusCounts['delivered'] || 0;
      const deliveryFailed = statusCounts['delivery_failed'] || 0;
      const rtoInitiated =
        (statusCounts['rto_initiated'] || 0) +
        (statusCounts['rto_received'] || 0);

      findings.push(
        `Order pipeline audit (last 100 orders): ${orderList.length} monitored orders. ` +
          `Shipped: ${shippedOrders}, Out for Delivery: ${outForDelivery}, Delivered: ${deliveredOrders}, ` +
          `Pending/Processing: ${pendingOrders + processingOrders}, Delivery Failed: ${deliveryFailed}, RTO: ${rtoInitiated}.`
      );

      // 2. Fetch recent returns and categorize reasons
      const { data: returnsData } = await supabase
        .from('returns')
        .select(
          'id, order_id, reason, status, comments, created_at, requested_at'
        )
        .order('created_at', { ascending: false })
        .limit(50);

      const returnList = returnsData || [];
      const reasonCountMap: Record<string, number> = {};

      for (const ret of returnList) {
        const r = ret.reason || 'Not specified';
        reasonCountMap[r] = (reasonCountMap[r] || 0) + 1;
      }

      const reasonBreakdown = Object.entries(reasonCountMap).map(
        ([reason, count]) => ({
          reason,
          count,
        })
      );

      if (returnList.length > 0) {
        const topReason = reasonBreakdown.sort((a, b) => b.count - a.count)[0];
        findings.push(
          `Returns audit: ${returnList.length} total return requests recorded. Top reason: "${topReason?.reason || 'Other'}" (${topReason?.count || 0} cases).`
        );
        evidence.push(
          `Return reasons breakdown: ${reasonBreakdown.map((rb) => `${rb.reason}: ${rb.count}`).join(', ')}.`
        );
      } else {
        findings.push(
          'Returns audit: Zero active return requests in recent window.'
        );
      }

      // 3. Fetch call remarks to verify handled vs unhandled failed deliveries
      const { data: callRemarks } = await supabase
        .from('order_call_remarks')
        .select(
          'id, order_id, staff_name, department, call_status, remark_text, rescheduled_date, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(50);

      const remarksList = callRemarks || [];
      const remarksByOrder: Record<string, any> = {};

      for (const rem of remarksList) {
        if (!remarksByOrder[rem.order_id]) {
          remarksByOrder[rem.order_id] = rem;
        }
      }

      // Check delivery failed orders
      const failedOrders = orderList.filter(
        (o) => o.status === 'delivery_failed'
      );
      const unhandledOrders: any[] = [];

      for (const fo of failedOrders) {
        const remark = remarksByOrder[fo.id];
        const isHandled =
          remark &&
          ['connected_resolved', 'rescheduled'].includes(remark.call_status);
        if (!isHandled) {
          const addr =
            typeof fo.shipping_address === 'object' ? fo.shipping_address : {};
          unhandledOrders.push({
            orderId: fo.id,
            orderNumber: fo.order_number,
            shippingCity: (addr as any)?.city || 'Unknown',
            status: fo.status,
            callRemarkStatus: remark?.call_status || 'not_called',
            lastCallBy: remark?.staff_name || null,
          });
        }
      }

      if (unhandledOrders.length > 0) {
        problems.push(
          `${unhandledOrders.length} failed delivery orders have NOT been resolved yet. Immediate customer phone coordination required before RTO is initiated.`
        );
        evidence.push(
          `Unhandled orders: ${unhandledOrders.map((u) => `${u.orderNumber || u.orderId} (${u.shippingCity}) - Status: ${u.callRemarkStatus}`).join(', ')}.`
        );
        recommendations.push(
          'Support & Orders staff: Open Order Details in Portal, claim call to prevent duplicate customer outreach, and log customer delivery rescheduling remarks.'
        );
      } else if (deliveryFailed > 0) {
        findings.push(
          'All recent failed delivery orders have active follow-up remarks recorded by staff.'
        );
      }

      // Sizing return mitigation recommendations
      const sizeMismatchCount =
        reasonCountMap['Size mismatch'] ||
        reasonCountMap['Size mismatch / Incorrect fit'] ||
        0;
      if (sizeMismatchCount >= 2) {
        opportunities.push(
          'High frequency of size-related returns observed. Recommend providing ring/bangle size guides or proactive sizing verification before dispatch.'
        );
      }

      const voiceSummary =
        `Fulfillment pipeline status: ${orderList.length} recent orders monitored. ` +
        `${shippedOrders + outForDelivery} orders currently in transit, ${deliveredOrders} delivered. ` +
        (unhandledOrders.length > 0
          ? `Alert: ${unhandledOrders.length} failed delivery order(s) require customer phone outreach in the portal. `
          : `Delivery health is stable. `) +
        (returnList.length > 0
          ? `${returnList.length} return requests tracked with primary cause "${reasonBreakdown[0]?.reason || 'sizing'}".`
          : 'Zero pending returns.');

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings,
        evidence,
        problems,
        opportunities,
        recommendations,
        priority: unhandledOrders.length > 0 ? 'high' : 'medium',
        expectedImpact:
          'Reduced RTO losses, prevention of duplicate customer calls, and accelerated return resolution SLA.',
        requiredAction:
          unhandledOrders.length > 0
            ? 'Support & Orders staff claim failed delivery calls in portal and record remarks.'
            : 'Maintain current fulfillment cadence.',
        requiredApproval: false,
        executionStatus: 'not_required',
        verification:
          'Authoritative orders and order_call_remarks database tables audited. Zero revenue/price data leaked.',
        data: {
          totalMonitoredOrders: orderList.length,
          statusCounts,
          deliveryFailedCount: deliveryFailed,
          rtoCount: rtoInitiated,
          activeReturnsCount: returnList.length,
          recentReturnsByReason: reasonBreakdown,
          handledCallRemarksCount: remarksList.length,
          unhandledFailedDeliveries: unhandledOrders,
        },
        executiveVoiceSummary: voiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: ['Logistics query executed with partial telemetry.'],
        evidence: [err?.message || 'Database query exception'],
        problems: ['Unable to fetch full orders pipeline records.'],
        opportunities: [],
        recommendations: [
          'Inspect Supabase connection and verify orders table accessibility.',
        ],
        priority: 'high',
        expectedImpact: 'Fulfillment visibility restoration.',
        requiredAction: 'Verify database health.',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'System exception recorded.',
        executiveVoiceSummary:
          'Fulfillment pipeline check encountered an issue reaching order records.',
        timestamp,
      };
    }
  }
}

export const ordersLogisticsWorker = new OrdersLogisticsWorker();
