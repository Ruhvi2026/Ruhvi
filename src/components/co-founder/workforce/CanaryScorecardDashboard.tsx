'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  RotateCcw,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  Zap,
  Info,
} from 'lucide-react';

export interface CanaryState {
  workerId: string;
  stage: 'disabled' | 'shadow' | 'canary' | 'promoted';
  trafficPercentage: number;
  observationWindowHours: number;
  stagedAt: string;
  promotedAt?: string;
  rollbackHistory: Array<{
    timestamp: string;
    fromStage: string;
    toStage: string;
    reason: string;
  }>;
}

export interface DimensionScore {
  dimension: string;
  weight: number;
  score: number;
  weightedScore: number;
  evidenceNotes: string;
}

export interface WorkerScorecard {
  workerId: string;
  workerName: string;
  sampleSize: number;
  hasSufficientData: boolean;
  overallScore: number | 'INSUFFICIENT_DATA';
  confidenceInterval95: {
    lower: number;
    upper: number;
    marginOfError: number;
  } | null;
  dimensions: {
    taskCorrectness: DimensionScore;
    evidenceDataFidelity: DimensionScore;
    integrationToolExecution: DimensionScore;
    safetyApprovalCompliance: DimensionScore;
    reliability: DimensionScore;
    latencySla: DimensionScore;
    costEfficiency: DimensionScore;
    testObservabilityCoverage: DimensionScore;
  };
  failureAttribution: {
    dataSourceFailures: number;
    workerReasoningFailures: number;
    externalProviderFailures: number;
  };
  status:
    | 'verified_elite'
    | 'production_ready'
    | 'needs_attention'
    | 'insufficient_data';
  lastCalculatedAt: string;
}

export interface ShadowEvaluation {
  evaluationId: string;
  workerId: string;
  timestamp: string;
  inputTask: string;
  baselineOutputSummary: string;
  candidateOutputSummary: string;
  divergenceScore: number;
  safetyPassed: boolean;
  attemptedExternalWrites: number;
  latencyDeltaMs: number;
  recommendation: 'ready_for_canary' | 'requires_tuning' | 'unsafe';
}

