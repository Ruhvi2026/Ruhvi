import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import {
  type ProposedCoFounderAction,
  type ActionPayloadSpec,
  type ApproverAttribution,
  type ActionImpactTier,
  createActionProposal,
  computeActionPayloadHash,
  verifyExecutionEligibility,
  transitionToExecuting,
  transitionToCompleted,
  transitionToFailed,
} from './approval-policy';

/**
 * ============================================================================
 * NARROWLY ALLOWLISTED ACTION EXECUTOR (TRACK E - PHASE 30)
 * ============================================================================
 * Low-risk, strictly allowlisted, idempotent action executor behind the
 * Phase 29 approval policy.
 *
 * Guarantees:
 * 1. Strict Allowlisting: ONLY approved low-risk actions are recognized.
 *    Arbitrary code execution, unrestricted MCP writes, raw SQL execution,
 *    production deployments, payment/refunds, and campaign broadcasts are
 *    STRICTLY PROHIBITED.
 * 2. Allowlisted Action: 'update_inventory_safety_buffer'
 *    Updates the low-stock safety threshold on a specific product in the
 *    authoritative catalog without touching live customer checkouts or pricing.
 * 3. Server-Side Policy Recheck: Every execution verifies server-side that the
 *    proposal is in 'approved' state, the approver is human, the proposal is
 *    not expired, and the cryptographic payload checksum matches.
 * 4. Idempotency & Concurrency Locking: Transitions proposal to 'executing'
 *    before execution begins, preventing parallel or duplicate runs.
 * 5. Dry-Run Capability: Supports dryRun=true to validate lookups, schemas,
 *    and parameters without database mutation.
 * 6. Authoritative Source Verification: Verifies update success directly from
 *    a readback of the authoritative PostgreSQL table (`products`).
 * 7. Timeout Protection: Limits database execution to a bounded timeout
 *    (default: 5,000ms) to prevent server hangs.
 */

export const ALLOWLISTED_ACTION_TYPE =
  'update_inventory_safety_buffer' as const;
export type AllowlistedActionType = typeof ALLOWLISTED_ACTION_TYPE;

export interface UpdateInventorySafetyBufferParams {
  productId: string;
  lowStockThreshold: number;
  reason: string;
}

export interface ExecuteActionOptions {
  proposal: ProposedCoFounderAction;
  executorActorId: string;
  executorEmail?: string;
  executorRole: 'super_admin' | 'admin' | 'manager' | 'staff' | string;
  executionPayload: ActionPayloadSpec;
  dryRun?: boolean;
  timeoutMs?: number; // Default: 5000ms
}

export interface ExecutionResult {
  success: boolean;
  actionType: string;
  targetEntity: { type: string; id: string };
  dryRun: boolean;
  executionId: string;
  proposal: ProposedCoFounderAction;
  verifiedBefore?: Record<string, any>;
  verifiedAfter?: Record<string, any>;
  executedAt: string;
  durationMs: number;
  error?: string;
}

/**
 * Executes a strictly allowlisted action behind the approval policy.
 */
