import 'server-only';

import {
  createActionProposal,
  type ProposedCoFounderAction,
  type ActionImpactTier,
} from '@/lib/intelligence/approval-policy';
import {
  fromQaFailure,
  type UnifiedActionItem,
} from '@/lib/intelligence/action-contract';
import type { ProbeDiagnostic } from './health-probes';
import type { SyntheticTransactionResult } from './synthetic-transaction-service';

/**
 * ============================================================================
 * QA GUARDIAN TO ACTION CENTER BRIDGE (TRACK H - PHASE 42)
 * ============================================================================
 * Surfaces failing synthetic and QA checks as traceable, deduplicated
 * action proposals in the Unified Action Center.
 *
 * Guarantees:
 * 1. Strict Schema Alignment:
 *    - Produces authoritative ProposedCoFounderAction proposals with SHA-256
 *      payload integrity hashes and low_risk_triage impact tiers.
 *    - Emits UnifiedActionItem records for admin dashboard display.
 * 2. Deduplication Protection:
 *    - Prevents alert flooding by deduplicating failures for the same journey
 *      or probe within an active 24-hour window.
 * 3. Review-Only Advisory Guarantee:
 *    - Proposes investigation, alert acknowledgement, or staging quarantine.
 *    - NEVER automatically reverts deployments or executes destructive DB writes.
 * 4. Transparent Traceability:
 *    - Embeds links to execution run logs, observed HTTP codes, latencies,
 *      and affected routes.
 */

export interface QaFailurePayload {
  journeyId: string;
  journeyTitle: string;
  testName: string;
  failureMessage: string;
  affectedRoutes: string[];
  observedStatus?: number | string;
  latencyMs?: number;
  runLogLink?: string;
  executionId?: string;
}

export interface QaProposalResult {
  proposal: ProposedCoFounderAction;
  actionItem: UnifiedActionItem;
  isDeduplicated: boolean;
  deduplicationKey: string;
}

// In-memory active proposal deduplication registry
const activeQaProposals = new Map<
  string,
  { proposalId: string; createdAt: number; expiresAt: number }
>();

/**
 * Generates an Action Center proposal from a QA failure event.
 */
export function createQaActionProposal(
  failure: QaFailurePayload
): QaProposalResult {
  const now = Date.now();
  const deduplicationKey = `qa_${failure.journeyId}_${failure.testName.replace(/[^a-z0-9]/gi, '_')}`;

  // Check deduplication (active within 24 hours)
  const existing = activeQaProposals.get(deduplicationKey);
  if (existing && now < existing.expiresAt) {
    // Return existing proposal stub marked as deduplicated
    const stubProposal = createActionProposal({
      recommendationId: `qa_rec_${failure.journeyId}`,
      title: `[QA FAILURE] Investigation Required: ${failure.journeyTitle} (${failure.journeyId})`,
      category: 'quality',
      impactTier: 'low_risk_triage',
      actionType: 'investigate_qa_failure',
      targetEntity: { type: 'qa_journey', id: failure.journeyId },
      parameters: {
        journeyId: failure.journeyId,
        testName: failure.testName,
        failureMessage: failure.failureMessage,
        affectedRoutes: failure.affectedRoutes,
        runLogLink: failure.runLogLink || '/admin/system-alerts',
        deduplicatedFrom: existing.proposalId,
      },
    });

    const actionItem = fromQaFailure({
      id: existing.proposalId,
      testName: failure.testName,
      suite: failure.journeyTitle,
      failureMessage: failure.failureMessage,
      timestamp: new Date().toISOString(),
      severity: 'high',
      deepLink: failure.runLogLink || '/admin/system-alerts',
    });

    return {
      proposal: stubProposal,
      actionItem,
      isDeduplicated: true,
      deduplicationKey,
    };
  }

  // Security barrier failures require elevated impact tier
  const isSecurityBreach =
    failure.journeyId === 'J-STAFF-01' ||
    failure.testName.toLowerCase().includes('security');
  const impactTier: ActionImpactTier = isSecurityBreach
    ? 'security_configuration'
    : 'low_risk_triage';

  const proposal = createActionProposal({
    recommendationId: `qa_rec_${failure.journeyId}_${now}`,
    title: `[QA FAILURE] Investigation Required: ${failure.journeyTitle} (${failure.journeyId})`,
    category: 'quality',
    impactTier,
    actionType: 'investigate_qa_failure',
    targetEntity: { type: 'qa_journey', id: failure.journeyId },
    parameters: {
      journeyId: failure.journeyId,
      journeyTitle: failure.journeyTitle,
      testName: failure.testName,
      failureMessage: failure.failureMessage,
      affectedRoutes: failure.affectedRoutes,
      observedStatus: failure.observedStatus ?? 'FAIL',
      latencyMs: failure.latencyMs ?? 0,
      runLogLink: failure.runLogLink || '/admin/system-alerts',
      executionId: failure.executionId,
      suggestedRemediation:
        'Inspect failing endpoint logs, verify route deployment, and review recent code commits.',
      autoRollbackSuggested: false, // Strictly advisory
    },
    expiresInHours: 24,
  });

  // Record in deduplication map
  activeQaProposals.set(deduplicationKey, {
    proposalId: proposal.id,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  });

  const actionItem = fromQaFailure({
    id: proposal.id,
    testName: failure.testName,
    suite: failure.journeyTitle,
    failureMessage: failure.failureMessage,
    timestamp: proposal.createdAt,
    severity: isSecurityBreach ? 'critical' : 'high',
    deepLink: failure.runLogLink || '/admin/system-alerts',
  });

  return {
    proposal,
    actionItem,
    isDeduplicated: false,
    deduplicationKey,
  };
}

/**
 * Creates an Action Center proposal directly from a failing synthetic health probe.
 */
export function createProposalFromProbeDiagnostic(
  probe: ProbeDiagnostic,
  runLogLink?: string
): QaProposalResult | null {
  if (probe.status === 'PASS') {
    return null;
  }

  const isSecurity = probe.probeId === 'PROBE_ADMIN_BARRIER';

  return createQaActionProposal({
    journeyId: isSecurity ? 'J-STAFF-01' : 'J-GUEST-01',
    journeyTitle: isSecurity
      ? 'Admin Authentication & RBAC'
      : `Health Probe: ${probe.name}`,
    testName: `${probe.name} (${probe.probeId})`,
    failureMessage: probe.message,
    affectedRoutes: [probe.targetPath],
    observedStatus: probe.observedStatus,
    latencyMs: probe.latencyMs,
    runLogLink: runLogLink || '/api/qa/probes',
  });
}

/**
 * Creates an Action Center proposal from a failing synthetic transaction test.
 */
export function createProposalFromSyntheticTransaction(
  txn: SyntheticTransactionResult,
  runLogLink?: string
): QaProposalResult | null {
  if (txn.status === 'SUCCESS') {
    return null;
  }

  const failedStep = txn.stepLogs.find((s) => s.status === 'FAIL');

  return createQaActionProposal({
    journeyId: 'J-CUST-02',
    journeyTitle: 'Checkout, Coupon & Payment',
    testName: `Synthetic Transaction Execution (${txn.executionId})`,
    failureMessage:
      failedStep?.details ||
      'Synthetic order journey failed validation checks.',
    affectedRoutes: ['/cart', '/checkout', '/api/checkout'],
    executionId: txn.executionId,
    runLogLink: runLogLink || `/admin/system-alerts?exec=${txn.executionId}`,
  });
}

/**
 * Clears the deduplication cache (useful for testing or manual flush).
 */
export function clearQaProposalCache(): void {
  activeQaProposals.clear();
}
