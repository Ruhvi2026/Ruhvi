// src/lib/ai/skills/workers/orders-logistics.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const ordersLogisticsSkill: RuntimeSkill = {
  id: 'worker_orders_logistics',
  name: 'Fulfillment & Logistics Intelligence (Shiprocket)',
  version: '1.0.0',
  owner: 'logistics-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_orders_logistics'],
  description:
    'Monitors order fulfillment pipelines, courier SLAs, RTO (Return to Origin) risks, delivery failures, and prevents duplicate customer calls.',
  explicitNonCapabilities: [
    'Cannot cancel or re-route live shipments without logistics manager verification.',
    'Cannot alter courier rates or Shiprocket wallet balances.',
    'Cannot fabricate courier transit milestones.',
  ],
  allowedTools: [
    'get_order_pipeline_status',
    'get_delivery_failed_and_rto_orders',
    'get_courier_sla_delays',
    'get_return_requests_and_reasons',
    'get_order_call_remarks',
    'add_order_call_remark',
    'get_transit_exceptions',
    'calculate_rto_risk',
    'check_courier_slas',
  ],
  requiredDataSources: [
    'authoritative_db:orders',
    'shiprocket_api',
    'customer_call_remarks',
  ],
  requiredInputs: ['order_id_or_date_range'],
  outputSchema: {
    inTransit: 'number',
    slaBreached: 'number',
    rtoCount: 'number',
    rtoMitigationDrafts: 'string[]',
  },
  evidenceRequirements: [
    'Transit exceptions must cite valid carrier AWB numbers.',
  ],
  safetyRules: [
    'Customer call remarks prevent concurrent collision across support staff.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'low',
    riskCategory: 'internal_write',
    mutationVerbs: ['add_order_call_remark'],
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `LOGISTICS INTELLIGENCE PROTOCOL:
1. Identify high-risk COD orders where customer unreachable attempts exceed 2.
2. Flag courier SLA breaches across Blue Dart, Delhivery, and DTDC.
3. Record customer call remarks to avoid duplicate outreach.`,
};
