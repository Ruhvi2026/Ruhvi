'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react';
import type {
  UnifiedActionItem,
  ActionCategory,
  ActionPriority,
  ActionStatus,
  ActionSourceType,
} from '@/lib/intelligence/action-contract';
import SimulatorComparisonModal from '@/components/admin/intelligence/SimulatorComparisonModal';
import type { ProposalSimulationReview } from '@/lib/intelligence/simulator-review-service';

/**
 * ============================================================================
 * UNIFIED ACTION CENTER INTERFACE (TRACK D - PHASE 25)
 * ============================================================================
 * Staff-facing consolidated operational workspace aggregating items from:
 * 1. Business anomaly detection findings
 * 2. Administrative audit logs & security events
 * 3. AI provider degradation & infrastructure failures
 * 4. Customer returns and refund claims
 *
 * Guarantees:
 * 1. Role-Aware Scoping: Filtered server-side by staff role; non-accessible
 *    categories (e.g. financial metrics for staff) are redacted at the API boundary.
 * 2. Originating Source Preservation: Every action item maintains a direct
 *    deep-link to its authoritative source workflow (/admin/orders, /admin/refunds, etc.).
 * 3. Graceful Upstream Degradation: Displays visible non-blocking warnings
 *    when individual upstream services experience timeouts or schema gaps.
 * 4. Human-In-The-Loop Safety: Zero autonomous writes; routes staff into
 *    verified existing workflows with audit logging.
 */

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return isoString;
  }
}

