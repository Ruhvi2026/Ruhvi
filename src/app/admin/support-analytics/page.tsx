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

const CHART_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#22c55e',
  '#64748b',
];
const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  normal: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

export default function SupportAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/admin/support-analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Unable to load analytics.</p>
      </div>
    );
  }

  const counts = data.ticket_counts || {};
  const byStatus = data.by_status || {};
  const byPriority = data.by_priority || {};
  const perf = data.performance || {};
  const ai = data.ai_metrics || {};

  const statusData = Object.entries(byStatus)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({
      name: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: v as number,
    }));

  const priorityData = Object.entries(byPriority).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v as number,
    fill: PRIORITY_COLORS[k] || '#64748b',
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
      label: 'Today',
      value: counts.today || 0,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'This Week',
      value: counts.this_week || 0,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'This Month',
      value: counts.this_month || 0,
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
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
      label: 'AI Created',
      value: ai.ai_created_tickets || 0,
      icon: Bot,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'AI Rate',
      value: `${ai.ai_creation_rate || 0}%`,
      icon: Shield,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Support Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Customer support operational metrics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-white/5 ${card.bg} p-4`}
          >
            <div className="flex items-center justify-between">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Status Distribution
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-600">
              No ticket data yet
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Priority Breakdown
          </h3>
          {priorityData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-600">
              No ticket data yet
            </div>
          )}
        </div>
      </div>

      {/* Team Performance (if available) */}
      {data.by_executive && data.by_executive.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#131726]">
          <div className="border-b border-white/5 px-5 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-emerald-400" />
              Team Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Executive</th>
                  <th className="px-5 py-2.5 font-semibold">Open</th>
                  <th className="px-5 py-2.5 font-semibold">Resolved</th>
                  <th className="px-5 py-2.5 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.by_executive.map((exec: any) => (
                  <tr key={exec.user_id} className="text-slate-300">
                    <td className="px-5 py-2.5 font-medium">
                      {exec.name || 'Unknown'}
                    </td>
                    <td className="px-5 py-2.5">{exec.open_tickets}</td>
                    <td className="px-5 py-2.5 text-green-400">
                      {exec.resolved_tickets}
                    </td>
                    <td className="px-5 py-2.5">{exec.total_tickets}</td>
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
