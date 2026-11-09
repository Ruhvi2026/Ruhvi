// src/lib/ai/skills/workers/performance-intelligence.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const performanceIntelligenceSkill: RuntimeSkill = {
  id: 'worker_performance_intelligence',
  name: 'Workforce Quality & Performance Auditing',
  version: '1.0.0',
  owner: 'workforce-core',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_performance_intelligence'],
  description:
    'Deterministic measurement, audit, and scorecard evaluation of AI workers and human staff without paid dependencies.',
  explicitNonCapabilities: [
    'Cannot modify performance logs or backdate evaluation scores.',
    'Cannot terminate or downgrade human staff permissions autonomously.',
    'Cannot fabricate SLA adherence metrics or invent task completion counts.',
  ],
  allowedTools: [
    'get_workforce_events',
    'calculate_member_scorecard',
    'audit_workforce_quality',
    'generate_cofounder_report',
  ],
  requiredDataSources: [
    'authoritative_db:workforce_events',
    'workforce_manifests',
  ],
  requiredInputs: ['member_id_or_all', 'timeframe'],
  outputSchema: {
    overallQualityScore: 'number',
    activeWorkerCount: 'number',
    slaBreachCount: 'number',
    regressedWorkers: 'string[]',
    recommendations: 'string[]',
  },
  evidenceRequirements: [
    'Scorecard calculations must follow deterministic formulas over recorded events.',
  ],
  safetyRules: ['Read-only auditing boundary strictly maintained.'],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2500,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `PERFORMANCE INTELLIGENCE INSTRUCTIONS:
1. Apply deterministic mathematical rubrics for KPI calculations.
2. Separate external upstream blockers (e.g. carrier outage) from worker execution defects.
3. Deliver crisp executive summaries to the AI Co-Founder highlighting workforce bottlenecks.`,
};