export default function ActionCenterPage() {
  const [items, setItems] = useState<UnifiedActionItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [counts, setCounts] = useState({
    total: 0,
    critical: 0,
    high: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    dismissed: 0,
  });
  const [degradedSources, setDegradedSources] = useState<string[]>([]);
  const [callerRole, setCallerRole] = useState<string>('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory | 'all'>(
    'all'
  );
  const [priorityFilter, setPriorityFilter] = useState<ActionPriority | 'all'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<ActionSourceType | 'all'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  // Counterfactual Simulation Preview State
  const [simulationReview, setSimulationReview] =
    useState<ProposalSimulationReview | null>(null);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [simulatingItemId, setSimulatingItemId] = useState<string | null>(null);

  const handleSimulateItem = async (item: UnifiedActionItem) => {
    try {
      setSimulatingItemId(item.id);
      const res = await fetch(`/api/action-center/simulate/${item.id}`);
      if (!res.ok) {
        throw new Error(`Simulation request failed with HTTP ${res.status}`);
      }
      const data: ProposalSimulationReview = await res.json();
      setSimulationReview(data);
      setIsSimModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load counterfactual simulation review:', err);
    } finally {
      setSimulatingItemId(null);
    }
  };

  const fetchActionItems = useCallback(
    async (isFresh = false, targetPage = pagination.page) => {
      try {
        if (isFresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        setHttpStatus(null);

        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', String(pagination.limit));
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (priorityFilter !== 'all') params.set('priority', priorityFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (sourceFilter !== 'all') params.set('source', sourceFilter);
        if (isFresh) params.set('fresh', 'true');

        const res = await fetch(`/api/action-center?${params.toString()}`);
        setHttpStatus(res.status);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `HTTP ${res.status}: Failed to fetch action items`
          );
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error('Malformed API response');
        }

        setItems(json.data.items || []);
        setPagination(json.data.pagination);
        setCounts(json.data.counts || {});
        setDegradedSources(json.data.degradedSources || []);
        setCallerRole(json.data.callerRole || '');
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      categoryFilter,
      priorityFilter,
      statusFilter,
      sourceFilter,
      pagination.limit,
      pagination.page,
    ]
  );

  useEffect(() => {
    fetchActionItems(false, 1);
  }, [categoryFilter, priorityFilter, statusFilter, sourceFilter]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.evidence.description.toLowerCase().includes(q) ||
      item.sourceId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0d1017] p-4 text-slate-100 sm:p-6 lg:p-8">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Action Center
            </h1>
            {callerRole && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                {callerRole} Access
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Consolidated operational workspace across business anomalies, audit
            alerts, AI diagnostics, and return claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchActionItems(true, pagination.page)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#161b26] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`}
            />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ─── Degraded Upstream Sources Banner ─────────────────────────────── */}
      {degradedSources.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold text-amber-300">
              Graceful Degradation Notice: Partial Upstream Availability
            </p>
            <p className="mt-0.5 text-amber-200/80">
              The following data source(s) were temporarily unreachable or
              empty:{' '}
              <span className="font-mono font-medium">
                {degradedSources.join(', ')}
              </span>
              . Action items from remaining verified sources are displayed
              normally without interruption.
            </p>
          </div>
        </div>
      )}

      {/* ─── KPI Counter Cards ────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-white/10 bg-[#161b26] p-4">
          <p className="text-xs font-medium text-slate-400">Total Items</p>
          <p className="mt-1 text-2xl font-bold text-white">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-[#161b26] p-4">
          <p className="text-xs font-medium text-rose-400">Critical Priority</p>
          <p className="mt-1 text-2xl font-bold text-rose-400">
            {counts.critical}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-[#161b26] p-4">
          <p className="text-xs font-medium text-amber-400">High Priority</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {counts.high}
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-[#161b26] p-4">
          <p className="text-xs font-medium text-blue-400">Pending</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">
            {counts.pending}
          </p>
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-[#161b26] p-4">
          <p className="text-xs font-medium text-purple-400">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            {counts.in_progress}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-[#161b26] p-4">
          <p className="text-xs font-medium text-emerald-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {counts.completed}
          </p>
        </div>
      </div>

      {/* ─── Filters & Search Toolbar ─────────────────────────────────────── */}
      <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-[#161b26] p-4">
        {/* Search & Quick Toggles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, summary, or source ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d1017] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Priority filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400">Priority:</span>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                    priorityFilter === p
                      ? 'bg-amber-400 font-semibold text-slate-900'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
        </div>

        {/* Categories & Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400">Category:</span>
            {(
              [
                'all',
                'operations',
                'inventory',
                'financial',
                'security',
                'infrastructure',
                'support',
                'quality',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-[#0d1017] px-2.5 py-1 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── State: Authorization Error (401/403) ─────────────────────────── */}
      {httpStatus && (httpStatus === 401 || httpStatus === 403) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#161b26] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            Administrative Access Required
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            You do not have active staff or administrative permissions to
            inspect the Action Center.
          </p>
          <Link
            href="/login"
            className="mt-6 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-300"
          >
            Portal Login
          </Link>
        </div>
      )}

      {/* ─── State: General Error Boundary ─────────────────────────────────── */}
      {error && (!httpStatus || (httpStatus !== 401 && httpStatus !== 403)) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#161b26] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            Action Center Error
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">{error}</p>
          <button
            onClick={() => fetchActionItems(true, pagination.page)}
            className="mt-6 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* ─── State: Loading Skeleton ──────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-white/5 bg-[#161b26]"
            />
          ))}
        </div>
      )}

      {/* ─── State: Empty State ───────────────────────────────────────────── */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#161b26] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">
            All Clear — Zero Pending Items
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            No action items match your current filter selection. All operational
            alerts and anomalies are addressed.
          </p>
        </div>
      )}

      {/* ─── Action Item Cards List ───────────────────────────────────────── */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isCritical = item.priority === 'critical';
            const isHigh = item.priority === 'high';

            const priorityBadgeClass = isCritical
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : isHigh
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/30';

            const statusBadgeClass =
              item.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : item.status === 'in_progress'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : item.status === 'dismissed'
                    ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30';

            return (
              <div
                key={item.id}
                className={`relative rounded-xl border bg-[#161b26] p-5 transition-colors ${
                  isCritical
                    ? 'border-rose-500/30 hover:border-rose-500/50'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header row: Badges + Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${priorityBadgeClass}`}
                    >
                      {item.priority}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass}`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium capitalize text-slate-300">
                      {item.category}
                    </span>
                    <span className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-0.5 text-xs text-slate-400">
                      Source: {item.sourceType.replace('_', ' ')}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    {formatTimestamp(item.createdAt)}
                  </span>
                </div>

                {/* Title & Summary */}
                <div className="mt-3">
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">{item.summary}</p>
                </div>

                {/* Evidence & Supporting Details */}
                <div className="mt-4 rounded-lg border border-white/5 bg-[#0d1017] p-3 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                    <div className="space-y-1">
                      <p className="text-slate-300">
                        {item.evidence.description}
                      </p>
                      {item.evidence.metricRefs &&
                        item.evidence.metricRefs.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px] text-amber-300/90">
                            {item.evidence.metricRefs.map((m, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-white/5 px-1.5 py-0.5"
                              >
                                {m.metric}: {m.value}
                                {m.unit || ''}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Action Footer: Safe Deep Link to originating workflow & Simulation Preview */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      Approval role:{' '}
                      <span className="font-medium capitalize text-slate-200">
                        {item.requiredApprovalType}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSimulateItem(item)}
                      disabled={simulatingItemId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                      title="Inspect Counterfactual Simulation"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {simulatingItemId === item.id
                          ? 'Simulating...'
                          : 'Inspect Counterfactual'}
                      </span>
                    </button>

                    {item.evidence.deepLink ? (
                      <Link
                        href={item.evidence.deepLink}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-amber-300"
                      >
                        <span>Open Originating Workflow</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs italic text-slate-500">
                        No direct workflow route
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Pagination Controls ─────────────────────────────────────────── */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} items
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchActionItems(false, pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-white/10 bg-[#161b26] px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchActionItems(false, pagination.page + 1)}
              disabled={!pagination.hasMore}
              className="rounded-lg border border-white/10 bg-[#161b26] px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Counterfactual Simulation Review Modal (Phase 45) ───────────── */}
      <SimulatorComparisonModal
        review={simulationReview}
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
      />
    </div>
  );
}
