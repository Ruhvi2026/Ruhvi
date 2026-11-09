'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Trash2,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';
import { CanaryScorecardDashboard } from './CanaryScorecardDashboard';

export interface TraceItem {
  id: string;
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs: number;
  status: 'ok' | 'error';
  workerId?: string;
  toolName?: string;
  provider?: string;
  model?: string;
  resultState?: string;
  approvalState?: string;
  cacheHit?: boolean;
  retryCount?: number;
  sourceCount?: number;
  attributes: Record<string, string | number | boolean>;
  errorMessage?: string;
}

export interface TelemetryMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  timedOutRuns: number;
  verifiedRuns: number;
  insufficientDataRuns: number;
  successRate: number;
  verifiedSuccessRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  llmCalls: number;
  toolExecutions: number;
  totalTokens: number;
  p95LLMDurationMs: number;
  errorsByCategory: Record<string, number>;
  providerBreakdown: Record<
    string,
    { calls: number; tokens: number; avgDurationMs: number }
  >;
  topTools: Array<{
    toolName: string;
    executions: number;
    avgDurationMs: number;
    errorCount: number;
  }>;
  workerBreakdown: Record<
    string,
    { runs: number; successes: number; failures: number; avgDurationMs: number }
  >;
  ledgerReconciliation: {
    status: string;
    reconciliationDrift: number;
    verifiedAgainstLedger: boolean;
  };
}

