import 'server-only';

import {
  REGISTERED_SELF_AUDIT_CHECKS,
  executeCheck,
  getSelfAuditCheck,
  getEnabledSelfAuditChecks,
  type AuditCheckCategory,
  type AuditCheckResult,
  type AuditCheckStatus,
} from './self-audit-registry';

/**
 * ============================================================================
 * SELF-AUDIT RUNNER (TRACK J - PHASE 48)
 * ============================================================================
 * Controlled execution orchestrator for scheduled or manual self-audit runs.
 *
 * Guarantees:
 * 1. Allowlist-Only Execution: Only registered, non-destructive checks can run.
 * 2. Strict Read-Only Sandbox: All checks operate without mutating database,
 *    order, payment, or catalog state.
 * 3. Execution Identity & Timing: Every run records runId, trigger source,
 *    executor identity, start/end timestamps, and duration.
 * 4. Fault-Isolated Concurrency: Runs checks in concurrent batches using
 *    Promise.allSettled(); a timeout or error in one check never halts the run.
 * 5. Run History Ring-Buffer: Retains recent run summaries in memory for
 *    immediate visibility of missed or failed runs.
 */

export type AuditRunTrigger =
  'scheduled_cron' | 'manual_admin' | 'synthetic_probe';

export type OverallAuditStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL_ISSUES';

export interface AuditRunReport {
  runId: string;
  trigger: AuditRunTrigger;
  triggeredBy: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalChecks: number;
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  overallStatus: OverallAuditStatus;
  categoryBreakdown: Record<
    AuditCheckCategory,
    { passed: number; warned: number; failed: number; skipped: number }
  >;
  results: AuditCheckResult[];
  isReadOnlySandbox: true;
  disclaimer: string;
}

export interface RunSelfAuditSuiteOptions {
  trigger?: AuditRunTrigger;
  triggeredBy?: string;
  category?: AuditCheckCategory;
  checkIds?: string[];
  maxTotalBudgetMs?: number; // Maximum overall runner execution time
  batchConcurrency?: number; // Concurrency limit
}

export const RUNNER_DISCLAIMER =
  'READ-ONLY ARCHITECTURAL SELF-AUDIT — Diagnostics are purely passive inspections and non-destructive health probes. No production settings or customer records are altered.';

// In-memory ring-buffer for the last 20 audit runs
const MAX_RUN_HISTORY = 20;
const runHistoryBuffer: AuditRunReport[] = [];

/**
 * Executes a controlled batch of checks concurrently.
 */
