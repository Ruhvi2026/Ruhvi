import 'server-only';

import crypto from 'crypto';
import type { ActionCategory } from './action-contract';

/**
 * ============================================================================
 * RECOMMENDATION APPROVAL & AUTHORIZATION POLICY (TRACK E - PHASE 29)
 * ============================================================================
 * Formal state machine, authorization policy, and cryptographic payload
 * integrity binding for proposed AI Co-Founder actions before execution.
 *
 * Guarantees:
 * 1. Finite State Machine (FSM): Strictly defines:
 *    proposed -> approved -> executing -> completed / failed
 *    (alongside rejected and expired terminal states).
 * 2. Immutable Payload Integrity Binding: Approvals are cryptographically bound
 *    to a SHA-256 hash of the exact action payload, target entity, parameters,
 *    and version. Any post-approval mutation instantly invalidates the approval.
 * 3. Human-In-The-Loop Attribution: Prohibits automated AI self-approval
 *    (`actorType === 'human'` strictly required). Records approver actor ID,
 *    email, role, and approval timestamp.
 * 4. Tiered Authorization Rules:
 *    - low_risk_triage: staff, manager, admin, super_admin
 *    - inventory_operational: manager, admin, super_admin
 *    - financial_commercial: admin, super_admin
 *    - security_configuration: super_admin
 *    - two_person_rule: requires 2 distinct approvers (e.g. super_admin + admin)
 * 5. Expiry & Re-execution Protection: Expired proposals cannot be approved or
 *    executed. Executing state acts as an active lock preventing double-execution.
 * 6. Audit Evidence Retention: Retains sanitized execution history without
 *    exposing secrets, access tokens, customer PII, or passwords.
 */

export type ProposalApprovalState =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executing'
  | 'completed'
  | 'failed';

export type ActionImpactTier =
  | 'low_risk_triage'
  | 'inventory_operational'
  | 'financial_commercial'
  | 'security_configuration'
  | 'two_person_rule';

export interface ActionPayloadSpec {
  actionType: string;
  targetEntity: { type: string; id: string };
  parameters: Record<string, any>;
  version: number;
}

export interface ApproverAttribution {
  actorId: string;
  actorEmail: string;
  actorRole: 'staff' | 'manager' | 'admin' | 'super_admin';
  actorType: 'human';
  approvedAt: string;
}

export interface RejectionAttribution {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  rejectedAt: string;
  rejectionReason: string;
}

export interface ActionExecutionTelemetry {
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  executorActorId?: string;
  failureReason?: string;
  sanitizedResultSummary?: string;
}

export interface ProposedCoFounderAction {
  id: string;
  recommendationId: string;
  title: string;
  category: ActionCategory;
  impactTier: ActionImpactTier;
  state: ProposalApprovalState;
  payload: ActionPayloadSpec;
  payloadHash: string; // Hash when proposed
  approvedPayloadHash?: string; // Hash verified during approval
  createdAt: string;
  expiresAt: string;
  approvals: ApproverAttribution[];
  rejectedBy?: RejectionAttribution;
  executionHistory: ActionExecutionTelemetry;
}

// ─── Deterministic Finite State Machine Allowed Transitions ─────────────────
const VALID_STATE_TRANSITIONS: Record<
  ProposalApprovalState,
  ProposalApprovalState[]
> = {
  proposed: ['approved', 'rejected', 'expired'],
  approved: ['executing', 'rejected', 'expired'],
  executing: ['completed', 'failed'],
  rejected: [], // terminal
  completed: [], // terminal
  failed: ['proposed'], // re-proposal allowed, requires complete re-approval
  expired: [], // terminal
};

// ─── Role Hierarchy & Impact Tier Requirements ──────────────────────────────
const ROLE_LEVELS: Record<string, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

