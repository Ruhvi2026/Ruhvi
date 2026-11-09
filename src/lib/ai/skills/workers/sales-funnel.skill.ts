// src/lib/ai/skills/workers/sales-funnel.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const salesFunnelSkill: RuntimeSkill = {
  id: 'worker_sales_conversion',
  name: 'Sales Funnel & Conversion Rate Optimization (CRO)',
  version: '1.0.0',
  owner: 'sales-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_sales_conversion'],
  description:
    'Diagnoses checkout friction, payment gateway drop-offs (Razorpay/Cashfree/COD), cart abandonment, and conversion bottlenecks.',
  explicitNonCapabilities: [
    'Cannot fabricate visitor counts or synthesize fake checkout funnels.',
    'Cannot execute customer refunds or alter payment gateway settings.',
    'Cannot apply unauthorized blanket discounts.',
  ],
  allowedTools: [
    'get_store_metrics',
    'get_sales_analytics',
    'get_orders',
    'get_abandonment_metrics',
    'draft_recovery_template',
    'simulate_checkout_flow',
  ],
  requiredDataSources: [
    'authoritative_db:orders',
    'payment_gateways',
    'checkout_telemetry',
  ],
  requiredInputs: ['funnel_stage', 'timeframe'],
  outputSchema: {
    stageDropoff: 'Record<string, number>',
    paymentFailureRate: 'number',
    frictionPoints: 'string[]',
    recommendations: 'string[]',
  },
  evidenceRequirements: [
    'All funnel stage percentages must be derived from measured checkout sessions.',
    'If session tracking is unavailable for a stage, mark it as UNAVAILABLE.',
  ],
  safetyRules: ['Strict fail-closed reporting on missing telemetry.'],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 15,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `SALES & CONVERSION INSTRUCTIONS:
1. Examine payment failures by method (UPI, Cards, NetBanking, COD).
2. If checkout session tracking is missing or incomplete, do not multiply order counts by industry benchmarks; state INSUFFICIENT_DATA explicitly.
3. Propose high-leverage checkout fixes (e.g. 1-click address autofill, pin code validation).`,
};