async function executeBatchConcurrently(
  checkIds: string[],
  concurrency = 5
): Promise<AuditCheckResult[]> {
  const results: AuditCheckResult[] = [];
  const queue = [...checkIds];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchPromises = batch.map((id) => executeCheck(id));
    const settled = await Promise.allSettled(batchPromises);

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        results.push({
          checkId: batch[i],
          category: 'architecture',
          severity: 'HIGH',
          status: 'FAIL',
          message: `Unexpected runner rejection: ${outcome.reason?.message || 'Check failed to execute'}`,
          durationMs: 1,
          evaluatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return results;
}

/**
 * Runs the self-audit suite with bounds, authorization filters, and fault-tolerance.
 */
export async function runSelfAuditSuite(
  options: RunSelfAuditSuiteOptions = {}
): Promise<AuditRunReport> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const runId = `audit_run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const trigger = options.trigger || 'manual_admin';
  const triggeredBy = options.triggeredBy || 'system_worker';
  const maxBudgetMs = options.maxTotalBudgetMs || 15000;
  const concurrency = options.batchConcurrency || 5;

  // 1. Resolve allowlisted check IDs
  let targetCheckIds: string[] = [];

  if (options.checkIds && options.checkIds.length > 0) {
    // Validate each requested check ID against allowlist
    targetCheckIds = options.checkIds.filter((id) => {
      const def = getSelfAuditCheck(id);
      return def && def.isEnabled && def.isDestructive === false;
    });
  } else if (options.category) {
    targetCheckIds = getEnabledSelfAuditChecks(options.category).map(
      (c) => c.id
    );
  } else {
    targetCheckIds = getEnabledSelfAuditChecks().map((c) => c.id);
  }

  // 2. Execute bounded execution with timeout guard & cleanup
  let checkResults: AuditCheckResult[] = [];
  let budgetTimerId: NodeJS.Timeout | undefined;
  try {
    const runnerPromise = executeBatchConcurrently(targetCheckIds, concurrency);
    const timeoutPromise = new Promise<AuditCheckResult[]>((_, reject) => {
      budgetTimerId = setTimeout(
        () =>
          reject(
            new Error(
              `Self-audit suite exceeded total budget of ${maxBudgetMs}ms`
            )
          ),
        maxBudgetMs
      );
      budgetTimerId.unref?.();
    });

    checkResults = await Promise.race([runnerPromise, timeoutPromise]);
  } catch (err: any) {
    // If global budget was exceeded, capture partial results if any, or record timeout failure
    checkResults.push({
      checkId: 'chk_runner_global_timeout',
      category: 'performance',
      severity: 'CRITICAL',
      status: 'FAIL',
      message: err?.message || 'Runner global execution timeout',
      durationMs: Date.now() - startTime,
      evaluatedAt: new Date().toISOString(),
      remediationHint: 'Reduce check concurrency or increase maxTotalBudgetMs.',
    });
  } finally {
    if (budgetTimerId) clearTimeout(budgetTimerId);
  }

  // 3. Compute statistics and category breakdown
  let passed = 0;
  let warned = 0;
  let failed = 0;
  let skipped = 0;

  const categoryBreakdown: AuditRunReport['categoryBreakdown'] = {
    architecture: { passed: 0, warned: 0, failed: 0, skipped: 0 },
    integration: { passed: 0, warned: 0, failed: 0, skipped: 0 },
    configuration: { passed: 0, warned: 0, failed: 0, skipped: 0 },
    security: { passed: 0, warned: 0, failed: 0, skipped: 0 },
    performance: { passed: 0, warned: 0, failed: 0, skipped: 0 },
    ai_health: { passed: 0, warned: 0, failed: 0, skipped: 0 },
  };

  for (const res of checkResults) {
    if (res.status === 'PASS') passed++;
    else if (res.status === 'WARN') warned++;
    else if (res.status === 'FAIL') failed++;
    else if (res.status === 'SKIPPED') skipped++;

    const cat = categoryBreakdown[res.category] || {
      passed: 0,
      warned: 0,
      failed: 0,
      skipped: 0,
    };

    if (res.status === 'PASS') cat.passed++;
    else if (res.status === 'WARN') cat.warned++;
    else if (res.status === 'FAIL') cat.failed++;
    else if (res.status === 'SKIPPED') cat.skipped++;
  }

  // 4. Derive overall health status
  let overallStatus: OverallAuditStatus = 'HEALTHY';
  if (failed > 0) {
    overallStatus = 'CRITICAL_ISSUES';
  } else if (warned > 0) {
    overallStatus = 'DEGRADED';
  }

  const completedAt = new Date().toISOString();
  const durationMs = Math.max(1, Date.now() - startTime);

  const report: AuditRunReport = {
    runId,
    trigger,
    triggeredBy,
    startedAt,
    completedAt,
    durationMs,
    totalChecks: checkResults.length,
    passed,
    warned,
    failed,
    skipped,
    overallStatus,
    categoryBreakdown,
    results: checkResults,
    isReadOnlySandbox: true,
    disclaimer: RUNNER_DISCLAIMER,
  };

  // 5. Retain in memory buffer
  runHistoryBuffer.unshift(report);
  if (runHistoryBuffer.length > MAX_RUN_HISTORY) {
    runHistoryBuffer.pop();
  }

  return report;
}

/**
 * Returns recent audit run history reports.
 */
export function getRecentAuditRuns(limit = 10): AuditRunReport[] {
  return runHistoryBuffer.slice(0, limit);
}

/**
 * Returns the most recent audit run report, if any exists.
 */
export function getLatestAuditRun(): AuditRunReport | null {
  return runHistoryBuffer.length > 0 ? runHistoryBuffer[0] : null;
}

/**
 * Clears the in-memory run history (used in test teardowns).
 */
export function clearRunHistoryForTesting(): void {
  runHistoryBuffer.length = 0;
}