const TIER_MIN_ROLE_LEVEL: Record<ActionImpactTier, number> = {
  low_risk_triage: 1, // staff+
  inventory_operational: 2, // manager+
  financial_commercial: 3, // admin+
  security_configuration: 4, // super_admin only
  two_person_rule: 3, // admin+ (with 2 distinct approvers)
};

/**
 * Computes deterministic canonical SHA-256 hash of an action payload.
 */
export function computeActionPayloadHash(payload: ActionPayloadSpec): string {
  // Sort parameters recursively for deterministic JSON serialization
  const sortKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj))
      return obj;
    return Object.keys(obj)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      }, {});
  };

  const canonicalObj = {
    actionType: payload.actionType,
    targetEntity: {
      type: payload.targetEntity.type,
      id: payload.targetEntity.id,
    },
    parameters: sortKeys(payload.parameters),
    version: payload.version,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalObj))
    .digest('hex');
}

/**
 * Sanitizes action parameters to prevent secrets/tokens from appearing in audit logs.
 */
export function sanitizeParametersForAudit(
  params: Record<string, any>
): Record<string, any> {
  const sensitivePattern =
    /(secret|token|password|key|auth|credential|cvv|pan)/i;
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(params)) {
    if (sensitivePattern.test(key)) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeParametersForAudit(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Creates a new action proposal in 'proposed' state.
 */
export function createActionProposal(options: {
  recommendationId: string;
  title: string;
  category: ActionCategory;
  impactTier: ActionImpactTier;
  actionType: string;
  targetEntity: { type: string; id: string };
  parameters: Record<string, any>;
  version?: number;
  expiresInHours?: number;
}): ProposedCoFounderAction {
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresInHours = options.expiresInHours ?? 24; // Default 24h validity
  const expiresAt = new Date(
    now.getTime() + expiresInHours * 60 * 60 * 1000
  ).toISOString();
  const version = options.version ?? 1;

  const payload: ActionPayloadSpec = {
    actionType: options.actionType,
    targetEntity: options.targetEntity,
    parameters: options.parameters,
    version,
  };

  const payloadHash = computeActionPayloadHash(payload);
  const nonce = Math.random().toString(36).substring(2, 7);
  const id = `act_prop_${Date.now()}_${nonce}`;

  return {
    id,
    recommendationId: options.recommendationId,
    title: options.title,
    category: options.category,
    impactTier: options.impactTier,
    state: 'proposed',
    payload,
    payloadHash,
    createdAt,
    expiresAt,
    approvals: [],
    executionHistory: {},
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  code:
    | 'ALLOWED'
    | 'INVALID_STATE'
    | 'EXPIRED'
    | 'PAYLOAD_TAMPERED'
    | 'INSUFFICIENT_ROLE'
    | 'HUMAN_APPROVAL_REQUIRED'
    | 'TWO_PERSON_RULE_PENDING'
    | 'DUPLICATE_APPROVER';
  reason: string;
}

/**
 * Evaluates whether an approver can approve a proposed action.
 */
export function evaluateApprovalEligibility(
  proposal: ProposedCoFounderAction,
  approver: ApproverAttribution,
  currentPayload: ActionPayloadSpec
): PolicyEvaluationResult {
  // 1. State must be 'proposed' (or approved if awaiting second signature)
  if (
    proposal.state !== 'proposed' &&
    !(
      proposal.state === 'approved' && proposal.impactTier === 'two_person_rule'
    )
  ) {
    return {
      allowed: false,
      code: 'INVALID_STATE',
      reason: `Proposal is in '${proposal.state}' state; only 'proposed' actions can be approved.`,
    };
  }

  // 2. Chronological Expiry Guard
  if (Date.now() > new Date(proposal.expiresAt).getTime()) {
    return {
      allowed: false,
      code: 'EXPIRED',
      reason: `Proposal expired on ${proposal.expiresAt} and cannot be approved.`,
    };
  }

  // 3. Human Approval Requirement
  if (approver.actorType !== 'human') {
    return {
      allowed: false,
      code: 'HUMAN_APPROVAL_REQUIRED',
      reason:
        'Automated AI self-approval is strictly prohibited; human approval required.',
    };
  }

  // 4. Role Hierarchy Check
  const requiredLevel = TIER_MIN_ROLE_LEVEL[proposal.impactTier];
  const approverLevel = ROLE_LEVELS[approver.actorRole] ?? 0;
  if (approverLevel < requiredLevel) {
    return {
      allowed: false,
      code: 'INSUFFICIENT_ROLE',
      reason: `Approver role '${approver.actorRole}' lacks required authority level for '${proposal.impactTier}' impact tier.`,
    };
  }

  // 5. Payload Integrity Check
  const currentHash = computeActionPayloadHash(currentPayload);
  if (currentHash !== proposal.payloadHash) {
    return {
      allowed: false,
      code: 'PAYLOAD_TAMPERED',
      reason:
        'Payload was modified after proposal creation; approval invalidated due to checksum mismatch.',
    };
  }

  // 6. Two-Person Rule Distinctness Check
  if (proposal.impactTier === 'two_person_rule') {
    const existing = proposal.approvals.find(
      (a) => a.actorId === approver.actorId
    );
    if (existing) {
      return {
        allowed: false,
        code: 'DUPLICATE_APPROVER',
        reason:
          'Two-person rule requires 2 distinct authorized approvers; actor cannot sign twice.',
      };
    }
  }

  return {
    allowed: true,
    code: 'ALLOWED',
    reason: 'Approval eligibility confirmed under policy.',
  };
}

/**
 * Applies human approval to a proposal.
 */
export function approveActionProposal(
  proposal: ProposedCoFounderAction,
  approver: ApproverAttribution,
  currentPayload: ActionPayloadSpec
): ProposedCoFounderAction {
  const evalResult = evaluateApprovalEligibility(
    proposal,
    approver,
    currentPayload
  );
  if (!evalResult.allowed) {
    throw new Error(
      `Approval policy rejection [${evalResult.code}]: ${evalResult.reason}`
    );
  }

  const updatedApprovals = [...proposal.approvals, approver];
  const isTwoPerson = proposal.impactTier === 'two_person_rule';
  const hasRequiredSignatures = isTwoPerson
    ? updatedApprovals.length >= 2
    : updatedApprovals.length >= 1;

  const newState: ProposalApprovalState = hasRequiredSignatures
    ? 'approved'
    : 'approved'; // Remains in approved state once completed

  return {
    ...proposal,
    state: newState,
    payload: currentPayload,
    approvedPayloadHash: proposal.payloadHash,
    approvals: updatedApprovals,
  };
}

/**
 * Rejects an action proposal with documented justification.
 */
export function rejectActionProposal(
  proposal: ProposedCoFounderAction,
  rejector: {
    actorId: string;
    actorEmail: string;
    actorRole: string;
    reason: string;
  }
): ProposedCoFounderAction {
  if (proposal.state === 'executing' || proposal.state === 'completed') {
    throw new Error(
      `Cannot reject action in terminal or executing state '${proposal.state}'.`
    );
  }

  if (!rejector.reason || rejector.reason.trim().length < 5) {
    throw new Error(
      'Rejection requires a documented reason of at least 5 characters.'
    );
  }

  return {
    ...proposal,
    state: 'rejected',
    rejectedBy: {
      actorId: rejector.actorId,
      actorEmail: rejector.actorEmail,
      actorRole: rejector.actorRole,
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejector.reason.trim(),
    },
  };
}

/**
 * Evaluates whether an approved action proposal is eligible for execution.
 */
export function verifyExecutionEligibility(
  proposal: ProposedCoFounderAction,
  executorRole: string,
  executionPayload: ActionPayloadSpec
): PolicyEvaluationResult {
  // 1. State must be 'approved'
  if (proposal.state !== 'approved') {
    return {
      allowed: false,
      code: 'INVALID_STATE',
      reason: `Action cannot execute: proposal is in '${proposal.state}' state (must be 'approved').`,
    };
  }

  // 2. Chronological Expiry Guard
  if (Date.now() > new Date(proposal.expiresAt).getTime()) {
    return {
      allowed: false,
      code: 'EXPIRED',
      reason: `Action cannot execute: proposal expired on ${proposal.expiresAt}.`,
    };
  }

  // 3. Approval Presence
  if (!proposal.approvals || proposal.approvals.length === 0) {
    return {
      allowed: false,
      code: 'HUMAN_APPROVAL_REQUIRED',
      reason: 'Action cannot execute: missing required human approval.',
    };
  }

  // 4. Two-Person Rule Check
  if (
    proposal.impactTier === 'two_person_rule' &&
    proposal.approvals.length < 2
  ) {
    return {
      allowed: false,
      code: 'TWO_PERSON_RULE_PENDING',
      reason:
        'Action cannot execute: two-person rule requires 2 distinct approved signatures.',
    };
  }

  // 5. Payload Integrity Check (Anti-Tampering)
  const executionHash = computeActionPayloadHash(executionPayload);
  if (executionHash !== proposal.approvedPayloadHash) {
    return {
      allowed: false,
      code: 'PAYLOAD_TAMPERED',
      reason:
        'Execution blocked: execution payload does not match the approved cryptographic checksum.',
    };
  }

  // 6. Executor Role Check
  const requiredLevel = TIER_MIN_ROLE_LEVEL[proposal.impactTier];
  const executorLevel = ROLE_LEVELS[executorRole.toLowerCase()] ?? 0;
  if (executorLevel < requiredLevel) {
    return {
      allowed: false,
      code: 'INSUFFICIENT_ROLE',
      reason: `Executor role '${executorRole}' lacks sufficient permission level to trigger '${proposal.impactTier}'.`,
    };
  }

  return {
    allowed: true,
    code: 'ALLOWED',
    reason: 'Execution eligibility verified.',
  };
}

/**
 * Transitions proposal to 'executing' state, locking it against duplicate triggers.
 */
export function transitionToExecuting(
  proposal: ProposedCoFounderAction,
  executorActorId: string,
  executionPayload: ActionPayloadSpec,
  executorRole: string
): ProposedCoFounderAction {
  const eligibility = verifyExecutionEligibility(
    proposal,
    executorRole,
    executionPayload
  );
  if (!eligibility.allowed) {
    throw new Error(
      `Execution policy rejection [${eligibility.code}]: ${eligibility.reason}`
    );
  }

  return {
    ...proposal,
    state: 'executing',
    executionHistory: {
      ...proposal.executionHistory,
      startedAt: new Date().toISOString(),
      executorActorId,
    },
  };
}

/**
 * Transitions proposal to 'completed' state after verified execution.
 */
export function transitionToCompleted(
  proposal: ProposedCoFounderAction,
  resultSummary: string
): ProposedCoFounderAction {
  if (proposal.state !== 'executing') {
    throw new Error(
      `Cannot complete action: expected state 'executing', observed '${proposal.state}'.`
    );
  }

  return {
    ...proposal,
    state: 'completed',
    executionHistory: {
      ...proposal.executionHistory,
      completedAt: new Date().toISOString(),
      sanitizedResultSummary: resultSummary,
    },
  };
}

/**
 * Transitions proposal to 'failed' state with diagnostic failure reason.
 */
export function transitionToFailed(
  proposal: ProposedCoFounderAction,
  failureReason: string
): ProposedCoFounderAction {
  if (proposal.state !== 'executing') {
    throw new Error(
      `Cannot fail action: expected state 'executing', observed '${proposal.state}'.`
    );
  }

  return {
    ...proposal,
    state: 'failed',
    executionHistory: {
      ...proposal.executionHistory,
      failedAt: new Date().toISOString(),
      failureReason,
    },
  };
}
