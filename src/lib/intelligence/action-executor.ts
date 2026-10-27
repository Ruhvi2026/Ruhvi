import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import {
  type ProposedCoFounderAction,
  type ActionPayloadSpec,
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