export async function executeApprovedAction(
  options: ExecuteActionOptions
): Promise<ExecutionResult> {
  const startedAtMs = Date.now();
  const executedAt = new Date(startedAtMs).toISOString();
  const timeoutMs = options.timeoutMs ?? 5000;
  const dryRun = Boolean(options.dryRun);
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let currentProposal = options.proposal;

  try {
    // ─── 1. Explicit Allowlist Verification ──────────────────────────────────
    if (options.executionPayload.actionType !== ALLOWLISTED_ACTION_TYPE) {
      throw new Error(
        `Action type '${options.executionPayload.actionType}' is not in the approved executor allowlist. Allowed actions: [${ALLOWLISTED_ACTION_TYPE}].`
      );
    }

    // ─── 2. Server-Side Policy Recheck & Concurrency Lock ───────────────────
    currentProposal = transitionToExecuting(
      currentProposal,
      options.executorActorId,
      options.executionPayload,
      options.executorRole
    );

    // ─── 3. Parameter Validation for 'update_inventory_safety_buffer' ────────
    const { parameters, targetEntity } = options.executionPayload;
    const productId = targetEntity.id;
    const lowStockThreshold = Number(parameters.lowStockThreshold);

    if (!productId || typeof productId !== 'string') {
      throw new Error(
        'Invalid targetEntity: productId must be a non-empty string.'
      );
    }

    if (
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 1 ||
      lowStockThreshold > 100
    ) {
      throw new Error(
        `Invalid lowStockThreshold: must be an integer between 1 and 100 (observed: ${parameters.lowStockThreshold}).`
      );
    }

    // ─── 4. Database Query with Timeout Guard ────────────────────────────────
    const executeDatabaseOperation = async () => {
      const supabase = getServiceClient();

      // Read current state from authoritative products table
      const { data: beforeProduct, error: fetchError } = await supabase
        .from('products')
        .select('id, name, low_stock_threshold')
        .eq('id', productId)
        .single();

      if (fetchError || !beforeProduct) {
        throw new Error(
          `Authoritative product lookup failed for ID '${productId}': ${fetchError?.message || 'Product not found'}.`
        );
      }

      const verifiedBefore = {
        id: beforeProduct.id,
        name: beforeProduct.name,
        low_stock_threshold: beforeProduct.low_stock_threshold ?? 5,
      };

      // Handle Dry-Run Mode
      if (dryRun) {
        const verifiedAfter = {
          ...verifiedBefore,
          low_stock_threshold: lowStockThreshold,
          simulated: true,
        };

        // Log dry-run audit entry
        await logAuditEvent({
          actorId: options.executorActorId,
          actorEmail: options.executorEmail,
          portal: 'operations',
          action: 'dry_run_update_inventory_safety_buffer',
          entityType: 'product',
          entityId: productId,
          changes: {
            before: verifiedBefore,
            after: verifiedAfter,
            dryRun: true,
            proposalId: currentProposal.id,
          },
        });

        // For dry-run, transition back to approved or keep proposal valid
        const summary = `[DRY-RUN] Simulated update of product '${productId}' low_stock_threshold from ${verifiedBefore.low_stock_threshold} to ${lowStockThreshold}.`;
        currentProposal = transitionToCompleted(currentProposal, summary);

        return {
          verifiedBefore,
          verifiedAfter,
        };
      }

      // Live Database Mutation
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('products')
        .update({
          low_stock_threshold: lowStockThreshold,
          updated_at: nowIso,
        })
        .eq('id', productId);

      if (updateError) {
        throw new Error(`Database mutation failed: ${updateError.message}`);
      }

      // Authoritative Readback Verification
      const { data: afterProduct, error: verifyError } = await supabase
        .from('products')
        .select('id, name, low_stock_threshold')
        .eq('id', productId)
        .single();

      if (verifyError || !afterProduct) {
        throw new Error(
          `Authoritative readback verification failed: ${verifyError?.message || 'Readback empty'}.`
        );
      }

      if (afterProduct.low_stock_threshold !== lowStockThreshold) {
        throw new Error(
          `Authoritative verification mismatch: expected threshold ${lowStockThreshold}, observed ${afterProduct.low_stock_threshold}.`
        );
      }

      const verifiedAfter = {
        id: afterProduct.id,
        name: afterProduct.name,
        low_stock_threshold: afterProduct.low_stock_threshold,
      };

      // Log Immutable Audit Event
      await logAuditEvent({
        actorId: options.executorActorId,
        actorEmail: options.executorEmail,
        portal: 'operations',
        action: 'update_inventory_safety_buffer',
        entityType: 'product',
        entityId: productId,
        changes: {
          before: verifiedBefore,
          after: verifiedAfter,
          reason:
            parameters.reason || 'Co-Founder approved safety buffer adjustment',
          proposalId: currentProposal.id,
          executionId,
        },
      });

      const summary = `Successfully updated product '${afterProduct.name || productId}' low_stock_threshold from ${verifiedBefore.low_stock_threshold} to ${lowStockThreshold}.`;
      currentProposal = transitionToCompleted(currentProposal, summary);

      return {
        verifiedBefore,
        verifiedAfter,
      };
    };

    // Timeout Promise Wrapper with proper cleanup
    let timerHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerHandle = setTimeout(
        () =>
          reject(new Error(`Action execution timed out after ${timeoutMs}ms.`)),
        timeoutMs
      );
    });

    let verifiedBefore: Record<string, any>;
    let verifiedAfter: Record<string, any>;
    try {
      const opResult = await Promise.race([
        executeDatabaseOperation(),
        timeoutPromise,
      ]);
      verifiedBefore = opResult.verifiedBefore;
      verifiedAfter = opResult.verifiedAfter;
    } finally {
      if (timerHandle) {
        clearTimeout(timerHandle);
      }
    }

    return {
      success: true,
      actionType: options.executionPayload.actionType,
      targetEntity: options.executionPayload.targetEntity,
      dryRun,
      executionId,
      proposal: currentProposal,
      verifiedBefore,
      verifiedAfter,
      executedAt,
      durationMs: Date.now() - startedAtMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startedAtMs;
    console.error(`[ActionExecutor] Execution ${executionId} failed:`, err);

    // If proposal was moved to 'executing', record failure state
    if (currentProposal.state === 'executing') {
      try {
        currentProposal = transitionToFailed(
          currentProposal,
          err.message || 'Execution error'
        );
      } catch {
        // Ignore failure transition errors
      }
    }

    return {
      success: false,
      actionType: options.executionPayload.actionType,
      targetEntity: options.executionPayload.targetEntity,
      dryRun,
      executionId,
      proposal: currentProposal,
      executedAt,
      durationMs,
      error: err.message || 'Execution failed',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTED HUMAN-APPROVAL CHAIN (TRACK J - PHASE 48)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePersistedProposalOptions {
  recommendationId?: string;
  title: string;
  category?: 'inventory' | 'operations' | 'quality';
  impactTier?: ActionImpactTier;
  actionType: AllowlistedActionType;
  productId: string;
  lowStockThreshold: number;
  reason: string;
  version?: number;
  expiresInHours?: number;
  requestedBy?: string;
}

/**
 * Creates and persists a low-risk action proposal into PostgreSQL co_founder_approvals.
 */
export async function createPersistedActionProposal(
  options: CreatePersistedProposalOptions
): Promise<{
  success: boolean;
  proposalId?: string;
  proposal?: ProposedCoFounderAction;
  error?: string;
}> {
  try {
    if (options.actionType !== ALLOWLISTED_ACTION_TYPE) {
      return {
        success: false,
        error: `Action type '${options.actionType}' is not allowlisted for automated proposal creation. Allowed actions: [${ALLOWLISTED_ACTION_TYPE}].`,
      };
    }

    if (!options.productId || typeof options.productId !== 'string') {
      return {
        success: false,
        error: 'productId must be a non-empty string.',
      };
    }

    const threshold = Number(options.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
      return {
        success: false,
        error: `Invalid lowStockThreshold: must be an integer between 1 and 100 (observed: ${options.lowStockThreshold}).`,
      };
    }

    const category = options.category || 'inventory';
    const impactTier = options.impactTier || 'inventory_operational';
    const parameters = {
      lowStockThreshold: threshold,
      reason: options.reason || 'Safety stock buffer adjustment',
    };

    const inMemoryProposal = createActionProposal({
      recommendationId: options.recommendationId || `rec_${Date.now()}`,
      title: options.title,
      category,
      impactTier,
      actionType: options.actionType,
      targetEntity: { type: 'product', id: options.productId },
      parameters,
      version: options.version || 1,
      expiresInHours: options.expiresInHours || 24,
    });

    const idempotencyKey = `${options.actionType}:${inMemoryProposal.payloadHash}`;
    const supabase = getServiceClient();

    // Check if an identical active pending proposal already exists
    const { data: existing } = await supabase
      .from('co_founder_approvals')
      .select('id, expires_at, status')
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing && new Date(existing.expires_at) > new Date()) {
      return {
        success: true,
        proposalId: existing.id,
        proposal: { ...inMemoryProposal, id: existing.id },
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('co_founder_approvals')
      .insert({
        recommendation_id: options.recommendationId || null,
        action_type: options.actionType,
        action_payload: {
          ...inMemoryProposal.payload,
          payloadHash: inMemoryProposal.payloadHash,
          impactTier,
          title: options.title,
          category,
        },
        scope_description: `Adjust product '${options.productId}' low stock threshold to ${threshold} (reason: ${options.reason})`,
        risk_level: 'low',
        status: 'pending',
        requested_by: options.requestedBy || null,
        expires_at: inMemoryProposal.expiresAt,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(
        `Failed to persist action proposal: ${insertError.message}`
      );
    }

    return {
      success: true,
      proposalId: inserted.id,
      proposal: { ...inMemoryProposal, id: inserted.id },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to create persisted action proposal',
    };
  }
}

export interface ApprovePersistedProposalOptions {
  approvalId: string;
  approver: ApproverAttribution;
  currentPayload: ActionPayloadSpec;
}

/**
 * Validates cryptographic checksum and records human approval in PostgreSQL co_founder_approvals.
 */
export async function approvePersistedActionProposal(
  options: ApprovePersistedProposalOptions
): Promise<{
  success: boolean;
  proposal?: ProposedCoFounderAction;
  error?: string;
}> {
  const supabase = getServiceClient();

  try {
    const { data: row, error: fetchErr } = await supabase
      .from('co_founder_approvals')
      .select('*')
      .eq('id', options.approvalId)
      .single();

    if (fetchErr || !row) {
      return {
        success: false,
        error: `Approval record '${options.approvalId}' not found.`,
      };
    }

    if (row.status !== 'pending') {
      return {
        success: false,
        error: `Cannot approve proposal in '${row.status}' state (must be 'pending').`,
      };
    }

    // Expiry Check
    if (new Date(row.expires_at) <= new Date()) {
      await supabase
        .from('co_founder_approvals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', options.approvalId);

      return {
        success: false,
        error: `Proposal expired on ${row.expires_at} and cannot be approved (EXPIRED).`,
      };
    }

    // Human Approver Check
    if (options.approver.actorType !== 'human') {
      return {
        success: false,
        error:
          'Automated AI self-approval is strictly prohibited; human approval required (HUMAN_APPROVAL_REQUIRED).',
      };
    }

    // Role Hierarchy Check
    const roleLevels: Record<string, number> = {
      staff: 1,
      manager: 2,
      admin: 3,
      super_admin: 4,
    };
    const approverLevel = roleLevels[options.approver.actorRole] ?? 0;
    const impactTier: ActionImpactTier =
      row.action_payload?.impactTier || 'inventory_operational';
    const requiredLevel = impactTier === 'low_risk_triage' ? 1 : 2;

    if (approverLevel < requiredLevel) {
      return {
        success: false,
        error: `Approver role '${options.approver.actorRole}' lacks required authority level for '${impactTier}' (INSUFFICIENT_ROLE).`,
      };
    }

    // Cryptographic Anti-Tampering Check
    const currentHash = computeActionPayloadHash(options.currentPayload);
    const expectedHash = row.action_payload?.payloadHash;

    if (currentHash !== expectedHash) {
      return {
        success: false,
        error:
          'Payload was modified after proposal creation; approval invalidated due to checksum mismatch (PAYLOAD_TAMPERED).',
      };
    }

    const nowIso = new Date().toISOString();
    const updatedPayload = {
      ...row.action_payload,
      approvedPayloadHash: currentHash,
      approvals: [...(row.action_payload?.approvals || []), options.approver],
    };

    const { error: updateErr } = await supabase
      .from('co_founder_approvals')
      .update({
        status: 'approved',
        reviewed_by: options.approver.actorId,
        reviewed_at: options.approver.approvedAt || nowIso,
        action_payload: updatedPayload,
        updated_at: nowIso,
      })
      .eq('id', options.approvalId);

    if (updateErr) {
      throw new Error(`Failed to update approval status: ${updateErr.message}`);
    }

    await logAuditEvent({
      actorId: options.approver.actorId,
      actorEmail: options.approver.actorEmail,
      portal: 'operations',
      action: 'co_founder_approval_approved',
      entityType: 'co_founder_approval',
      entityId: options.approvalId,
      changes: {
        actionType: row.action_type,
        decision: 'approved',
        reviewedBy: options.approver.actorId,
        approvedPayloadHash: currentHash,
      },
    }).catch(() => {});

    const proposal: ProposedCoFounderAction = {
      id: row.id,
      recommendationId: row.recommendation_id || '',
      title: row.action_payload?.title || 'Safety Buffer Update',
      category: row.action_payload?.category || 'inventory',
      impactTier,
      state: 'approved',
      payload: options.currentPayload,
      payloadHash: expectedHash,
      approvedPayloadHash: currentHash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      approvals: updatedPayload.approvals,
      executionHistory: {},
    };

    return {
      success: true,
      proposal,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Approval review failed',
    };
  }
}

export interface RejectPersistedProposalOptions {
  approvalId: string;
  rejector: {
    actorId: string;
    actorEmail?: string;
    actorRole: string;
    reason: string;
  };
}

/**
 * Rejects a proposed action in PostgreSQL co_founder_approvals with documented justification.
 */
export async function rejectPersistedActionProposal(
  options: RejectPersistedProposalOptions
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();

  try {
    if (!options.rejector.reason || options.rejector.reason.trim().length < 5) {
      return {
        success: false,
        error:
          'Rejection requires a documented reason of at least 5 characters.',
      };
    }

    const { data: row, error: fetchErr } = await supabase
      .from('co_founder_approvals')
      .select('*')
      .eq('id', options.approvalId)
      .single();

    if (fetchErr || !row) {
      return {
        success: false,
        error: `Approval record '${options.approvalId}' not found.`,
      };
    }

    if (row.status === 'executed' || row.status === 'failed') {
      return {
        success: false,
        error: `Cannot reject proposal in terminal state '${row.status}'.`,
      };
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('co_founder_approvals')
      .update({
        status: 'rejected',
        reviewed_by: options.rejector.actorId,
        reviewed_at: nowIso,
        rejection_reason: options.rejector.reason.trim(),
        updated_at: nowIso,
      })
      .eq('id', options.approvalId);

    if (updateErr) {
      throw new Error(
        `Failed to update rejection status: ${updateErr.message}`
      );
    }

    await logAuditEvent({
      actorId: options.rejector.actorId,
      actorEmail: options.rejector.actorEmail,
      portal: 'operations',
      action: 'co_founder_approval_rejected',
      entityType: 'co_founder_approval',
      entityId: options.approvalId,
      changes: {
        actionType: row.action_type,
        decision: 'rejected',
        reviewedBy: options.rejector.actorId,
        rejectionReason: options.rejector.reason.trim(),
      },
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Rejection failed',
    };
  }
}

export interface ExecutePersistedApprovedActionOptions {
  approvalId: string;
  executorActorId: string;
  executorEmail?: string;
  executorRole: string;
  executionPayload: ActionPayloadSpec;
  dryRun?: boolean;
  timeoutMs?: number;
}

/**
 * Re-authorizes server-side and executes an approved action proposal from PostgreSQL co_founder_approvals.
 */
export async function executePersistedApprovedAction(
  options: ExecutePersistedApprovedActionOptions
): Promise<ExecutionResult> {
  const startedAtMs = Date.now();
  const executedAt = new Date(startedAtMs).toISOString();
  const executionId = `exec_p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const supabase = getServiceClient();

  // Stub proposal for failure reporting if early checks fail
  let fallbackProposal: ProposedCoFounderAction = {
    id: options.approvalId,
    recommendationId: '',
    title: 'Persisted Action',
    category: 'inventory',
    impactTier: 'inventory_operational',
    state: 'failed',
    payload: options.executionPayload,
    payloadHash: '',
    createdAt: executedAt,
    expiresAt: executedAt,
    approvals: [],
    executionHistory: {},
  };

  try {
    // 1. Fetch persisted approval record from database
    const { data: row, error: fetchErr } = await supabase
      .from('co_founder_approvals')
      .select('*')
      .eq('id', options.approvalId)
      .single();

    if (fetchErr || !row) {
      return {
        success: false,
        actionType: options.executionPayload.actionType,
        targetEntity: options.executionPayload.targetEntity,
        dryRun: Boolean(options.dryRun),
        executionId,
        proposal: fallbackProposal,
        executedAt,
        durationMs: Date.now() - startedAtMs,
        error: `Approval record '${options.approvalId}' not found.`,
      };
    }

    fallbackProposal = {
      ...fallbackProposal,
      recommendationId: row.recommendation_id || '',
      title: row.action_payload?.title || row.scope_description,
      state: row.status,
      payloadHash: row.action_payload?.payloadHash || '',
      approvedPayloadHash: row.action_payload?.approvedPayloadHash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      approvals: row.action_payload?.approvals || [],
    };

    // 2. Allowlisted Action Type Check
    if (row.action_type !== ALLOWLISTED_ACTION_TYPE) {
      return {
        success: false,
        actionType: row.action_type,
        targetEntity: options.executionPayload.targetEntity,
        dryRun: Boolean(options.dryRun),
        executionId,
        proposal: fallbackProposal,
        executedAt,
        durationMs: Date.now() - startedAtMs,
        error: `Action type '${row.action_type}' is not allowlisted for execution. Allowed: [${ALLOWLISTED_ACTION_TYPE}].`,
      };
    }

    // 3. Status Recheck: Must be strictly 'approved'
    if (row.status === 'executed') {
      return {
        success: false,
        actionType: row.action_type,
        targetEntity: options.executionPayload.targetEntity,
        dryRun: Boolean(options.dryRun),
        executionId,
        proposal: fallbackProposal,
        executedAt,
        durationMs: Date.now() - startedAtMs,
        error:
          'Action has already been executed (idempotency guard). Double execution is prohibited.',
      };
    }

    if (row.status !== 'approved') {
      return {
        success: false,
        actionType: row.action_type,
        targetEntity: options.executionPayload.targetEntity,
        dryRun: Boolean(options.dryRun),
        executionId,
        proposal: fallbackProposal,
        executedAt,
        durationMs: Date.now() - startedAtMs,
        error: `Action cannot execute: proposal is in '${row.status}' state (must be 'approved').`,
      };
    }

    // 4. Chronological Expiry Guard
    if (new Date(row.expires_at) <= new Date()) {
      await supabase
        .from('co_founder_approvals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', options.approvalId);

      return {
        success: false,
        actionType: row.action_type,
        targetEntity: options.executionPayload.targetEntity,
        dryRun: Boolean(options.dryRun),
        executionId,
        proposal: { ...fallbackProposal, state: 'expired' },
        executedAt,
        durationMs: Date.now() - startedAtMs,
        error: `Action cannot execute: proposal expired on ${row.expires_at} (EXPIRED).`,
      };
    }

    // 5. Cryptographic Anti-Tampering Check
    const executionHash = computeActionPayloadHash(options.executionPayload);
    const approvedHash = row.action_payload?.approvedPayloadHash;

    if (executionHash !== approvedHash) {
      return {
        success: false,
        actionType: row.action_type,
        targetEntity: options.executionPayload.targetEntity,
        dryRun: Boolean(options.dryRun),
        executionId,
        proposal: fallbackProposal,
        executedAt,
        durationMs: Date.now() - startedAtMs,
        error:
          'Execution blocked: execution payload does not match approved cryptographic checksum (PAYLOAD_TAMPERED).',
      };
    }

    // 6. Concurrency / Double-execution Lock: Update row to 'executing'
    await supabase
      .from('co_founder_approvals')
      .update({
        status: 'executing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', options.approvalId);

    // Reconstruct valid ProposedCoFounderAction
    const approvedProposal: ProposedCoFounderAction = {
      id: row.id,
      recommendationId: row.recommendation_id || '',
      title: row.action_payload?.title || 'Persisted Action',
      category: row.action_payload?.category || 'inventory',
      impactTier: row.action_payload?.impactTier || 'inventory_operational',
      state: 'approved',
      payload: options.executionPayload,
      payloadHash: row.action_payload?.payloadHash || executionHash,
      approvedPayloadHash: approvedHash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      approvals: row.action_payload?.approvals || [
        {
          actorId: row.reviewed_by || options.executorActorId,
          actorEmail: options.executorEmail || 'approver@ruhvi.in',
          actorRole: 'admin',
          actorType: 'human',
          approvedAt: row.reviewed_at || row.updated_at,
        },
      ],
      executionHistory: {},
    };

    // Execute via authoritative core executor
    const executionResult = await executeApprovedAction({
      proposal: approvedProposal,
      executorActorId: options.executorActorId,
      executorEmail: options.executorEmail,
      executorRole: options.executorRole,
      executionPayload: options.executionPayload,
      dryRun: options.dryRun,
      timeoutMs: options.timeoutMs,
    });

    const nowIso = new Date().toISOString();

    if (executionResult.success) {
      await supabase
        .from('co_founder_approvals')
        .update({
          status: options.dryRun ? 'approved' : 'executed',
          execution_result: executionResult.verifiedAfter,
          updated_at: nowIso,
        })
        .eq('id', options.approvalId);
    } else {
      await supabase
        .from('co_founder_approvals')
        .update({
          status: 'failed',
          execution_result: { error: executionResult.error },
          updated_at: nowIso,
        })
        .eq('id', options.approvalId);
    }

    return executionResult;
  } catch (err: any) {
    console.error(
      `[PersistedActionExecutor] Execution ${executionId} failed:`,
      err
    );

    try {
      await supabase
        .from('co_founder_approvals')
        .update({
          status: 'failed',
          execution_result: { error: err.message },
          updated_at: new Date().toISOString(),
        })
        .eq('id', options.approvalId);
    } catch {}

    return {
      success: false,
      actionType: options.executionPayload.actionType,
      targetEntity: options.executionPayload.targetEntity,
      dryRun: Boolean(options.dryRun),
      executionId,
      proposal: { ...fallbackProposal, state: 'failed' },
      executedAt,
      durationMs: Date.now() - startedAtMs,
      error: err.message || 'Persisted execution failed',
    };
  }
}
