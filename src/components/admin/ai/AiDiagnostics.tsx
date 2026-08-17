'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  RefreshCw,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Server,
  Zap,
  Cpu,
  Layers,
  Play,
  Activity,
  Filter,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  KeyRound,
  GitBranch,
  Hash,
} from 'lucide-react';
import { AiComponentProps } from './types';

interface DiagnosticItem {
  id?: string;
  feature: string;
  primary_provider: string;
  failed_provider: string;
  fallback_provider?: string;
  model?: string;
  error_message: string;
  error_type?: string;
  stack_trace?: string;
  user_identifier?: string;
  user_role?: string;
  latency_ms?: number;
  attempt_number?: number;
  recovery_status: 'recovered' | 'exhausted' | 'retrying';
  created_at?: string;
  expires_at?: string;
  ttl_seconds_remaining?: number;
  ttl_formatted?: string;
  metadata?: Record<string, any>;
}

export default function AiDiagnostics(props: AiComponentProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [stats, setStats] = useState<any>({
    total24hFailures: 0,
    recoveredCount: 0,
    exhaustedCount: 0,
    recoveryRatePercent: 100,
    avgFailoverLatencyMs: 0,
    purgedExpiredCount: 0,
    activeTtlHours: 24,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'recovered' | 'exhausted' | 'retrying'
  >('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(() => {
      fetchDiagnostics(false);
    }, 15000); // 15s live sync
    return () => clearInterval(interval);
  }, []);

  const fetchDiagnostics = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/admin/ai/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data.diagnostics || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handlePurgeExpired = async () => {
    setIsPurging(true);
    try {
      const res = await fetch('/api/admin/ai/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_expired' }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: 'success',
          text: data.message || 'Expired entries purged successfully!',
        });
        await fetchDiagnostics();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.error || 'Failed to purge entries.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error occurred.',
      });
    } finally {
      setIsPurging(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleSimulateFallback = async (
    recoveryType: 'recovered' | 'exhausted'
  ) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/admin/ai/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_failure',
          feature: 'chatbot',
          primary_provider: 'gemini',
          fallback_provider: 'anthropic',
          recovery_type: recoveryType,
          user_role: roleFilter !== 'all' ? roleFilter : 'guest',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: 'success',
          text:
            recoveryType === 'recovered'
              ? 'Simulated Primary Failure -> Fallback Recovery logged with 24h TTL!'
              : 'Simulated Complete Chain Exhaustion logged with 24h TTL!',
        });
        await fetchDiagnostics();
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Simulation failed.',
      });
    } finally {
      setIsSimulating(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all failure diagnostics & fallback history now?'
      )
    )
      return;
    try {
      const res = await fetch('/api/admin/ai/diagnostics', {
        method: 'DELETE',
      });
      if (res.ok) {
        setDiagnostics([]);
        setStats((prev: any) => ({
          ...prev,
          total24hFailures: 0,
          recoveredCount: 0,
          exhaustedCount: 0,
        }));
        setFeedbackMessage({
          type: 'success',
          text: 'All diagnostics cleared successfully.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Clear failed.',
      });
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const filteredItems = diagnostics.filter((item) => {
    if (statusFilter !== 'all' && item.recovery_status !== statusFilter)
      return false;
    if (
      roleFilter !== 'all' &&
      (item.user_role || 'guest').toLowerCase() !== roleFilter.toLowerCase()
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 24-Hour Auto-Clear Protocol Header Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/70 via-gray-900 to-blue-950/70 p-6 shadow-xl md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/20 p-3 text-purple-400">
            <Clock className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                Failure Diagnostics & Fallback History
              </h2>
              <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                24-Hour TTL Auto-Expire
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-300">
              Temporary diagnostic telemetry tracking multi-provider failover,
              timeout recoveries, and error traces. Entries strictly auto-clear
              24 hours after generation.
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <button
            onClick={handlePurgeExpired}
            disabled={isPurging}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-gray-800 px-4 py-2.5 text-xs font-semibold text-purple-300 shadow-sm transition-colors hover:bg-gray-700 md:flex-none"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${isPurging ? 'animate-spin' : ''}`}
            />
            {isPurging ? 'Purging Expired...' : 'Purge Expired (24h)'}
          </button>

          <button
            onClick={() => fetchDiagnostics()}
            className="rounded-xl border border-gray-700 bg-gray-800 p-2.5 text-gray-300 transition-colors hover:bg-gray-700"
            title="Refresh Diagnostics"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedbackMessage && (
        <div
          className={`animate-fadeIn flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            feedbackMessage.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/80 text-emerald-300'
              : 'border border-red-500/30 bg-red-950/80 text-red-300'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/90 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Failures (24h)
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {stats.total24hFailures || 0}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              Rolling 24-hour log window
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/90 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Auto-Recovery Rate
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              {stats.recoveryRatePercent || 100}%
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-500/80">
              {stats.recoveredCount || 0} resolved via fallback
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/90 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Avg Failover Latency
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {stats.avgFailoverLatencyMs || 0}ms
            </div>
            <div className="mt-0.5 text-[11px] text-blue-400/80">
              Failover recovery speed
            </div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/90 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              TTL Purge Policy
            </div>
            <div className="mt-1 text-2xl font-bold text-purple-400">24.0h</div>
            <div className="mt-0.5 text-[11px] text-purple-400/80">
              {stats.purgedExpiredCount || 0} entries purged to date
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Interactive Controls & Test Engine */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5 md:flex-row md:items-center">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="mr-1 flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <span>Filter:</span>
          </div>

          <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1 text-xs">
            {(['all', 'recovered', 'exhausted', 'retrying'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                    statusFilter === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Roles</option>
            <option value="guest">Role: Guest</option>
            <option value="user">Role: Logged-in User</option>
            <option value="staff">Role: Staff</option>
            <option value="manager">Role: Manager</option>
            <option value="admin">Role: Admin</option>
          </select>
        </div>

        {/* Live Fallback Simulation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSimulateFallback('recovered')}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-600/30"
          >
            <Play className="h-3 w-3 text-emerald-400" />
            Simulate Fallback Recovery
          </button>

          <button
            onClick={() => handleSimulateFallback('exhausted')}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-600/30"
          >
            <AlertOctagon className="h-3 w-3 text-red-400" />
            Simulate Chain Outage
          </button>

          {diagnostics.length > 0 && (
            <button
              onClick={handleClearAll}
              className="ml-1 rounded-lg border border-transparent p-1.5 text-gray-400 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
              title="Clear all logs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Diagnostics Feed List */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900/60 p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <span>Active Failure Trace ({filteredItems.length})</span>
          <span className="font-mono text-[11px] normal-case text-purple-400">
            Auto-purges 24h after generation timestamp
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-sm">
              Fetching failure diagnostics & fallback history...
            </span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400 opacity-80" />
            <h4 className="text-base font-medium text-white">
              No Failure Diagnostics Found
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">
              All AI provider routes are running healthy without recent failover
              faults, or expired entries have been cleared under the 24-hour TTL
              policy.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => handleSimulateFallback('recovered')}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors hover:bg-purple-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Test Fallback Failover Simulation
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/60">
            {filteredItems.map((item, idx) => {
              const isExpanded = expandedId === (item.id || String(idx));
              const isRecovered = item.recovery_status === 'recovered';
              const isExhausted = item.recovery_status === 'exhausted';

              return (
                <div
                  key={item.id || idx}
                  className="hover:bg-gray-750 p-5 transition-colors"
                >
                  <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
                    {/* Resolution Flow Trace */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Feature Tag */}
                        <span className="rounded bg-gray-700 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-gray-300">
                          {item.feature}
                        </span>

                        {/* Error Type Badge */}
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            item.error_type === 'RATE_LIMIT_EXCEEDED'
                              ? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
                              : item.error_type === 'TIMEOUT'
                                ? 'border border-orange-500/30 bg-orange-500/20 text-orange-300'
                                : item.error_type === 'AUTH_ERROR'
                                  ? 'border border-red-500/30 bg-red-500/20 text-red-300'
                                  : 'border border-purple-500/30 bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {item.error_type || 'FAILURE'}
                        </span>

                        {/* User Role Badge */}
                        <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium capitalize text-blue-300">
                          Role: {item.user_role || 'guest'}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isRecovered
                              ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                              : isExhausted
                                ? 'border border-red-500/30 bg-red-500/20 text-red-300'
                                : 'border border-yellow-500/30 bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {isRecovered ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertOctagon className="h-3 w-3" />
                          )}
                          {isRecovered
                            ? 'Recovered via Fallback'
                            : isExhausted
                              ? 'Fallback Exhausted'
                              : 'Retrying Next Node'}
                        </span>

                        {/* Credential name badge — shown when available */}
                        {(item.metadata?.credential_name ||
                          item.metadata?.credential_id) && (
                          <span className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-300">
                            <KeyRound className="h-2.5 w-2.5" />
                            {item.metadata?.credential_name ||
                              `cred:${String(item.metadata?.credential_id).slice(0, 8)}`}
                          </span>
                        )}

                        {/* Correlation ID badge */}
                        {item.metadata?.correlation_id && (
                          <span
                            className="flex items-center gap-1 rounded border border-gray-600/50 bg-gray-700/40 px-2 py-0.5 font-mono text-[10px] text-gray-400"
                            title={item.metadata.correlation_id}
                          >
                            <Hash className="h-2.5 w-2.5" />
                            {String(item.metadata.correlation_id).slice(0, 8)}
                          </span>
                        )}

                        {/* Fallback action badge */}
                        {item.metadata?.fallback_action && (
                          <span className="flex items-center gap-1 rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                            <GitBranch className="h-2.5 w-2.5" />
                            {item.metadata.fallback_action}
                          </span>
                        )}

                        {/* Error category badge — more specific than error_type */}
                        {item.metadata?.error_category &&
                          item.metadata.error_category !== item.error_type && (
                            <span className="rounded border border-gray-600/40 bg-gray-800/60 px-2 py-0.5 font-mono text-[10px] text-gray-500">
                              {item.metadata.error_category}
                            </span>
                          )}
                      </div>

                      {/* Route Path Indicator */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-sm font-medium text-gray-200">
                        <span className="flex items-center gap-1 font-mono text-red-400 line-through opacity-80">
                          <Server className="h-3.5 w-3.5" />
                          {item.failed_provider}
                        </span>

                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />

                        {item.fallback_provider ? (
                          <span className="flex items-center gap-1 font-mono font-bold text-emerald-400">
                            <Zap className="h-3.5 w-3.5" />
                            {item.fallback_provider}
                            {item.latency_ms ? (
                              <span className="text-[11px] font-normal text-gray-400">
                                ({item.latency_ms}ms)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-red-400">
                            No online fallback
                          </span>
                        )}
                      </div>

                      <div className="max-w-3xl truncate rounded-lg border border-gray-700/80 bg-gray-900/70 px-3 py-1.5 font-mono text-xs text-gray-300">
                        {item.error_message}
                      </div>
                    </div>

                    {/* TTL Expiration & Action Controls */}
                    <div className="flex items-center gap-4 text-right">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-purple-300">
                          <Clock className="h-3.5 w-3.5 text-purple-400" />
                          <span>
                            Expires in: {item.ttl_formatted || '24h 0m'}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          Logged:{' '}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleTimeString()
                            : 'Just now'}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setExpandedId(
                            isExpanded ? null : item.id || String(idx)
                          )
                        }
                        className="flex items-center gap-1 rounded-lg bg-gray-700 p-2 text-xs text-gray-200 transition-colors hover:bg-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Technical Stack / Metadata */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 rounded-xl border-t border-gray-700/80 bg-gray-900/90 p-4 pt-4 font-mono text-xs">
                      <div className="grid grid-cols-1 gap-3 text-gray-300 md:grid-cols-2">
                        <div>
                          <strong className="text-gray-400">
                            Primary Provider:
                          </strong>{' '}
                          {item.primary_provider}
                        </div>
                        <div>
                          <strong className="text-gray-400">
                            Target Model:
                          </strong>{' '}
                          {item.model || 'Auto'}
                        </div>
                        <div>
                          <strong className="text-gray-400">
                            Attempt Count:
                          </strong>{' '}
                          #{item.attempt_number || 1}
                        </div>
                        <div>
                          <strong className="text-gray-400">
                            User Identifier:
                          </strong>{' '}
                          {item.user_identifier || 'anonymous'}
                        </div>
                        <div>
                          <strong className="text-gray-400">
                            Generated At:
                          </strong>{' '}
                          {item.created_at || new Date().toISOString()}
                        </div>
                        <div>
                          <strong className="text-gray-400">
                            TTL Expire Timestamp:
                          </strong>{' '}
                          {item.expires_at || 'Auto-expiring in 24h'}
                        </div>
                      </div>

                      {item.stack_trace && (
                        <div>
                          <div className="mb-1 font-bold text-gray-400">
                            Stack Trace:
                          </div>
                          <pre className="overflow-x-auto rounded-lg border border-red-950 bg-black/60 p-3 text-[11px] text-red-300">
                            {item.stack_trace}
                          </pre>
                        </div>
                      )}

                      {item.metadata &&
                        Object.keys(item.metadata).length > 0 && (
                          <div>
                            <div className="mb-1 font-bold text-gray-400">
                              Telemetry Metadata:
                            </div>
                            <pre className="overflow-x-auto rounded-lg border border-emerald-950 bg-black/60 p-3 text-[11px] text-emerald-300">
                              {JSON.stringify(item.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
