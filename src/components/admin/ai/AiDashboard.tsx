import React, { useMemo } from 'react';
import { AiComponentProps } from './types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Server,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export default function AiDashboard({
  logs,
  providers,
  features,
}: AiComponentProps) {
  // Compute basic stats
  const totalRequests = logs.length;
  const successfulRequests = logs.filter((l) => l.status === 'success').length;
  const failedRequests = totalRequests - successfulRequests;
  const successRate =
    totalRequests === 0
      ? 0
      : Math.round((successfulRequests / totalRequests) * 100);

  const totalTokens = logs.reduce(
    (acc, log) => acc + (log.tokens_used || 0),
    0
  );
  const totalCost = logs.reduce(
    (acc, log) => acc + (log.estimated_cost || 0),
    0
  );

  const activeProviders = providers.filter(
    (p) => p.isEnabled && p.status === 'online'
  ).length;
  const offlineProviders = providers.filter(
    (p) => p.isEnabled && p.status === 'offline'
  ).length;

  const chatConfig = features['chatbot'];
  const defaultProvider = chatConfig?.provider || 'None';

  const chartData = logs.slice(-20).map((log, i) => ({
    name: `Req ${i + 1}`,
    tokens: log.tokens_used || 0,
    cost: log.estimated_cost || 0,
  }));

  // Compute per-provider health score (0–100)
  // Score = successRate% − latencyPenalty − failurePenalty (floor 0, cap 100)
  const providerHealthScores = useMemo(() => {
    return providers
      .filter((p) => p.isEnabled)
      .map((p) => {
        const pLogs = logs.filter((l) => l.provider === p.id);
        const total = pLogs.length;
        const successes = pLogs.filter((l) => l.status === 'success').length;
        const failures = total - successes;
        const successRate =
          total === 0 ? 100 : Math.round((successes / total) * 100);
        // Penalty: 2pts per failure up to 30, 0 when total is low
        const failurePenalty = Math.min(failures * 2, 30);
        const score = Math.max(0, Math.min(100, successRate - failurePenalty));
        const colorClass =
          score >= 90
            ? 'text-emerald-400'
            : score >= 70
              ? 'text-yellow-400'
              : 'text-red-400';
        const bgClass =
          score >= 90
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : score >= 70
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-red-500/10 border-red-500/20';
        return {
          id: p.id,
          name: p.name || p.id,
          status: p.status || 'offline',
          score,
          successRate,
          total,
          failures,
          colorClass,
          bgClass,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [providers, logs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Requests</p>
              <h3 className="mt-1 text-2xl font-bold text-white">
                {totalRequests}
              </h3>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-3">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Success Rate</p>
              <h3 className="mt-1 text-2xl font-bold text-white">
                {successRate}%
              </h3>
            </div>
            <div className="rounded-lg bg-green-500/20 p-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Token Usage</p>
              <h3 className="mt-1 text-2xl font-bold text-white">
                {totalTokens.toLocaleString()}
              </h3>
            </div>
            <div className="rounded-lg bg-purple-500/20 p-3">
              <Zap className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">System Health</p>
              <h3 className="mt-1 text-2xl font-bold text-white">
                {offlineProviders > 0 ? 'Warning' : 'Healthy'}
              </h3>
            </div>
            <div
              className={`rounded-lg p-3 ${offlineProviders > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}
            >
              {offlineProviders > 0 ? (
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              ) : (
                <Activity className="h-6 w-6 text-green-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-6 text-lg font-medium text-white">
            Recent Token Usage
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="tokens" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-6 text-lg font-medium text-white">
            System Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 py-2">
              <span className="text-gray-400">Active Providers</span>
              <span className="font-medium text-white">{activeProviders}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-700 py-2">
              <span className="text-gray-400">Failed Requests</span>
              <span className="font-medium text-red-400">{failedRequests}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-700 py-2">
              <span className="text-gray-400">Estimated Cost</span>
              <span className="font-medium text-white">
                ${totalCost.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-700 py-2">
              <span className="text-gray-400">Default Chat Provider</span>
              <span className="font-medium text-white">{defaultProvider}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Health Scores */}
      {providerHealthScores.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-medium text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Provider Health Scores
            </h3>
            <span className="text-xs text-gray-400">
              Computed from success rate &amp; failure history
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providerHealthScores.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl border p-4 ${p.bgClass}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      p.score >= 90
                        ? 'bg-emerald-500/20'
                        : p.score >= 70
                          ? 'bg-yellow-500/20'
                          : 'bg-red-500/20'
                    }`}
                  >
                    <Server
                      className={`h-4 w-4 ${p.score >= 90 ? 'text-emerald-400' : p.score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-gray-400">
                      {p.total} req · {p.failures} fail
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-bold tabular-nums ${p.colorClass}`}
                  >
                    {p.score}
                  </div>
                  <div className="text-xs text-gray-500">/ 100</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events Table */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h3 className="mb-4 text-lg font-medium text-white">
          Recent AI Events
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="rounded-tl-lg px-4 py-3">Time</th>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="rounded-tr-lg px-4 py-3">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 5).map((log, i) => (
                <tr key={i} className="border-b border-gray-700/50">
                  <td className="px-4 py-3 text-white">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{log.feature}</td>
                  <td className="px-4 py-3">
                    {log.provider} ({log.model})
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        log.status === 'success'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {log.tokens_used || '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    No recent events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
