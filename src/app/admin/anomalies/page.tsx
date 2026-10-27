'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Radar,
  ArrowRight,
  Layers,
  Activity,
  History,
  Lock,
  MessageSquare,
} from 'lucide-react';
import type {
  AnomalyRecord,
  AnomalyState,
} from '@/lib/intelligence/anomaly-lifecycle';

/**
 * ============================================================================
 * BUSINESS ANOMALY REVIEW & TRIAGE INTERFACE (TRACK C - PHASE 22)
 * ============================================================================
 * Staff-facing interface for reviewing deterministic anomaly findings,
 * inspecting evidence and observation timelines, and performing human-in-the-loop
 * triage actions (Acknowledge, Resolve with documented reason).
 *
 * Guarantees:
 * 1. Zero Automatic Repairs: Staff inspects evidence and deep-links to manual
 *    workflows; no unchecked destructive automated actions are exposed.
 * 2. Complete Lifecycle Tracking: Visualizes open, in-review, and resolved incidents.
 * 3. Change Over Time: Displays observation history snapshots across scans.
 * 4. Auditable Actions: Staff acknowledgements and resolutions record actor attribution.
 * 5. Strict RBAC: Protected behind verified internal admin/staff sessions.
 */

function formatIsoDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return iso;
  }
}

export default function AnomalyReviewPage() {
  const [records, setRecords] = useState<AnomalyRecord[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    warning: number;
  }>({
    total: 0,
    open: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
  });

  const [stateFilter, setStateFilter] = useState<
    'active' | 'open' | 'acknowledged' | 'resolved' | 'all'
  >('active');
  const [severityFilter, setSeverityFilter] = useState<
    'all' | 'warning' | 'critical'
  >('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  // Triage Action Modal State
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionReason, setResolutionReason] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAnomalies = useCallback(
    async (isFresh = false) => {
      try {
        if (isFresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        setHttpStatus(null);

        const params = new URLSearchParams();
        if (stateFilter !== 'active') {
          params.set('state', stateFilter);
        }
        if (severityFilter !== 'all') {
          params.set('severity', severityFilter);
        }
        params.set('scan', 'true');

        const res = await fetch(`/api/anomalies?${params.toString()}`);
        setHttpStatus(res.status);

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error || `Request failed with status ${res.status}`
          );
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error('Invalid API response structure');
        }

        setSummary(json.data.summary);

        // Handle 'active' client filter: open + acknowledged
        let fetchedRecords: AnomalyRecord[] = json.data.records;
        if (stateFilter === 'active') {
          fetchedRecords = fetchedRecords.filter(
            (r) => r.state === 'open' || r.state === 'acknowledged'
          );
        }

        setRecords(fetchedRecords);
      } catch (err: any) {
        setError(err.message || 'Failed to load anomalies');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stateFilter, severityFilter]
  );

  useEffect(() => {
    fetchAnomalies(false);
  }, [fetchAnomalies]);

  // Execute Triage Action
  const handleAcknowledge = async (id: string) => {
    try {
      setActionInProgress(id);
      const res = await fetch('/api/anomalies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', anomalyId: id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to acknowledge anomaly');
      }

      await fetchAnomalies(false);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolve = async (id: string) => {
    if (!resolutionReason || resolutionReason.trim().length < 3) {
      alert('Please enter a valid resolution reason (minimum 3 characters).');
      return;
    }

    try {
      setActionInProgress(id);
      const res = await fetch('/api/anomalies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          anomalyId: id,
          reason: resolutionReason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to resolve anomaly');
      }

      setResolvingId(null);
      setResolutionReason('');
      await fetchAnomalies(false);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] p-4 text-slate-100 sm:p-6 lg:p-8">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Anomaly Review & Triage
              </h1>
              <p className="text-sm text-slate-400">
                Deterministic rule-based anomalies, evidence review, and
                human-in-the-loop investigation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/business-radar"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <Radar className="h-4 w-4 text-amber-400" />
            <span>Business Radar</span>
          </Link>

          <button
            onClick={() => fetchAnomalies(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>{refreshing ? 'Scanning...' : 'Rescan Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* ─── Counter Strip ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-white/10 bg-[#131726] p-4">
          <p className="text-xs font-medium text-slate-400">Total Tracked</p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-[#131726] p-4">
          <p className="text-xs font-medium text-rose-400">Critical Active</p>
          <p className="mt-1 text-2xl font-bold text-rose-400">
            {summary.critical}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-[#131726] p-4">
          <p className="text-xs font-medium text-amber-400">Warning Active</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {summary.warning}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131726] p-4">
          <p className="text-xs font-medium text-slate-400">Open Incidents</p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.open}</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-[#131726] p-4">
          <p className="text-xs font-medium text-blue-400">In Review</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">
            {summary.acknowledged}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-[#131726] p-4">
          <p className="text-xs font-medium text-emerald-400">Resolved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {summary.resolved}
          </p>
        </div>
      </div>

      {/* ─── Filter Tabs Bar ───────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-[#131726] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'active', label: 'Active Issues' },
            { id: 'open', label: 'Open' },
            { id: 'acknowledged', label: 'In Review' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'all', label: 'All History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStateFilter(tab.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                stateFilter === tab.id
                  ? 'bg-amber-400 font-semibold text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Severity:</span>
          {(['all', 'critical', 'warning'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                severityFilter === sev
                  ? 'bg-white/20 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev === 'all'
                ? 'All'
                : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── State: Permission Denied (401/403) ───────────────────────────── */}
      {httpStatus && (httpStatus === 401 || httpStatus === 403) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#131726] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            Administrative Session Required
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            You do not have permission to review or triage business anomalies.
            Please sign in with an authorized staff or administrator account.
          </p>
          <Link
            href="/login"
            className="mt-6 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-300"
          >
            Go to Portal Login
          </Link>
        </div>
      )}

      {/* ─── State: Error Boundary ───────────────────────────────────────── */}
      {error && (!httpStatus || (httpStatus !== 401 && httpStatus !== 403)) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#131726] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            Failed to Load Anomalies
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">{error}</p>
          <button
            onClick={() => fetchAnomalies(false)}
            className="mt-6 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Retry Anomaly Fetch
          </button>
        </div>
      )}

      {/* ─── State: Loading Skeletons ─────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-white/5 bg-[#131726] p-6"
            />
          ))}
        </div>
      )}

      {/* ─── State: Empty Findings ───────────────────────────────────────── */}
      {!loading && !error && records.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#131726] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            No Anomalies Found
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            All deterministic business metrics are operating within verified
            operational threshold safety limits.
          </p>
        </div>
      )}

      {/* ─── Anomaly Incident Cards List ─────────────────────────────────── */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-5">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border border-white/10 bg-[#131726] p-5 shadow-lg transition-all hover:border-white/20"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  {record.severity === 'critical' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      Critical
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Warning
                    </span>
                  )}

                  {/* State Badge */}
                  {record.state === 'open' && (
                    <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-medium text-rose-300">
                      Open
                    </span>
                  )}
                  {record.state === 'acknowledged' && (
                    <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                      In Review ({record.acknowledgedBy})
                    </span>
                  )}
                  {record.state === 'resolved' && (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      Resolved
                    </span>
                  )}

                  <span className="rounded-lg bg-white/5 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-slate-300">
                    {record.recommendation.category}
                  </span>
                </div>

                {/* Counters and Times */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {record.occurrenceCount > 1 && (
                    <span className="rounded bg-white/5 px-2 py-0.5 font-medium text-amber-300">
                      Observed {record.occurrenceCount}x
                    </span>
                  )}
                  {record.reopenCount > 0 && (
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 font-medium text-rose-300">
                      Reopened {record.reopenCount}x
                    </span>
                  )}
                  <span>
                    First: {formatIsoDateTime(record.firstDetectedAt)}
                  </span>
                  <span>
                    • Last: {formatIsoDateTime(record.lastObservedAt)}
                  </span>
                </div>
              </div>

              {/* Title & Threshold Summary */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <h3 className="text-base font-bold text-white">
                    {record.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {record.recommendation.explanation}
                  </p>
                </div>

                {/* Numeric Metric Breach Card */}
                <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Observed Metric:</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {record.latestValue.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-slate-400">
                    <span>Safety Threshold:</span>
                    <span className="font-mono text-sm text-amber-300">
                      {record.thresholdValue.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Rule ID:</span>
                    <span className="font-mono">{record.ruleId}</span>
                  </div>
                </div>
              </div>

              {/* Observation Timeline (Change Over Time) */}
              {record.history.length > 1 && (
                <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <History className="h-3.5 w-3.5 text-amber-400" />
                    <span>Observation History (Change Over Time):</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {record.history.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border px-2 py-1 font-mono text-xs ${
                          entry.severity === 'critical'
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">
                          {formatIsoDateTime(entry.observedAt).split(',')[1]}:
                        </span>{' '}
                        <span>{entry.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Note if Resolved */}
              {record.state === 'resolved' && record.resolutionReason && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Resolution Rationale:</strong>{' '}
                    {record.resolutionReason} (Resolved at{' '}
                    {formatIsoDateTime(record.resolvedAt || '')})
                  </span>
                </div>
              )}

              {/* Action Strip: Deep Link & Staff Triage */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                {/* Safe Deep Link for Investigation (Zero automated repairs!) */}
                {record.recommendation.suggestedNextStep.safeDeepLink && (
                  <Link
                    href={record.recommendation.suggestedNextStep.safeDeepLink}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-white/10"
                  >
                    <span>
                      {record.recommendation.suggestedNextStep.actionTitle}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}

                {/* Staff Triage Buttons */}
                <div className="flex items-center gap-2">
                  {record.state === 'open' && (
                    <button
                      onClick={() => handleAcknowledge(record.id)}
                      disabled={actionInProgress === record.id}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {actionInProgress === record.id
                        ? 'Saving...'
                        : 'Acknowledge Finding'}
                    </button>
                  )}

                  {record.state !== 'resolved' && (
                    <button
                      onClick={() => {
                        setResolvingId(record.id);
                        setResolutionReason('');
                      }}
                      disabled={actionInProgress === record.id}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Resolution Reason Input */}
              {resolvingId === record.id && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
                  <p className="text-xs font-semibold text-white">
                    Document Resolution Rationale (Audit Record):
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="e.g. Gateway webhook restored, provider verified, false spike cleared"
                      value={resolutionReason}
                      onChange={(e) => setResolutionReason(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolve(record.id)}
                        disabled={actionInProgress === record.id}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Confirm Resolution
                      </button>
                      <button
                        onClick={() => setResolvingId(null)}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
