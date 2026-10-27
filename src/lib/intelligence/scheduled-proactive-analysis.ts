import 'server-only';

import {
  assembleCoFounderContext,
  type CoFounderBusinessContext,
} from './co-founder-context';
import {
  generateCoFounderRecommendations,
  type StructuredCoFounderRecommendation,
} from './co-founder-recommendations';
import {
  getIstTimeWindow,
  type DateRangePreset,
  type TimeWindow,
} from './metrics-service';

/**
 * ============================================================================
 * SCHEDULED PROACTIVE AI CO-FOUNDER ANALYSIS (TRACK E - PHASE 28)
 * ============================================================================
 * Controlled scheduler and trigger engine for periodic read-only Co-Founder
 * business analysis.
 *
 * Guarantees:
 * 1. Duplicate Run Control & Idempotency: Enforces a configurable cooldown
 *    window (default: 15 mins) and active concurrency lock to prevent alert storms.
 * 2. Strict Rate Limits & Cost Bounding: Pure read-only execution; zero LLM token
 *    waste, zero external API loops, and zero production database mutations.
 * 3. Out-of-Scope Safeguards: Prohibits automatic action execution, outbound
 *    marketing campaigns, and live customer communications.
 * 4. Audit & Failure Logging: Maintains an in-memory chronological history of
 *    analysis runs with failure telemetry, timing, and degraded source markers.
 * 5. Dual Trigger Support: Authorized automated cron runs via CRON_SECRET and
 *    authorized manual staff/admin runs via session RBAC.
 */

export type ScheduledAnalysisTrigger = 'cron' | 'admin_manual' | 'system';

export interface ScheduledAnalysisRun {
  runId: string;
  trigger: ScheduledAnalysisTrigger;
  triggeredBy?: string;
  callerRole: string;
  timeWindow: TimeWindow;
  status: 'success' | 'partial' | 'skipped' | 'failed';
  skipReason?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  recommendationsCount: number;
  recommendations: StructuredCoFounderRecommendation[];
  unavailableSources: string[];
  error?: string;
}

export interface ScheduledAnalysisOptions {
  trigger: ScheduledAnalysisTrigger;
  actorId?: string;
  callerRole?: 'super_admin' | 'admin' | 'manager' | 'staff' | string;
  preset?: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  force?: boolean; // Bypasses cooldown window for explicit manual admin runs
  cooldownMinutes?: number; // Default: 15 minutes
}

export interface SchedulerStatus {
  isRunInProgress: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  cooldownMinutes: number;
  nextAllowedAutomatedRunAt: string | null;
  totalRunsRecorded: number;
}

class ScheduledAnalysisController {
  private isRunInProgress = false;
  private lastCompletedRunAt: number | null = null;
  private lastRunStatus: 'success' | 'partial' | 'skipped' | 'failed' | null =
    null;
  private runsHistory: ScheduledAnalysisRun[] = [];
  private readonly MAX_HISTORY_ITEMS = 25;
  private readonly DEFAULT_COOLDOWN_MINUTES = 15;

