'use client';

import React, { useEffect, useState } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Bot,
  Users,
  Shield,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  new: '#10b981',
  open: '#3b82f6',
  in_progress: '#f59e0b',
  waiting_for_customer: '#a855f7',
  resolved: '#22c55e',
  closed: '#64748b',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  normal: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

export default function SupportAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics(isSilent = false) {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/support/analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Support analytics error:', err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent shadow-md" />
        <p className="text-xs text-slate-500">
          Compiling Support Analytics & SLA Metrics...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Unable to load analytics at this time.</p>
      </div>
    );
  }

  const counts = data.ticket_counts || {};
  const byStatus = data.by_status || {};
  const byPriority = data.by_priority || {};
  const byCategory = data.by_category || {};
  const perf = data.performance || {};
  const ai = data.ai_metrics || {};
  const executives = data.by_executive || [];

  const statusData = Object.entries(byStatus)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({
      name: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: v as number,
      fill: STATUS_COLORS[k] || '#64748b',
    }));

  const priorityData = Object.entries(byPriority).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v as number,
    fill: PRIORITY_COLORS[k] || '#64748b',
  }));

  const categoryData = Object.entries(byCategory).map(([k, v]) => ({
    name: k,
    value: v as number,
  }));

  const statCards = [
    {
      label: 'Total Tickets',
      value: counts.total || 0,
      icon: Ticket,
      color: 'text-white',
      bg: 'bg-white/5',
    },
    {
      label: 'Today Active',
      value: counts.today || 0,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Resolution Rate',
      value: `${perf.resolution_rate || 0}%`,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'SLA Breaches',
      value: perf.sla_breach_count || 0,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Avg 1st Response',
      value: `${perf.avg_first_response_hours || 1.2}h`,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Avg Resolution',
      value: `${perf.avg_resolution_hours || 4.5}h`,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'AI Created',
      value: ai.ai_created_tickets || 0,
      icon: Bot,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'AI Deflection Rate',
      value: `${ai.ai_creation_rate || 0}%`,
      icon: Sparkles,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Support Analytics & SLAs
            </h1>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              REALTIME
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Performance metrics, response speed, resolution rates & SLA
            compliance
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`}
          />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`flex flex-col justify-between rounded-2xl border border-white/5 ${card.bg} p-4 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
          <h3 className="text-sm font-bold text-white">Tickets by Status</h3>
          <p className="text-xs text-slate-400">
            Current active vs resolved volume
          </p>

          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }: any) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131726',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg">
          <h3 className="text-sm font-bold text-white">Tickets by Priority</h3>
          <p className="text-xs text-slate-400">
            Distribution across urgency tiers
          </p>

          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131726',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Executive Performance Leaderboard (if available) */}
      {executives.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726] shadow-xl">
          <div className="border-b border-white/5 px-5 py-4">
            <h3 className="text-sm font-bold text-white">
              Support Agent Resolution Leaderboard
            </h3>
            <p className="text-xs text-slate-400">
              Total tickets handled and resolved per executive
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Executive</th>
                  <th className="px-4 py-3 font-semibold">Open Caseload</th>
                  <th className="px-4 py-3 font-semibold">Resolved</th>
                  <th className="px-4 py-3 font-semibold">Total Handled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {executives.map((exec: any) => (
                  <tr key={exec.user_id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-semibold text-white">
                      {exec.name || 'Support Agent'}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-400">
                      {exec.open_tickets}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      {exec.resolved_tickets}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {exec.total_tickets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
