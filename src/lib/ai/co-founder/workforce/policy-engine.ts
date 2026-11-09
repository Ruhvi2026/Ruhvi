import 'server-only';

import { createHash } from 'crypto';
import {
  ActionRiskCategory,
  ApprovalBinding,
  AutonomousWorkerManifest,
  PolicyDecision,
  WorkerId,
} from './types';
import {
  assertWorkforceOperationAllowed,
  isGlobalKillSwitchActive,
  isWorkerActive,
} from './config';
import { getWorkerManifest } from './manifests';
import { getActionRiskCategory } from './action-registry';
import { distributedIdempotencyStore } from './idempotency';

export function computePayloadHash(payload: any): string {
  const normalized = JSON.stringify(payload, Object.keys(payload || {}).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

export class WorkforcePolicyEngine {
  /**
   * Classify risk category for a given tool or action name.
   * Uses authoritative ACTION_RISK_REGISTRY first.
   */
  classifyActionRisk(toolOrAction: string): ActionRiskCategory {
    const exact = getActionRiskCategory(toolOrAction);
    if (exact) return exact;

    const lower = toolOrAction.toLowerCase();

    if (
      lower.includes('delete') ||
      lower.includes('purge') ||
      lower.includes('cancel') ||
      lower.includes('drop')
    ) {
      return 'destructive';
    }

    if (
      lower.includes('payment') ||
      lower.includes('refund') ||
      lower.includes('payout') ||
      lower.includes('spend') ||
      lower.includes('ledger')
    ) {
      return 'financial';
    }

    if (
      lower.includes('publish') ||
      lower.includes('send_customer') ||
      lower.includes('rebook') ||
      lower.includes('update_price') ||
      lower.includes('adjust_stock')
    ) {
      return 'external_side_effect';
    }

    if (
      lower.includes('draft') ||
      lower.includes('task') ||
      lower.includes('report') ||
      lower.includes('checklist') ||
      lower.includes('receipt') ||
      lower.includes('checkpoint')
    ) {
      return 'internal_write';
    }

    // Default safe baseline: read-only analysis/query
    return 'read_only';
  }

  /**
   * Evaluates a requested action against worker manifest, autonomy tier, and governance rules.
   */
  evaluateAction(params: {
    workerId: WorkerId;
    toolName: string;
    payload?: Record<string, any>;
    approvalBinding?: ApprovalBinding;
    userId?: string;
  }): PolicyDecision {
    const {
      workerId,
      toolName,
      payload = {},
      approvalBinding,
      userId,
    } = params;

    // 1. Strict forbidden workforce operations check (repository write, deploy, etc.)
    assertWorkforceOperationAllowed(toolName);

    // 2. Global kill switch check
    if (isGlobalKillSwitchActive()) {
      return {
        decision: 'DENY',
        reason: 'Workforce global emergency kill switch is currently active.',
        riskCategory: 'destructive',
      };
    }

    // 3. Worker maintenance / active status check
    if (!isWorkerActive(workerId)) {
      return {
        decision: 'DENY',
        reason: `Worker '${workerId}' is currently disabled or in maintenance mode.`,
        riskCategory: 'read_only',
      };
    }

    // 4. Manifest lookup & tool allowlist check
    const manifest = getWorkerManifest(workerId);
    if (!manifest) {
      return {
        decision: 'DENY',
        reason: `Worker manifest not found for '${workerId}'.`,
        riskCategory: 'destructive',
      };
    }

    if (!manifest.allowedTools.includes(toolName)) {
      return {
        decision: 'DENY',
        reason: `Tool '${toolName}' is not permitted in worker '${workerId}' allowlist.`,
        riskCategory: 'destructive',
      };
    }

    // Phase 8: Explicit typed action registry check. Unknown actions default to DENY, never read_only.
    const registeredRisk = getActionRiskCategory(toolName);
    if (!registeredRisk) {
      return {
        decision: 'DENY',
        reason: `Unknown action '${toolName}' is not registered in ACTION_RISK_REGISTRY. Unknown actions default to DENY.`,
        riskCategory: 'destructive',
      };
    }

    const riskCategory = registeredRisk;

    // 5. Autonomy Tier Enforcement
    let requiresApproval = false;

    if (manifest.autonomyTier === 'T0') {
      requiresApproval = !(
        riskCategory === 'read_only' || riskCategory === 'internal_write'
      );
    } else if (manifest.autonomyTier === 'T1') {
      requiresApproval = riskCategory !== 'read_only';
    } else if (manifest.autonomyTier === 'T2') {
      requiresApproval = !(
        riskCategory === 'read_only' || riskCategory === 'internal_write'
      );
    } else if (manifest.autonomyTier === 'T3') {
      requiresApproval = true;
    }

    // If tier allows action directly without approval:
    if (!requiresApproval) {
      return {
        decision: 'ALLOW',
        reason: `${manifest.autonomyTier} permitted action '${toolName}' (${riskCategory}).`,
        riskCategory,
      };
    }

    // Action requires approval — check approval binding
    if (!approvalBinding) {
      return {
        decision: 'REQUIRE_APPROVAL',
        reason: `Action '${toolName}' (${riskCategory}) exceeds ${manifest.autonomyTier} autonomy. Exact owner approval required.`,
        riskCategory,
      };
    }

    // Validate Action Type Matching
    if (approvalBinding.actionType && approvalBinding.actionType !== toolName) {
      return {
        decision: 'DENY',
        reason: `Approval actionType '${approvalBinding.actionType}' does not match requested tool '${toolName}'.`,
        riskCategory,
      };
    }

    // Validate User / Actor Authorization
    if (
      userId &&
      approvalBinding.actor &&
      approvalBinding.actor !== userId &&
      (!approvalBinding.userId || approvalBinding.userId !== userId)
    ) {
      return {
        decision: 'DENY',
        reason: `Approval actor mismatch. Requester '${userId}' is not authorized to consume approval created for '${approvalBinding.actor}'.`,
        riskCategory,
      };
    }

    // Validate Worker Authorization
    if (approvalBinding.workerId && approvalBinding.workerId !== workerId) {
      return {
        decision: 'DENY',
        reason: `Approval worker mismatch. Bound to worker '${approvalBinding.workerId}', but requested by '${workerId}'.`,
        riskCategory,
      };
    }

    // Validate Approval Binding Expiry
    const now = new Date();
    const expiry = new Date(approvalBinding.expiresAt);
    if (now.getTime() > expiry.getTime()) {
      return {
        decision: 'DENY',
        reason: `Approval '${approvalBinding.approvalId}' has expired at ${approvalBinding.expiresAt}.`,
        riskCategory,
      };
    }

    // Validate Cryptographic Payload Hash Match
    const computedHash = computePayloadHash(payload);
    if (computedHash !== approvalBinding.payloadHash) {
      return {
        decision: 'DENY',
        reason: `Approval payload hash mismatch. Payload has been altered after approval.`,
        riskCategory,
      };
    }

    // Validate Cryptographic Nonce Replay Protection
    const nonce = approvalBinding.nonce || approvalBinding.consumedNonce;
    if (nonce && distributedIdempotencyStore.isNonceConsumed(nonce)) {
      return {
        decision: 'DENY',
        reason: `Approval nonce '${nonce}' has already been consumed (replay attack detected).`,
        riskCategory,
      };
    }

    // Record Nonce Consumption upon successful authorization
    if (nonce) {
      distributedIdempotencyStore.consumeNonce(
        nonce,
        approvalBinding.approvalId
      );
    }

    return {
      decision: 'ALLOW',
      reason: `Action '${toolName}' verified with valid owner approval '${approvalBinding.approvalId}'.`,
      riskCategory,
      approvalBinding,
    };
  }

  isNonceConsumed(nonce: string): boolean {
    return distributedIdempotencyStore.isNonceConsumed(nonce);
  }

  consumeNonce(nonce: string, approvalId: string): void {
    distributedIdempotencyStore.consumeNonce(nonce, approvalId);
  }

  reset(): void {
    distributedIdempotencyStore.reset();
  }

  /**
   * Calculates strict permission intersection between parent and child workers.
   * Child can NEVER obtain permissions broader than parent.
   */
  intersectDelegationPermissions(
    parentManifest: AutonomousWorkerManifest,
    childManifest: AutonomousWorkerManifest
  ): {
    effectiveTools: string[];
    effectiveReadScopes: string[];
    isAllowedDelegate: boolean;
  } {
    const isAllowedDelegate = parentManifest.allowedDelegates.includes(
      childManifest.workerId
    );

    const effectiveTools = childManifest.allowedTools.filter((t) =>
      parentManifest.allowedTools.includes(t)
    );

    const effectiveReadScopes = childManifest.readScopes.filter((s) =>
      parentManifest.readScopes.includes(s)
    );

    return {
      effectiveTools,
      effectiveReadScopes,
      isAllowedDelegate,
    };
  }
}

export const workforcePolicyEngine = new WorkforcePolicyEngine();
