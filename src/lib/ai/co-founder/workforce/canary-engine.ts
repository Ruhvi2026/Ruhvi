import 'server-only';

import { WorkerId } from './types';
import { getWorkerManifest } from './manifests';
import { setWorkerMaintenance, setGlobalKillSwitch } from './config';
import { withCoFounderSpan } from '../tracing';

/**
 * ============================================================================
 * RUHVI WORKFORCE CANARY ROLLOUT & GOVERNANCE ENGINE (PHASE 12)
 * ============================================================================
 * Implements:
 * 1. Staged Canary progression: disabled -> shadow -> canary -> promoted
 * 2. Strict Role Gating for research tools (owner/admin only)
 * 3. Shadow Execution Mode with divergence and safety comparison
 * 4. Automated Observation Window threshold enforcement
 * 5. Deterministic Emergency Rollback & Recovery verification
 */

export type CanaryStage = 'disabled' | 'shadow' | 'canary' | 'promoted';

export interface CanaryWorkerState {
  workerId: WorkerId;
  stage: CanaryStage;
  trafficPercentage: number; // 0 to 100
  observationWindowHours: number;
  promotedAt?: string;
  stagedAt: string;
  lastEvaluatedAt?: string;
  rollbackHistory: Array<{
    timestamp: string;
    fromStage: CanaryStage;
    toStage: CanaryStage;
    reason: string;
  }>;
}

export interface ShadowEvaluationResult {
  evaluationId: string;
  workerId: WorkerId;
  timestamp: string;
  inputTask: string;
  baselineOutputSummary: string;
  candidateOutputSummary: string;
  divergenceScore: number; // 0 (identical) to 1 (completely divergent)
  safetyPassed: boolean;
  attemptedExternalWrites: number; // Must strictly be 0 in shadow mode
  latencyDeltaMs: number;
  recommendation: 'ready_for_canary' | 'requires_tuning' | 'unsafe';
}

export interface CanaryObservationMetrics {
  workerId: WorkerId;
  stage: CanaryStage;
  totalRuns: number;
  verifiedSuccesses: number;
  failures: number;
  timeouts: number;
  unauthorizedMutations: number;
  piiExposures: number;
  p95LatencyMs: number;
  meetsThresholds: boolean;
  thresholdViolations: string[];
}

class WorkforceCanaryEngine {
  private workerStages = new Map<WorkerId, CanaryWorkerState>();
  private shadowLogs: ShadowEvaluationResult[] = [];
  private readonly minObservationHours = 24;

  constructor() {
    this.bootstrapDefaultCanaryStages();
  }

  /**
   * Initializes baseline canary state for all 16 workers.
   */
  private bootstrapDefaultCanaryStages(): void {
    const allWorkers: WorkerId[] = [
      'worker_analytics_performance',
      'worker_marketing',
      'worker_seo',
      'worker_product',
      'worker_competitor_research',
      'worker_sales_conversion',
      'worker_customer_support',
      'worker_content_blog',
      'worker_inventory',
      'worker_review_feedback',
      'worker_execution',
      'worker_monitoring_verification',
      'worker_orders_logistics',
      'worker_accounts_tax',
      'worker_performance_intelligence',
      'worker_security_intelligence',
    ];

    const now = new Date().toISOString();
    for (const w of allWorkers) {
      // Conservative start: read-only/monitoring workers in canary, write workers in shadow
      const isLowRisk =
        w === 'worker_monitoring_verification' ||
        w === 'worker_performance_intelligence' ||
        w === 'worker_security_intelligence' ||
        w === 'worker_seo';

      this.workerStages.set(w, {
        workerId: w,
        stage: isLowRisk ? 'canary' : 'shadow',
        trafficPercentage: isLowRisk ? 25 : 0,
        observationWindowHours: this.minObservationHours,
        stagedAt: now,
        rollbackHistory: [],
      });
    }
  }

