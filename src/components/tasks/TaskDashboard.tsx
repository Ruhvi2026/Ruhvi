'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  AlertCircle,
  CheckCircle,
  Flag,
  Users,
  Package,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Minus,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DashboardStats } from './types';

interface TaskDashboardProps {
  initialStats?: DashboardStats;
  activeFilterKey?: string | null;
  onFilterSelect?: (
    filterKey: string,
    params: Record<string, any>,
    label: string
  ) => void;
}

interface StatCardProps {
  filterKey: string;
  label: string;
  value: number;
  icon: any;
  color?: string;
  bgColor?: string;
  filterParams: Record<string, any>;
  activeFilterKey?: string | null;
  onSelect?: (
    filterKey: string,
    params: Record<string, any>,
    label: string
  ) => void;
}

const StatCard = ({
  filterKey,
  label,
  value,
  icon: Icon,
  color = 'text-white',
  bgColor = 'bg-white/5',
  filterParams,
  activeFilterKey,
  onSelect,
}: StatCardProps) => {
  const isActive = activeFilterKey === filterKey;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(filterKey, filterParams, label)}
      className={`group relative w-full text-left transition-all duration-150 focus:outline-none ${
        isActive ? 'shadow-xs scale-[1.01]' : 'hover:-translate-y-0.5'
      }`}
    >
      <div
        className={`relative flex items-center justify-between overflow-hidden rounded-lg border px-2.5 py-1.5 transition-colors ${bgColor} ${
          isActive
            ? 'border-emerald-500/80 bg-emerald-500/15 ring-1 ring-emerald-500/50'
            : 'border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.08]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`shrink-0 rounded-md p-1 transition-colors ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-medium uppercase tracking-wider text-slate-400 transition-colors group-hover:text-slate-200">
              {label}
            </p>
            <p className={`text-sm font-bold leading-tight ${color}`}>
              {value}
            </p>
          </div>
        </div>

        {isActive ? (
          <span className="py-0.2 shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-1 text-[8px] font-semibold text-emerald-400">
            Active
          </span>
        ) : (
          <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-500 opacity-0 transition-all group-hover:text-emerald-400 group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
};

export default function TaskDashboard({
  initialStats,
  activeFilterKey,
  onFilterSelect,
}: TaskDashboardProps) {
  const pathname = usePathname();
  const basePath = pathname ? pathname.split('?')[0] : '/admin/task-manager';
  const [stats, setStats] = useState<DashboardStats | null>(
    initialStats || null
  );
  const [loading, setLoading] = useState(!initialStats);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!initialStats) {
      fetchDashboard();
    }
    const handleTaskUpdated = () => {
      fetchDashboard();
    };
    window.addEventListener('task-created-or-updated', handleTaskUpdated);
    return () =>
      window.removeEventListener('task-created-or-updated', handleTaskUpdated);
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/task-manager/dashboard');
      const data = await response.json();
      setStats(data.dashboard);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (
    key: string,
    params: Record<string, any>,
    label: string
  ) => {
    if (activeFilterKey === key) {
      onFilterSelect?.('', {}, '');
    } else {
      onFilterSelect?.(key, params, label);
    }
  };

  if (loading) {
    return (
      <div className="flex h-10 items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex flex-col bg-[#0d0f1a]">
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-1.5">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
          <h2 className="text-xs font-semibold text-white">Task Overview</h2>
          <span className="py-0.2 rounded bg-emerald-500/10 px-1.5 text-[9px] font-medium capitalize text-emerald-400">
            {stats.role}
          </span>
          <span className="hidden text-[11px] text-slate-500 sm:inline">
            • Click metric to filter
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterKey && (
            <button
              onClick={() => onFilterSelect?.('', {}, '')}
              className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
            >
              Clear Filter
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            title={collapsed ? 'Show Dashboard' : 'Hide Dashboard'}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={fetchDashboard}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            title="Refresh metrics"
          >
            <Activity className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content (Collapsible) */}
      {!collapsed && (
        <div className="space-y-1.5 pt-1">
          {/* Staff Dashboard */}
          {stats.role === 'staff' && (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                filterKey="my_open_tasks"
                label="My Open"
                value={stats.my_open_tasks || 0}
                icon={Flag}
                color="text-blue-400"
                filterParams={{ my_tasks: true, my_open_tasks: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="due_today"
                label="Due Today"
                value={stats.due_today || 0}
                icon={Clock}
                color="text-amber-400"
                filterParams={{ my_tasks: true, due_today: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="due_soon"
                label="Due Soon"
                value={stats.due_soon || 0}
                icon={ArrowUpRight}
                color="text-emerald-400"
                filterParams={{ my_tasks: true, due_soon: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="overdue"
                label="Overdue"
                value={stats.overdue || 0}
                icon={AlertCircle}
                color="text-rose-400"
                filterParams={{ my_tasks: true, overdue: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="supporting"
                label="Supporting"
                value={stats.supporting || 0}
                icon={Users}
                color="text-purple-400"
                filterParams={{ supporting: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="spectating"
                label="Spectating"
                value={stats.spectating || 0}
                icon={Eye}
                color="text-slate-400"
                filterParams={{ spectating: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
            </div>
          )}

          {/* Manager Dashboard */}
          {stats.role === 'manager' && (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              <StatCard
                filterKey="department_tasks"
                label="Dept Tasks"
                value={stats.department_tasks || 0}
                icon={Package}
                color="text-blue-400"
                filterParams={{ my_tasks: false }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="pending_assignment"
                label="Pending"
                value={stats.pending_assignment || 0}
                icon={Users}
                color="text-amber-400"
                filterParams={{ unassigned: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="high_priority"
                label="High Priority"
                value={stats.high_priority || 0}
                icon={Flag}
                color="text-red-400"
                filterParams={{ high_priority: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="overdue"
                label="Overdue"
                value={stats.overdue || 0}
                icon={AlertCircle}
                color="text-rose-400"
                filterParams={{ overdue: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="unassigned"
                label="Unassigned"
                value={stats.unassigned || 0}
                icon={Minus}
                color="text-slate-400"
                filterParams={{ unassigned: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="completed_today"
                label="Done Today"
                value={stats.completed_today || 0}
                icon={CheckCircle}
                color="text-emerald-400"
                filterParams={{ completed_today: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="sla_breached"
                label="SLA Breached"
                value={stats.sla_breached || 0}
                icon={AlertCircle}
                color="text-rose-400"
                filterParams={{ sla_breached: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
            </div>
          )}

          {/* Admin Dashboard */}
          {stats.role === 'admin' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                <StatCard
                  filterKey="total"
                  label="Total"
                  value={stats.total || 0}
                  icon={Package}
                  color="text-white"
                  filterParams={{}}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
                <StatCard
                  filterKey="open"
                  label="Open"
                  value={stats.open || 0}
                  icon={Flag}
                  color="text-blue-400"
                  filterParams={{ status: 'Open' }}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
                <StatCard
                  filterKey="in_progress"
                  label="In Progress"
                  value={stats.in_progress || 0}
                  icon={Activity}
                  color="text-amber-400"
                  filterParams={{ status: 'In Progress' }}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
                <StatCard
                  filterKey="completed"
                  label="Completed"
                  value={stats.completed || 0}
                  icon={CheckCircle}
                  color="text-emerald-400"
                  filterParams={{ status: 'Completed' }}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
                <StatCard
                  filterKey="overdue"
                  label="Overdue"
                  value={stats.overdue || 0}
                  icon={AlertCircle}
                  color="text-rose-400"
                  filterParams={{ overdue: true }}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
                <StatCard
                  filterKey="sla_breached"
                  label="SLA Breached"
                  value={stats.sla_breached || 0}
                  icon={AlertCircle}
                  color="text-red-500"
                  filterParams={{ sla_breached: true }}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
                <StatCard
                  filterKey="completed_today"
                  label="Done Today"
                  value={stats.completed_today || 0}
                  icon={TrendingUp}
                  color="text-emerald-400"
                  filterParams={{ completed_today: true }}
                  activeFilterKey={activeFilterKey}
                  onSelect={handleCardSelect}
                />
              </div>

              {/* Department Workload Compact */}
              {stats.department_workload &&
                Object.keys(stats.department_workload).length > 0 && (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Dept Workload:
                      </span>
                      {Object.entries(stats.department_workload).map(
                        ([dept, data]) => (
                          <div
                            key={dept}
                            className="flex items-center gap-1.5 rounded border border-white/5 bg-white/5 px-2 py-0.5 text-[10px]"
                          >
                            <span className="font-medium text-slate-300">
                              {dept}
                            </span>
                            <span className="rounded bg-white/10 px-1 text-[9px] font-bold text-white">
                              {data.total}
                            </span>
                            {data.overdue > 0 && (
                              <span className="rounded bg-rose-500/20 px-1 text-[9px] font-semibold text-rose-400">
                                {data.overdue} overdue
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
