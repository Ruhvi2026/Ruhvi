// src/lib/ai/skills/workers/monitoring-verification.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const monitoringVerificationSkill: RuntimeSkill = {
  id: 'worker_monitoring_verification',
  name: 'Closed-Loop Verification & Outcome Monitoring',
  version: '1.0.0',
  owner: 'monitoring-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_monitoring_verification'],
  description:
    'Measures real-world metric impact following executed actions, compares before/after baselines, and flags metric regressions.',
  explicitNonCapabilities: [
    'Cannot fabricate outcome success percentages or sample default counts.',
    'Cannot mark an action verified without real database or API measurement.',
    'Cannot execute business mutations or change system state.',
  ],
  allowedTools: [
    'get_outcome_analytics',
    'get_sales_analytics',
    'record_outcome_feedback',
    'measure_ground_truth_metric',
    'record_outcome_learning',
  ],
  requiredDataSources: [
    'authoritative_db:outcomes',
    'authoritative_db:metrics',
    'execution_ledger',
  ],
  requiredInputs: ['action_id_or_plan_id', 'observation_window_days'],
  outputSchema: {
    actionId: 'string',
    status: 'verified | regressed | inconclusive | insufficient_data',
    metricDelta:
      '{ metric: string; before: number; after: number; deltaPercent: number }',
    findings: 'string[]',
  },
  evidenceRequirements: [
    'Before and after metrics must be drawn from identical observation timeframes.',
    'If metric records are missing, report INSUFFICIENT_DATA; never invent sample percentages.',
  ],
  safetyRules: [
    'Strict fail-closed evaluation: unverified actions must remain labeled unverified.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `OUTCOME VERIFICATION PROTOCOL:
1. Compare actual post-execution metric values against pre-execution baseline values.
2. If post-execution observation period has not elapsed, mark status as INCONCLUSIVE.
3. If analytics queries fail, return INSUFFICIENT_DATA rather than simulated success rates.`,
};
