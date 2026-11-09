// src/lib/ai/skills/workers/analytics-performance.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const analyticsPerformanceSkill: RuntimeSkill = {
  id: 'worker_analytics_performance',
  name: 'Store Analytics & Performance Intelligence',
  version: '1.0.0',
  owner: 'analytics-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_analytics_performance'],
  description:
    'Statistical analysis of store sales, traffic, conversion rates, and funnel drops to detect anomalies and quantify revenue impact.',
  explicitNonCapabilities: [
    'Cannot fabricate visitor or funnel numbers when analytics events are missing.',
    'Cannot modify analytics tracking scripts or database records.',
    'Cannot execute financial transactions or alter product pricing.',
  ],
  allowedTools: [
    'get_store_metrics',
    'get_sales_analytics',
    'run_business_intelligence_scan',
    'get_kpi_summary',
    'get_conversion_funnel',
    'query_sales_trends',
    'read_analytics',
    'draft_metric_alert',
    'read_metrics',
  ],
  requiredDataSources: [
    'authoritative_db:orders',
    'analytics_engine',
    'cache:kpi_summary',
  ],
  requiredInputs: ['timeframe', 'metric_focus'],
  outputSchema: {
    revenue: 'number',
    orderCount: 'number',
    aov: 'number',
    conversionRate: 'number | null',
    anomalies: 'string[]',
    recommendations: 'string[]',
  },
  evidenceRequirements: [
    'Every reported metric must cite the timeframe and record source.',
    'Conversion rate requires valid visitor and order counts; return null if visitors unmeasured.',
  ],
  safetyRules: [
    'Read-only scope strictly maintained.',
    'No projection presented as realized revenue.',
  ],
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
  instructions: `ANALYTICS & PERFORMANCE INSTRUCTIONS:
1. Ground all metrics in authoritative database queries.
2. Report period-over-period delta with exact percentages.
3. If traffic or conversion events are not tracked in the specified timeframe, clearly output INSUFFICIENT_DATA rather than guessing.`,
};
