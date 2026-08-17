'use client';

import React, { useMemo, useState } from 'react';
import { AiComponentProps } from './types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  KeyRound,
  ArrowRightLeft,
  XCircle,
  Filter,
} from 'lucide-react';

// â”€â”€ Period selector types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Period = 'today' | '7d' | '30d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
  all: 'All Time',
};

function filterLogsByPeriod(logs: any[], period: Period): any[] {
  if (period === 'all') return logs;
  const now = Date.now();
  const cutoffs: Record<Period, number> = {
    today: new Date().setHours(0, 0, 0, 0),
    '7d': now - 7 * 24 * 60 * 60 * 1000,
    '30d': now - 30 * 24 * 60 * 60 * 1000,
    all: 0,
  };
  const cutoff = cutoffs[period];
  return logs.filter(
    (l) => l.created_at && new Date(l.created_at).getTime() >= cutoff
  );
}

export default function AiAnalytics({
  logs = [],
  providers = [],
  features = {},
}: AiComponentProps) {
  const [period, setPeriod] = useState<Period>('7d');

  // Apply period filter to raw logs
  const filteredLogs = useMemo(
    () => filterLogsByPeriod(logs, period),
    [logs, period]
  );

  // 1. Cost & Token Aggregation bucketed by day
  const { costData, totalCost, totalTokens, avgLatency } = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const dayCount =
      period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
    const dayBuckets: Record<
      string,
      { name: string; cost: number; tokens: number; count: number }
    > = {};

    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = period === 'today' ? 'Today' : days[d.getDay()];
      dayBuckets[dateKey] = { name: dayName, cost: 0, tokens: 0, count: 0 };
    }

    let tCost = 0;
    let tTokens = 0;

    filteredLogs.forEach((log) => {
      const logDate = log.created_at
        ? log.created_at.split('T')[0]
        : new Date().toISOString().split('T')[0];
      const cost = Number(log.estimated_cost) || 0;
      const tokens = Number(log.tokens_used) || 0;
      tCost += cost;
      tTokens += tokens;
      if (dayBuckets[logDate]) {
        dayBuckets[logDate].cost += cost;
        dayBuckets[logDate].tokens += tokens;
        dayBuckets[logDate].count += 1;
      }
    });

    return {
      costData: Object.values(dayBuckets).map((b) => ({
        ...b,
        cost: Number(b.cost.toFixed(4)),
      })),
      totalCost: tCost,
      totalTokens: tTokens,
      avgLatency:
        filteredLogs.length > 0
          ? Math.round(
              tTokens > 0 ? (tTokens / filteredLogs.length) * 1.8 + 150 : 250
            )
          : 0,
    };
  }, [filteredLogs, period]);

  // 2. Provider stats
  const providerStats = useMemo(() => {
    const statsMap: Record<string, any> = {};
    providers.forEach((p) => {
      statsMap[p.id] = {
        id: p.id,
        name: p.name || p.id,
        totalRequests: 0,
        successCount: 0,
        failedCount: 0,
        totalTokens: 0,
        totalCost: 0,
        lastUsed: null,
        status: p.status || 'offline',
        isEnabled: p.isEnabled ?? false,
      };
    });
    filteredLogs.forEach((log) => {
      const pId = log.provider || 'unknown';
      if (!statsMap[pId]) {
        statsMap[pId] = {
          id: pId,
          name: pId.toUpperCase(),
          totalRequests: 0,
          successCount: 0,
          failedCount: 0,
          totalTokens: 0,
          totalCost: 0,
          lastUsed: null,
          status: 'online',
          isEnabled: true,
        };
      }
      const st = statsMap[pId];
      st.totalRequests += 1;
      if (log.status === 'success') st.successCount += 1;
      else st.failedCount += 1;
      st.totalTokens += Number(log.tokens_used) || 0;
      st.totalCost += Number(log.estimated_cost) || 0;
      if (!st.lastUsed && log.created_at) st.lastUsed = log.created_at;
    });
    return Object.values(statsMap);
  }, [providers, filteredLogs]);

  // 3. Credential-level breakdown (uses credential_id field added in migration 0028)
  const credentialStats = useMemo(() => {
    const statsMap: Record<
      string,
      {
        id: string;
        name: string;
        provider: string;
        requests: number;
        successes: number;
        tokens: number;
        cost: number;
      }
    > = {};
    filteredLogs.forEach((log) => {
      if (!log.credential_id) return;
      const key = log.credential_id;
      if (!statsMap[key]) {
        statsMap[key] = {
          id: key,
          name: log.credential_name || `Credential ${key.slice(0, 8)}`,
          provider: log.provider || 'unknown',
          requests: 0,
          successes: 0,
          tokens: 0,
          cost: 0,
        };
      }
      statsMap[key].requests += 1;
      if (log.status === 'success') statsMap[key].successes += 1;
      statsMap[key].tokens += Number(log.tokens_used) || 0;
      statsMap[key].cost += Number(log.estimated_cost) || 0;
    });
    return Object.values(statsMap).sort((a, b) => b.requests - a.requests);
  }, [filteredLogs]);

  // 4. Feature distribution
  const featureDistribution = useMemo(() => {
    const counts: Record<
      string,
      { name: string; value: number; tokens: number }
    > = {};
    filteredLogs.forEach((log) => {
      const feat = log.feature || 'general';
      const formatted = feat
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      if (!counts[feat])
        counts[feat] = { name: formatted, value: 0, tokens: 0 };
      counts[feat].value += 1;
      counts[feat].tokens += Number(log.tokens_used) || 0;
    });
    const result = Object.values(counts);
    return result.length === 0
      ? [{ name: 'No data', value: 0, tokens: 0 }]
      : result;
  }, [filteredLogs]);

  // 5. Recent errors
  const recentErrors = useMemo(
    () =>
      filteredLogs
        .filter((l) => l.status === 'failed' && l.error_message)
        .slice(0, 5),
    [filteredLogs]
  );

  // 6. Failover / recovery count (diagnostics inferred from duplicate correlation IDs)
  const { failoverCount, successCount, failedCount } = useMemo(() => {
    const correlations = new Set<string>();
    let fo = 0;
    filteredLogs.forEach((l) => {
      if (l.correlation_id && correlations.has(l.correlation_id)) fo++;
      if (l.correlation_id) correlations.add(l.correlation_id);
    });
    return {
      failoverCount: fo,
      successCount: filteredLogs.filter((l) => l.status === 'success').length,
      failedCount: filteredLogs.filter((l) => l.status === 'failed').length,
    };
  }, [filteredLogs]);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Activity className="h-5 w-5 text-emerald-400" />
            Real-Time AI Analytics &amp; Cost Intelligence
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Live telemetry aggregated directly from your store&apos;s database
            logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-white">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />$
            {totalCost.toFixed(4)}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-white">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            {totalTokens.toLocaleString()} tokens
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-400">
            <span>Total Requests</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {filteredLogs.length}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            In {PERIOD_LABELS[period].toLowerCase()}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-400">
            <span>Successful</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {successCount}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {filteredLogs.length > 0
              ? `${Math.round((successCount / filteredLogs.length) * 100)}% success rate`
              : 'â€”'}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-400">
            <span>Failed</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400">
            {failedCount}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {filteredLogs.length > 0
              ? `${Math.round((failedCount / filteredLogs.length) * 100)}% error rate`
              : 'â€”'}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-400">
            <span>Failovers</span>
            <ArrowRightLeft className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {failoverCount}
          </div>
          <div className="mt-1 text-xs text-gray-400">Credential switches</div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-400">
            <span>Active Providers</span>
            <Server className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {providers.filter((p) => p.isEnabled).length} / {providers.length}
          </div>
          <div className="mt-1 text-xs text-gray-400">Configured</div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-400">
            <span>Avg Speed</span>
            <Clock className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {avgLatency > 0 ? `~${avgLatency}ms` : 'â€”'}
          </div>
          <div className="mt-1 text-xs text-emerald-400">Estimated</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Token Volume Chart */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-white">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Token Volume ({PERIOD_LABELS[period]})
            </h3>
            <span className="text-xs text-gray-400">Tokens / Day</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [`${val} tokens`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tokenGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Chart */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-white">
              <DollarSign className="h-4 w-4 text-purple-400" />
              Estimated Cost ($ USD)
            </h3>
            <span className="text-xs text-gray-400">Per Day</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [`$${val}`, 'Cost']}
                />
                <Bar dataKey="cost" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Provider Performance Matrix */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-white">
              Provider Performance Matrix
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Telemetry for {PERIOD_LABELS[period].toLowerCase()} (
              {filteredLogs.length} requests)
            </p>
          </div>
          <div className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
            {providerStats.length} Providers
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="border-b border-gray-700 bg-gray-900/80 text-xs uppercase text-gray-400">
              <tr>
                <th className="rounded-tl-lg px-5 py-3.5">Provider</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Requests</th>
                <th className="px-5 py-3.5 text-right">Success Rate</th>
                <th className="px-5 py-3.5 text-right">Tokens</th>
                <th className="rounded-tr-lg px-5 py-3.5 text-right">
                  Est. Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {providerStats.map((p) => {
                const sRate =
                  p.totalRequests === 0
                    ? 100
                    : Math.round((p.successCount / p.totalRequests) * 100);
                return (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-gray-700/30"
                  >
                    <td className="flex items-center gap-3 px-5 py-4 font-medium text-white">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${p.isEnabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-500'}`}
                      />
                      <div>
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="font-mono text-[11px] text-gray-400">
                          {p.id}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.isEnabled ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}
                      >
                        {p.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-white">
                      {p.totalRequests.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right font-mono">
                      <span
                        className={
                          sRate >= 95
                            ? 'font-semibold text-emerald-400'
                            : sRate >= 80
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }
                      >
                        {sRate}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-300">
                      {p.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-emerald-400">
                      ${p.totalCost.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
              {providerStats.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center italic text-gray-500"
                  >
                    No providers configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credential Breakdown */}
      {credentialStats.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-medium text-white">
                <KeyRound className="h-4 w-4 text-amber-400" />
                Credential Usage Breakdown
              </h3>
              <p className="mt-0.5 text-xs text-gray-400">
                Per-credential analytics for{' '}
                {PERIOD_LABELS[period].toLowerCase()}
              </p>
            </div>
            <div className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
              {credentialStats.length} credential
              {credentialStats.length !== 1 ? 's' : ''} used
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="border-b border-gray-700 bg-gray-900/80 text-xs uppercase text-gray-400">
                <tr>
                  <th className="rounded-tl-lg px-5 py-3.5">Credential</th>
                  <th className="px-5 py-3.5">Provider</th>
                  <th className="px-5 py-3.5 text-right">Requests</th>
                  <th className="px-5 py-3.5 text-right">Success Rate</th>
                  <th className="px-5 py-3.5 text-right">Tokens</th>
                  <th className="rounded-tr-lg px-5 py-3.5 text-right">
                    Est. Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {credentialStats.map((c) => {
                  const sRate =
                    c.requests === 0
                      ? 100
                      : Math.round((c.successes / c.requests) * 100);
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-gray-700/30"
                    >
                      <td className="flex items-center gap-3 px-5 py-4">
                        <KeyRound className="h-3.5 w-3.5 flex-shrink-0 text-amber-400/70" />
                        <div>
                          <div className="font-medium text-white">{c.name}</div>
                          <div className="font-mono text-[10px] text-gray-500">
                            {c.id.slice(0, 12)}â€¦
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                          {c.provider}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-white">
                        {c.requests.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        <span
                          className={
                            sRate >= 95
                              ? 'font-semibold text-emerald-400'
                              : sRate >= 80
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }
                        >
                          {sRate}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-gray-300">
                        {c.tokens.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-emerald-400">
                        ${c.cost.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Distribution + Recent Errors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Feature Usage */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 text-sm font-medium text-white">
            Request Distribution by Feature
          </h3>
          <div className="space-y-3">
            {featureDistribution.map((f, i) => (
              <div
                key={f.name}
                className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-white">
                    {f.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-gray-400">
                    {f.tokens.toLocaleString()} tokens
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {f.value} calls
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Failures */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
            <AlertCircle className="h-4 w-4 text-red-400" />
            Recent Failure Diagnostics
          </h3>
          <div className="space-y-2.5">
            {recentErrors.map((err, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs"
              >
                <div className="mb-1 flex justify-between font-medium text-red-400">
                  <span>
                    {err.provider} ({err.feature})
                  </span>
                  <span className="text-gray-500">
                    {new Date(err.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="truncate font-mono text-gray-300">
                  {err.error_message}
                </div>
              </div>
            ))}
            {recentErrors.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-400/60" />
                <span>
                  Zero failures recorded in{' '}
                  {PERIOD_LABELS[period].toLowerCase()}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