export function CanaryScorecardDashboard() {
  const [canaryStates, setCanaryStates] = useState<CanaryState[]>([]);
  const [scorecards, setScorecards] = useState<WorkerScorecard[]>([]);
  const [shadowLogs, setShadowLogs] = useState<ShadowEvaluation[]>([]);
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecards' | 'shadow_mode'>(
    'scorecards'
  );

  const fetchCanaryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/co-founder/canary');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.canaryStates) setCanaryStates(data.canaryStates);
      if (data.scorecards) setScorecards(data.scorecards);
      if (data.shadowEvaluations) setShadowLogs(data.shadowEvaluations);
      setGlobalKillSwitch(Boolean(data.globalKillSwitchActive));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load canary data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCanaryData();
  }, [fetchCanaryData]);

  const handleStageChange = async (
    workerId: string,
    newStage: 'disabled' | 'shadow' | 'canary' | 'promoted'
  ) => {
    try {
      const res = await fetch('/api/admin/co-founder/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_stage',
          workerId,
          stage: newStage,
          trafficPercentage:
            newStage === 'promoted' ? 100 : newStage === 'canary' ? 25 : 0,
        }),
      });
      if (res.ok) fetchCanaryData();
    } catch (e: any) {
      alert(`Stage transition failed: ${e.message}`);
    }
  };

  const handleWorkerRollback = async (workerId: string) => {
    if (!confirm(`Execute immediate rollback for worker ${workerId}?`)) return;
    try {
      await fetch('/api/admin/co-founder/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rollback_worker',
          workerId,
          targetStage: 'shadow',
          reason: 'Manual operator rollback trigger',
        }),
      });
      fetchCanaryData();
    } catch (e: any) {
      alert(`Rollback failed: ${e.message}`);
    }
  };

  const handleTestRollbackDrill = async () => {
    try {
      const res = await fetch('/api/admin/co-founder/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_rollback' }),
      });
      const data = await res.json();
      if (data.drillVerified) {
        alert(
          'Rollback Drill Verified: Worker was successfully rolled back and maintenance mode engaged.'
        );
      }
      fetchCanaryData();
    } catch (e: any) {
      alert(`Rollback drill failed: ${e.message}`);
    }
  };

  const handleGlobalRollback = async () => {
    if (
      !confirm(
        'TRIGGER GLOBAL EMERGENCY ROLLBACK? This will demote all canary workers to shadow mode and activate the kill-switch!'
      )
    ) {
      return;
    }
    try {
      await fetch('/api/admin/co-founder/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'global_rollback',
          reason: 'Founder manual emergency rollback',
        }),
      });
      fetchCanaryData();
    } catch (e: any) {
      alert(`Global rollback error: ${e.message}`);
    }
  };

  const promotedCount = canaryStates.filter(
    (s) => s.stage === 'promoted'
  ).length;
  const canaryCount = canaryStates.filter((s) => s.stage === 'canary').length;
  const shadowCount = canaryStates.filter((s) => s.stage === 'shadow').length;
  const disabledCount = canaryStates.filter(
    (s) => s.stage === 'disabled'
  ).length;

  return (
    <div className="flex min-h-screen w-full flex-col gap-6 bg-zinc-950 p-4 text-zinc-100 md:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Canary Rollout & Measurable Scorecards
            </h1>
            <span className="rounded-full border border-cyan-700/60 bg-cyan-950 px-2.5 py-0.5 text-xs font-medium text-cyan-400">
              Phase 12 Active
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400 md:text-sm">
            Replaces subjective review estimates with measured 8-dimension
            scores built from real execution traces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchCanaryData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`}
            />
            Refresh
          </button>

          <button
            onClick={handleTestRollbackDrill}
            className="flex items-center gap-1.5 rounded-lg border border-amber-800/50 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-900/40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Test Rollback Drill
          </button>

          <button
            onClick={handleGlobalRollback}
            className="flex items-center gap-1.5 rounded-lg border border-red-800/80 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-900/60"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Global Emergency Rollback
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stage Summary Tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
          <span className="text-xs font-medium text-zinc-400">
            Promoted to Prod
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {promotedCount}
          </div>
          <span className="mt-1 text-[11px] text-zinc-500">
            100% traffic, verified scorecard
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
          <span className="text-xs font-medium text-zinc-400">
            Canary Staged
          </span>
          <div className="mt-1 text-2xl font-bold text-cyan-400">
            {canaryCount}
          </div>
          <span className="mt-1 text-[11px] text-zinc-500">
            Gated traffic (10-25%) under observation
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
          <span className="text-xs font-medium text-zinc-400">Shadow Mode</span>
          <div className="mt-1 text-2xl font-bold text-amber-400">
            {shadowCount}
          </div>
          <span className="mt-1 text-[11px] text-zinc-500">
            Zero writes, divergence comparison
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
          <span className="text-xs font-medium text-zinc-400">
            Disabled / Maintenance
          </span>
          <div className="mt-1 text-2xl font-bold text-zinc-500">
            {disabledCount}
          </div>
          <span className="mt-1 text-[11px] text-zinc-500">
            Execution paused fail-closed
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80">
        <button
          onClick={() => setActiveTab('scorecards')}
          className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'scorecards'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          16-Worker Measured Scorecards
        </button>
        <button
          onClick={() => setActiveTab('shadow_mode')}
          className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'shadow_mode'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Shadow Mode Divergence Logs ({shadowLogs.length})
        </button>
      </div>

      {/* Tab 1: Scorecards Table */}
      {activeTab === 'scorecards' && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 text-xs font-medium text-zinc-400">
            <span>
              Production Workers (16 Total) — Measured 8-Dimension Evaluation
            </span>
            <span className="text-[11px] text-zinc-500">
              Formula: 20% Correct + 20% Evidence + 15% Tools + 15% Safety + 10%
              SLA + 10% Reliability + 5% Cost + 5% Obs
            </span>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {scorecards.map((sc) => {
              const state = canaryStates.find(
                (s) => s.workerId === sc.workerId
              );
              const stage = state?.stage || 'shadow';
              const isExpanded = expandedWorkerId === sc.workerId;

              return (
                <div
                  key={sc.workerId}
                  className="flex flex-col text-xs transition-colors hover:bg-zinc-900/80"
                >
                  <div
                    onClick={() =>
                      setExpandedWorkerId(isExpanded ? null : sc.workerId)
                    }
                    className="flex cursor-pointer select-none flex-col justify-between gap-3 p-3.5 md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                      )}

                      <div>
                        <span className="text-sm font-semibold text-white">
                          {sc.workerName}
                        </span>
                        <div className="mt-0.5 font-mono text-[11px] text-zinc-400">
                          {sc.workerId}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:flex-nowrap">
                      {/* Canary Stage Selector */}
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] text-zinc-400">
                          Stage:
                        </span>
                        <select
                          value={stage}
                          onChange={(e) =>
                            handleStageChange(
                              sc.workerId,
                              e.target.value as
                                'disabled' | 'shadow' | 'canary' | 'promoted'
                            )
                          }
                          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-medium text-zinc-200 outline-none"
                        >
                          <option value="disabled">Disabled</option>
                          <option value="shadow">Shadow</option>
                          <option value="canary">Canary</option>
                          <option value="promoted">Promoted</option>
                        </select>
                      </div>

                      {/* Sample Size */}
                      <div className="min-w-[70px] text-right text-zinc-400">
                        <span className="block text-[10px] text-zinc-500">
                          Samples
                        </span>
                        <span className="font-mono font-medium text-zinc-200">
                          n = {sc.sampleSize}
                        </span>
                      </div>

                      {/* Overall Score */}
                      <div className="min-w-[110px] text-right">
                        <span className="block text-[10px] text-zinc-500">
                          Score
                        </span>
                        {sc.overallScore === 'INSUFFICIENT_DATA' ? (
                          <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                            INSUFFICIENT_DATA
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 font-mono text-sm font-bold text-cyan-300">
                            <span>{sc.overallScore}%</span>
                            {sc.confidenceInterval95 && (
                              <span className="text-[10px] font-normal text-zinc-500">
                                [±{sc.confidenceInterval95.marginOfError}%]
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkerRollback(sc.workerId);
                        }}
                        className="rounded border border-red-800/40 bg-red-950/40 px-2.5 py-1 text-[11px] text-red-300 transition-colors hover:bg-red-900/40"
                      >
                        Rollback
                      </button>
                    </div>
                  </div>

                  {/* Expanded 8-Dimension Breakdown */}
                  {isExpanded && (
                    <div className="flex flex-col gap-3 border-t border-zinc-800/80 bg-zinc-950/80 p-4 font-mono text-xs">
                      <div className="mb-1 flex items-center justify-between font-semibold text-zinc-300">
                        <span>Measured 8-Dimension Audit Breakdown:</span>
                        <span className="text-[11px] font-normal text-zinc-400">
                          Last evaluated:{' '}
                          {new Date(sc.lastCalculatedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(sc.dimensions).map(([key, dim]) => (
                          <div
                            key={key}
                            className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/90 p-2.5"
                          >
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>{dim.dimension}</span>
                              <span className="text-zinc-500">
                                ({dim.weight}%)
                              </span>
                            </div>
                            <div className="mt-1 text-lg font-bold text-white">
                              {sc.overallScore === 'INSUFFICIENT_DATA'
                                ? '—'
                                : `${dim.score}%`}
                            </div>
                            <span className="mt-1 line-clamp-2 text-[10px] text-zinc-500">
                              {dim.evidenceNotes}
                            </span>
                          </div>
                        ))}
                      </div>

                      {sc.overallScore === 'INSUFFICIENT_DATA' && (
                        <div className="flex items-center gap-2 rounded border border-amber-800/40 bg-amber-950/40 p-2 text-[11px] text-amber-300">
                          <Info className="h-4 w-4 flex-shrink-0" />
                          <span>
                            Section 8.2 Compliance: Below 5 verified tasks,
                            score displays INSUFFICIENT_DATA. No synthetic
                            multipliers are permitted.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Shadow Mode Divergence Logs */}
      {activeTab === 'shadow_mode' && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 text-xs font-medium text-zinc-400">
            <span>Shadow Mode Output Divergence & Safety Audit</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              External Writes Strictly Inhibited
            </span>
          </div>

          {shadowLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No shadow evaluation records logged yet. Shadow mode triggers when
              workers process requests alongside baseline.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 font-mono text-xs">
              {shadowLogs.map((log) => (
                <div
                  key={log.evaluationId}
                  className="flex flex-col gap-2 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{log.workerId}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        log.recommendation === 'ready_for_canary'
                          ? 'border border-emerald-800 bg-emerald-950 text-emerald-300'
                          : log.recommendation === 'requires_tuning'
                            ? 'border border-amber-800 bg-amber-950 text-amber-300'
                            : 'border border-red-800 bg-red-950 text-red-300'
                      }`}
                    >
                      {log.recommendation.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400">
                    <strong>Task: </strong> {log.inputTask}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-[11px] md:grid-cols-2">
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-2 text-zinc-300">
                      <span className="mb-1 block text-zinc-500">
                        Baseline Output Summary:
                      </span>
                      {log.baselineOutputSummary}
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950 p-2 text-cyan-300">
                      <span className="mb-1 block text-zinc-500">
                        Candidate Output Summary:
                      </span>
                      {log.candidateOutputSummary}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-1 text-[10px] text-zinc-400">
                    <span>Divergence: {log.divergenceScore}</span>
                    <span>
                      Safety:{' '}
                      {log.safetyPassed ? 'PASSED (0 writes)' : 'FAILED'}
                    </span>
                    <span>Latency Δ: {log.latencyDeltaMs}ms</span>
                    <span className="text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