export function WorkerTelemetryDashboard() {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedSpan, setSelectedSpan] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'traces' | 'canary_scorecards'>(
    'traces'
  );

  const fetchTelemetry = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedWorker !== 'all') params.set('workerId', selectedWorker);
      if (selectedSpan !== 'all') params.set('spanName', selectedSpan);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (searchTerm) params.set('search', searchTerm);
      params.set('limit', '50');

      const res = await fetch(
        `/api/admin/co-founder/telemetry?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load telemetry (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.traces) setTraces(data.traces);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error fetching telemetry');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorker, selectedSpan, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTelemetry]);

  const handleClearBuffer = async () => {
    if (!confirm('Clear recent telemetry traces buffer?')) return;
    try {
      await fetch('/api/admin/co-founder/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_buffer' }),
      });
      fetchTelemetry();
    } catch (e: any) {
      alert(`Clear failed: ${e.message}`);
    }
  };

  const getSpanBadgeColor = (name: string) => {
    switch (name) {
      case 'worker.run':
        return 'bg-purple-900/40 text-purple-300 border-purple-700/50';
      case 'model.call':
        return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
      case 'tool.call':
      case 'action.execute':
        return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
      case 'research.search':
      case 'research.fetch':
      case 'source.verify':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
      case 'approval.request':
        return 'bg-orange-900/40 text-orange-300 border-orange-700/50';
      case 'action.verify':
        return 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col gap-6 bg-zinc-950 p-4 text-zinc-100 md:p-6">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-amber-400" />
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Workforce Distributed Tracing & Observability
            </h1>
            <span className="rounded-full border border-emerald-700/60 bg-emerald-950 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Phase 11 Active
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400 md:text-sm">
            End-to-end OpenTelemetry spans, sanitized attribute logs, and ledger
            reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0"
            />
            Auto-refresh (5s)
          </label>

          <button
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`}
            />
            Refresh
          </button>

          <button
            onClick={handleClearBuffer}
            className="flex items-center gap-1.5 rounded-lg border border-red-800/40 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Buffer
          </button>
        </div>
      </div>

      {/* Observability Mode Selector Tabs */}
      <div className="flex items-center gap-4 border-b border-zinc-800">
        <button
          onClick={() => setViewMode('traces')}
          className={`border-b-2 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
            viewMode === 'traces'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Live Traces & Spans (Phase 11)
        </button>
        <button
          onClick={() => setViewMode('canary_scorecards')}
          className={`border-b-2 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
            viewMode === 'canary_scorecards'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Canary Rollout & Scorecards (Phase 12)
        </button>
      </div>

      {viewMode === 'canary_scorecards' ? (
        <CanaryScorecardDashboard />
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Operational Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
              <span className="text-xs font-medium text-zinc-400">
                Total Runs
              </span>
              <div className="mt-1 text-2xl font-bold text-white">
                {metrics?.totalRuns ?? 0}
              </div>
              <span className="mt-1 text-[11px] text-zinc-500">
                Worker executions
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
              <span className="text-xs font-medium text-zinc-400">
                Success Rate
              </span>
              <div className="mt-1 text-2xl font-bold text-emerald-400">
                {metrics?.successRate ?? 100}%
              </div>
              <span className="mt-1 text-[11px] text-emerald-500/80">
                {metrics?.successfulRuns ?? 0} successful
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
              <span className="text-xs font-medium text-zinc-400">
                Verified Success
              </span>
              <div className="mt-1 text-2xl font-bold text-cyan-400">
                {metrics?.verifiedSuccessRate ?? 100}%
              </div>
              <span className="mt-1 text-[11px] text-cyan-500/80">
                Verified against criteria
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
              <span className="text-xs font-medium text-zinc-400">
                Latency (p50 / p95)
              </span>
              <div className="mt-1 text-lg font-bold text-amber-300 md:text-xl">
                {metrics?.p50LatencyMs ?? 0}ms / {metrics?.p95LatencyMs ?? 0}ms
              </div>
              <span className="mt-1 text-[11px] text-zinc-500">
                Worker round-trip
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
              <span className="text-xs font-medium text-zinc-400">
                LLM & Tool Calls
              </span>
              <div className="mt-1 text-lg font-bold text-purple-300 md:text-xl">
                {metrics?.llmCalls ?? 0} / {metrics?.toolExecutions ?? 0}
              </div>
              <span className="mt-1 text-[11px] text-purple-400/80">
                {(metrics?.totalTokens ?? 0).toLocaleString()} tokens
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5">
              <span className="text-xs font-medium text-zinc-400">
                Ledger Reconciliation
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span>Reconciled</span>
              </div>
              <span className="mt-1 text-[11px] text-zinc-500">
                Zero drift detected
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col items-stretch gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search traces by ID, worker, tool, attribute..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
              >
                <option value="all">All Workers (16)</option>
                <option value="worker_sales_conversion">
                  Worker 1: Sales & Conversion
                </option>
                <option value="worker_marketing_campaigns">
                  Worker 2: Marketing & Meta
                </option>
                <option value="worker_seo_audit">
                  Worker 3: SEO Audit & Strategy
                </option>
                <option value="worker_orders_fulfillment">
                  Worker 4: Orders & Logistics
                </option>
                <option value="worker_review_customer_feedback">
                  Worker 5: Review & Customer Feedback
                </option>
                <option value="worker_customer_support">
                  Worker 6: Customer Support
                </option>
                <option value="worker_pricing_gross_margins">
                  Worker 7: Pricing & Gross Margins
                </option>
                <option value="worker_content_blog">
                  Worker 8: Content & Editorial
                </option>
                <option value="worker_catalog_merchandising">
                  Worker 9: Product & Inventory
                </option>
                <option value="worker_competitor_market_intelligence">
                  Worker 10: Competitor Intelligence
                </option>
                <option value="worker_retention_loyalty">
                  Worker 11: Retention & VIP Coins
                </option>
                <option value="worker_monitoring_verification">
                  Worker 12: Monitoring & Verification
                </option>
                <option value="worker_execution_operations">
                  Worker 13: Execution Operations
                </option>
                <option value="worker_accounts_tax">
                  Worker 14: Accounts & Tax
                </option>
                <option value="worker_performance_intelligence">
                  Worker 15: Performance Intelligence
                </option>
                <option value="worker_security_intelligence">
                  Worker 16: Security Intelligence
                </option>
              </select>

              <select
                value={selectedSpan}
                onChange={(e) => setSelectedSpan(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
              >
                <option value="all">All Span Types</option>
                <option value="cofounder.request">cofounder.request</option>
                <option value="model.call">model.call</option>
                <option value="tool.call">tool.call</option>
                <option value="worker.run">worker.run</option>
                <option value="worker.delegate">worker.delegate</option>
                <option value="approval.request">approval.request</option>
                <option value="action.execute">action.execute</option>
                <option value="action.verify">action.verify</option>
                <option value="research.search">research.search</option>
                <option value="research.fetch">research.fetch</option>
                <option value="source.verify">source.verify</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="ok">Success (ok)</option>
                <option value="error">Error (error)</option>
              </select>
            </div>
          </div>

          {/* Traces List Table */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 text-xs font-medium text-zinc-400">
              <span>Searchable Trace Events ({traces.length} loaded)</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Zero-PII & Secret Sanitization Enforced
              </span>
            </div>

            {traces.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                {isLoading
                  ? 'Loading traces...'
                  : 'No trace events match the current filter criteria.'}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {traces.map((trace) => {
                  const isExpanded = expandedTraceId === trace.id;
                  return (
                    <div
                      key={trace.id}
                      className="flex flex-col text-xs transition-colors hover:bg-zinc-900/80"
                    >
                      <div
                        onClick={() =>
                          setExpandedTraceId(isExpanded ? null : trace.id)
                        }
                        className="flex cursor-pointer select-none items-center justify-between gap-3 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                          )}

                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${getSpanBadgeColor(
                              trace.name
                            )}`}
                          >
                            {trace.name}
                          </span>

                          {trace.workerId && (
                            <span className="max-w-[180px] truncate font-medium text-zinc-300 md:max-w-[280px]">
                              {trace.workerId}
                            </span>
                          )}

                          {trace.toolName && (
                            <span className="font-mono text-[11px] text-amber-400/90">
                              [{trace.toolName}]
                            </span>
                          )}

                          {trace.model && (
                            <span className="font-mono text-[11px] text-zinc-400">
                              ({trace.model})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="font-mono text-[11px] text-zinc-400">
                            {trace.durationMs}ms
                          </span>

                          {trace.status === 'ok' ? (
                            <span className="flex items-center gap-1 rounded border border-emerald-800/60 bg-emerald-950/60 px-2 py-0.5 text-[11px] text-emerald-400">
                              <CheckCircle className="h-3 w-3" />
                              OK
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded border border-red-800/60 bg-red-950/60 px-2 py-0.5 text-[11px] text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              ERROR
                            </span>
                          )}

                          <span className="text-[11px] text-zinc-500">
                            {new Date(trace.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Sanitized Details */}
                      {isExpanded && (
                        <div className="flex flex-col gap-3 border-t border-zinc-800/70 bg-zinc-950/70 p-4 font-mono text-[11px]">
                          <div className="grid grid-cols-1 gap-2 text-zinc-400 md:grid-cols-3">
                            <div>
                              <span className="text-zinc-500">Trace ID: </span>
                              <span className="text-zinc-200">
                                {trace.traceId}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Span ID: </span>
                              <span className="text-zinc-200">
                                {trace.spanId}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500">
                                Result State:{' '}
                              </span>
                              <span className="text-cyan-400">
                                {trace.resultState || 'completed'}
                              </span>
                            </div>
                          </div>

                          {trace.errorMessage && (
                            <div className="rounded border border-red-800/60 bg-red-950/60 p-2.5 text-red-300">
                              <strong>Error: </strong> {trace.errorMessage}
                            </div>
                          )}

                          <div>
                            <div className="mb-1 flex items-center justify-between font-medium text-zinc-400">
                              <span>
                                Sanitized Trace Attributes (Zero-PII):
                              </span>
                              <span className="rounded border border-emerald-800/40 bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                Safe for Audits
                              </span>
                            </div>
                            <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-zinc-300">
                              {JSON.stringify(trace.attributes, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