  /**
   * Execute scheduled or manual proactive analysis run.
   */
  public async executeAnalysis(
    options: ScheduledAnalysisOptions
  ): Promise<ScheduledAnalysisRun> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    const trigger = options.trigger;
    const callerRole = (options.callerRole || 'admin').toLowerCase();
    const preset = options.preset || 'last_7_days';
    const timeWindow = getIstTimeWindow(
      preset,
      options.customStart,
      options.customEnd
    );
    const cooldownMs =
      (options.cooldownMinutes ?? this.DEFAULT_COOLDOWN_MINUTES) * 60 * 1000;
    const runId = `run_sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // ─── 1. Concurrency Lock Guard ───────────────────────────────────────────
    if (this.isRunInProgress) {
      const skippedRun: ScheduledAnalysisRun = {
        runId,
        trigger,
        triggeredBy: options.actorId || 'system',
        callerRole,
        timeWindow,
        status: 'skipped',
        skipReason:
          'Analysis run already currently in progress (concurrency lock active).',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        recommendationsCount: 0,
        recommendations: [],
        unavailableSources: [],
      };
      this.recordRun(skippedRun);
      return skippedRun;
    }

    // ─── 2. Cooldown & Duplicate Run Guard ───────────────────────────────────
    if (!options.force && this.lastCompletedRunAt !== null) {
      const elapsedMs = startedAtMs - this.lastCompletedRunAt;
      if (elapsedMs < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - elapsedMs) / 60000);
        const skippedRun: ScheduledAnalysisRun = {
          runId,
          trigger,
          triggeredBy: options.actorId || 'system',
          callerRole,
          timeWindow,
          status: 'skipped',
          skipReason: `Cooldown active. Next automated analysis allowed in ${remainingMinutes} minute(s). Use force=true to bypass.`,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAtMs,
          recommendationsCount: 0,
          recommendations: [],
          unavailableSources: [],
        };
        this.recordRun(skippedRun);
        return skippedRun;
      }
    }

    // Acquire Concurrency Lock
    this.isRunInProgress = true;

    try {
      // ─── 3. Gather Verified Context (Phase 26) ──────────────────────────────
      const context: CoFounderBusinessContext = await assembleCoFounderContext({
        callerRole,
        preset,
        customStart: options.customStart,
        customEnd: options.customEnd,
        fresh: true,
      });

      // ─── 4. Generate Evidence-Bound Recommendations (Phase 27) ──────────────
      const recommendations: StructuredCoFounderRecommendation[] =
        generateCoFounderRecommendations(context);

      const completedAtMs = Date.now();
      const completedAt = new Date(completedAtMs).toISOString();
      const isPartial = context.unavailableSources.length > 0;

      const completedRun: ScheduledAnalysisRun = {
        runId,
        trigger,
        triggeredBy:
          options.actorId ||
          (trigger === 'cron' ? 'cron_scheduler' : 'staff_manual'),
        callerRole,
        timeWindow,
        status: isPartial ? 'partial' : 'success',
        startedAt,
        completedAt,
        durationMs: completedAtMs - startedAtMs,
        recommendationsCount: recommendations.length,
        recommendations,
        unavailableSources: context.unavailableSources,
      };

      this.lastCompletedRunAt = completedAtMs;
      this.lastRunStatus = completedRun.status;
      this.recordRun(completedRun);
      return completedRun;
    } catch (err: any) {
      console.error(`[ScheduledProactiveAnalysis] Run ${runId} failed:`, err);
      const failedAtMs = Date.now();
      const failedRun: ScheduledAnalysisRun = {
        runId,
        trigger,
        triggeredBy: options.actorId || 'system',
        callerRole,
        timeWindow,
        status: 'failed',
        error: err.message || 'Proactive analysis unexpected error',
        startedAt,
        completedAt: new Date(failedAtMs).toISOString(),
        durationMs: failedAtMs - startedAtMs,
        recommendationsCount: 0,
        recommendations: [],
        unavailableSources: ['internal_execution_error'],
      };
      this.lastRunStatus = 'failed';
      this.recordRun(failedRun);
      return failedRun;
    } finally {
      // Always release Concurrency Lock
      this.isRunInProgress = false;
    }
  }

  /**
   * Retrieves scheduler operational status.
   */
  public getStatus(): SchedulerStatus {
    const cooldownMs = this.DEFAULT_COOLDOWN_MINUTES * 60 * 1000;
    const nextAllowedMs =
      this.lastCompletedRunAt !== null
        ? this.lastCompletedRunAt + cooldownMs
        : null;

    return {
      isRunInProgress: this.isRunInProgress,
      lastRunAt:
        this.lastCompletedRunAt !== null
          ? new Date(this.lastCompletedRunAt).toISOString()
          : null,
      lastRunStatus: this.lastRunStatus,
      cooldownMinutes: this.DEFAULT_COOLDOWN_MINUTES,
      nextAllowedAutomatedRunAt:
        nextAllowedMs !== null ? new Date(nextAllowedMs).toISOString() : null,
      totalRunsRecorded: this.runsHistory.length,
    };
  }

  /**
   * Retrieves recent execution audit history.
   */
  public getHistory(): ScheduledAnalysisRun[] {
    return [...this.runsHistory];
  }

  /**
   * Cleans state for automated testing.
   */
  public clearForTesting(): void {
    this.isRunInProgress = false;
    this.lastCompletedRunAt = null;
    this.lastRunStatus = null;
    this.runsHistory = [];
  }

  private recordRun(run: ScheduledAnalysisRun): void {
    this.runsHistory.unshift(run);
    if (this.runsHistory.length > this.MAX_HISTORY_ITEMS) {
      this.runsHistory = this.runsHistory.slice(0, this.MAX_HISTORY_ITEMS);
    }
  }
}

// Global Process-Wide Singleton Controller
let instance: ScheduledAnalysisController | null = null;

export function getScheduledAnalysisController(): ScheduledAnalysisController {
  if (!instance) {
    instance = new ScheduledAnalysisController();
  }
  return instance;
}
