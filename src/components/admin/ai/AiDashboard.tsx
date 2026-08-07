import React from 'react';
import { AiComponentProps } from './types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
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

  // Format data for chart (Requests over time - mock grouping by day for simplicity, or just use raw index)
  const chartData = logs.slice(-20).map((log, i) => ({
    name: `Req ${i + 1}`,
    tokens: log.tokens_used || 0,
    cost: log.estimated_cost || 0,
  }));

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