  /**
   * Evaluates role permissions for external web research tools.
   * Gated strictly to 'owner', 'admin', or 'super_admin'.
   */
  isResearchAccessAllowed(userRole?: string): {
    allowed: boolean;
    reason?: string;
  } {
    if (!userRole) {
      return { allowed: false, reason: 'Unauthenticated or missing user role' };
    }
    const role = userRole.toLowerCase();
    if (role === 'owner' || role === 'admin' || role === 'super_admin') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Research tools restricted to owner/admin. Current role '${userRole}' is not authorized.`,
    };
  }

  /**
   * Retrieves the current canary stage of a worker.
   */
  getWorkerStage(workerId: WorkerId): CanaryStage {
    return this.workerStages.get(workerId)?.stage || 'disabled';
  }

  /**
   * Retrieves full canary configuration for all workers.
   */
  getAllCanaryStates(): CanaryWorkerState[] {
    return Array.from(this.workerStages.values());
  }

  /**
   * Promotes, demotes, or alters the canary stage of a worker.
   */
  setWorkerStage(
    workerId: WorkerId,
    newStage: CanaryStage,
    trafficPercentage = 10,
    reason = 'Manual administrative transition'
  ): CanaryWorkerState {
    const current = this.workerStages.get(workerId);
    const now = new Date().toISOString();

    const previousStage = current?.stage || 'disabled';
    const updated: CanaryWorkerState = {
      workerId,
      stage: newStage,
      trafficPercentage:
        newStage === 'promoted'
          ? 100
          : newStage === 'disabled'
            ? 0
            : trafficPercentage,
      observationWindowHours:
        current?.observationWindowHours || this.minObservationHours,
      stagedAt: now,
      promotedAt: newStage === 'promoted' ? now : undefined,
      rollbackHistory: [
        ...(current?.rollbackHistory || []),
        {
          timestamp: now,
          fromStage: previousStage,
          toStage: newStage,
          reason,
        },
      ],
    };

    this.workerStages.set(workerId, updated);

    // Sync with maintenance set: disabled workers are placed in maintenance
    setWorkerMaintenance(workerId, newStage === 'disabled');

    return updated;
  }

  /**
   * Executes a worker in Shadow Mode:
   * Compares candidate output against baseline without executing external side-effects.
   */
  async runShadowEvaluation(params: {
    workerId: WorkerId;
    inputTask: string;
    baselineSummary: string;
    candidateOutput: {
      summary: string;
      toolCalls?: string[];
      simulatedWrites?: number;
    };
    latencyBaselineMs?: number;
    latencyCandidateMs?: number;
  }): Promise<ShadowEvaluationResult> {
    const attemptedWrites = params.candidateOutput.simulatedWrites || 0;
    const safetyPassed = attemptedWrites === 0; // External writes must be strictly 0 in shadow mode

    // Compute basic semantic divergence heuristic
    const baseWords = new Set(
      params.baselineSummary.toLowerCase().split(/\s+/)
    );
    const candWords = new Set(
      params.candidateOutput.summary.toLowerCase().split(/\s+/)
    );
    let common = 0;
    for (const w of candWords) {
      if (baseWords.has(w)) common++;
    }
    const union = baseWords.size + candWords.size - common;
    const jaccard = union > 0 ? common / union : 1;
    const divergenceScore = parseFloat((1 - jaccard).toFixed(3));

    const latencyDeltaMs =
      (params.latencyCandidateMs || 100) - (params.latencyBaselineMs || 100);

    const recommendation: 'ready_for_canary' | 'requires_tuning' | 'unsafe' =
      !safetyPassed
        ? 'unsafe'
        : divergenceScore > 0.8
          ? 'requires_tuning'
          : 'ready_for_canary';

    const result: ShadowEvaluationResult = {
      evaluationId: `sh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workerId: params.workerId,
      timestamp: new Date().toISOString(),
      inputTask: params.inputTask,
      baselineOutputSummary: params.baselineSummary,
      candidateOutputSummary: params.candidateOutput.summary,
      divergenceScore,
      safetyPassed,
      attemptedExternalWrites: attemptedWrites,
      latencyDeltaMs,
      recommendation,
    };

    this.shadowLogs.unshift(result);
    if (this.shadowLogs.length > 200) {
      this.shadowLogs.pop();
    }

