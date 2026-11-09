// src/lib/ai/skills/workers/execution-approval.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const executionApprovalSkill: RuntimeSkill = {
  id: 'worker_execution',
  name: 'Transactional Execution & Approval Enforcement',
  version: '1.0.0',
  owner: 'workforce-governance',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_execution'],
  description:
    'Executes founder-approved business mutations with cryptographic token verification, payload hashing, and atomic rollback protections.',
  explicitNonCapabilities: [
    'Cannot execute any mutation without a valid, unexpired, signed founder approval token.',
    'Cannot bypass payload hash matching (zero-tolerance for altered parameters).',
    'Cannot replay previously executed approval tokens (nonce reuse strictly blocked).',
  ],
  allowedTools: [
    'execute_approved_action',
    'execute_action_plan',
    'update_inventory_stock',
    'execute_approved_payload',
    'verify_approval_nonce',
    'record_execution_receipt',
  ],
  requiredDataSources: [
    'authoritative_db:approvals',
    'authoritative_db:action_plans',
    'execution_ledger',
  ],
  requiredInputs: ['approval_token', 'plan_or_action_id'],
  outputSchema: {
    executionId: 'string',
    status: 'executed | failed | rejected',
    receiptHash: 'string',
    sideEffectVerified: 'boolean',
  },
  evidenceRequirements: [
    'Must record tamper-evident execution receipt with timestamp and executing admin ID.',
  ],
  safetyRules: [
    'Fail closed if token signature, nonce, or payload hash does not match.',
    'Idempotency keys must be enforced at the database boundary.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'critical',
    riskCategory: 'external_side_effect',
    mutationVerbs: [
      'execute_approved_action',
      'execute_action_plan',
      'update_inventory_stock',
    ],
  },
  budget: {
    timeoutSeconds: 30,
    maxTokens: 2500,
  },
  failureStates: ['unavailable', 'partial', 'verified'],
  instructions: `EXECUTION & APPROVAL GOVERNANCE:
1. Verify the approval token before invoking any mutation.
2. Confirm the payload hash matches the exact proposal approved by the founder.
3. Emit a signed execution receipt upon completion for the monitoring worker to verify.`,
};