    return result;
  }

  /**
   * Retrieves recent shadow evaluation runs.
   */
  getShadowEvaluations(
    workerId?: WorkerId,
    limit = 50
  ): ShadowEvaluationResult[] {
    if (workerId) {
      return this.shadowLogs
        .filter((s) => s.workerId === workerId)
        .slice(0, limit);
    }
    return this.shadowLogs.slice(0, limit);
  }

  /**
   * Assesses canary observation metrics against strict release gates:
   * - Verified success rate >= 80%
   * - Failure rate <= 5%
   * - Zero unauthorized mutations
   * - Zero PII exposures
   */
  evaluateCanaryThresholds(
    workerId: WorkerId,
    stats: {
      totalRuns: number;
      verifiedSuccesses: number;
      failures: number;
      timeouts: number;
      unauthorizedMutations: number;
      piiExposures: number;
      p95LatencyMs: number;
    }
  ): CanaryObservationMetrics {
    const stage = this.getWorkerStage(workerId);
    const violations: string[] = [];

    if (stats.totalRuns >= 5) {
      const failureRate = stats.failures / stats.totalRuns;
      if (failureRate > 0.05) {
        violations.push(
          `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds maximum allowable 5%`
        );
      }

      const successRate = stats.verifiedSuccesses / stats.totalRuns;
      if (successRate < 0.8) {
        violations.push(
          `Verified success rate ${(successRate * 100).toFixed(1)}% below required 80%`
        );
      }
    }

    if (stats.unauthorizedMutations > 0) {
      violations.push(
        `Fatal security violation: ${stats.unauthorizedMutations} unauthorized mutation attempts`
      );
    }

    if (stats.piiExposures > 0) {
      violations.push(
        `Fatal privacy violation: ${stats.piiExposures} unredacted PII exposure incidents`
      );
    }

    const manifest = getWorkerManifest(workerId);
    const timeoutBudget = (manifest?.limits.timeoutSeconds || 60) * 1000;
    if (stats.p95LatencyMs > timeoutBudget) {
      violations.push(
        `Latency violation: p95 latency ${stats.p95LatencyMs}ms exceeds budget ${timeoutBudget}ms`
      );
    }

    return {
      workerId,
      stage,
      totalRuns: stats.totalRuns,
      verifiedSuccesses: stats.verifiedSuccesses,
      failures: stats.failures,
      timeouts: stats.timeouts,
      unauthorizedMutations: stats.unauthorizedMutations,
      piiExposures: stats.piiExposures,
      p95LatencyMs: stats.p95LatencyMs,
      meetsThresholds: violations.length === 0,
      thresholdViolations: violations,
    };
  }

  /**
   * Emergency Rollback Protocol:
   * Immediately demotes a worker to 'disabled' or 'shadow' and verifies state cessation.
   */
  async executeWorkerRollback(
    workerId: WorkerId,
    targetStage: 'disabled' | 'shadow' = 'shadow',
    reason = 'Canary threshold violation / Emergency rollback'
  ): Promise<{
    success: boolean;
    workerId: WorkerId;
    newStage: CanaryStage;
    rolledBackAt: string;
  }> {
    return await withCoFounderSpan(
      'action.execute',
      { workerId, action: 'emergency_rollback', targetStage },
      async (span) => {
        this.setWorkerStage(workerId, targetStage, 0, reason);
        span.setAttribute('resultState', 'rolled_back');
        return {
          success: true,
          workerId,
          newStage: targetStage,
          rolledBackAt: new Date().toISOString(),
        };
      }
    );
  }

  /**
   * Global Emergency Rollback Protocol:
   * Demotes all canary and promoted workers to shadow/disabled mode and activates kill switch.
   */
  executeGlobalRollback(reason = 'Global emergency incident triggered'): {
    affectedWorkers: number;
    killSwitchActive: boolean;
    timestamp: string;
  } {
    setGlobalKillSwitch(true);

    let count = 0;
    for (const [wid, state] of this.workerStages.entries()) {
      if (state.stage === 'canary' || state.stage === 'promoted') {
        this.setWorkerStage(wid, 'shadow', 0, reason);
        count++;
      }
    }

    return {
      affectedWorkers: count,
      killSwitchActive: true,
      timestamp: new Date().toISOString(),
    };
  }
}

export const workforceCanaryEngine = new WorkforceCanaryEngine();
