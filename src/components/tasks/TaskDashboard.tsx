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
      className={`group relative w-full text-left transition-all duration-200 focus:outline-none ${
        isActive
          ? 'scale-[1.02] shadow-lg shadow-emerald-500/10'
          : 'hover:-translate-y-0.5 hover:scale-[1.01]'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${bgColor} ${
          isActive
            ? 'border-emerald-500/80 bg-emerald-500/10 ring-2 ring-emerald-500/50'
            : 'border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.08]'
        }`}
      >
        {isActive && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <Check className="h-3 w-3" />
            <span>Active</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 transition-colors group-hover:text-slate-200">
              {label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div
            className={`rounded-lg p-2.5 transition-colors ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors group-hover:text-emerald-400">
          <span>
            {isActive ? 'Click to clear filter' : 'Click to filter tasks'}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
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

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-emerald-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">
              Task Manager Dashboard
            </h2>
            <p className="text-xs text-slate-400">
              Click any metric tile to filter the task list below
            </p>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium capitalize text-emerald-400">
            {stats.role}
          </span>
        </div>
        <button
          onClick={fetchDashboard}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          title="Refresh"
        >
          <Activity className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {/* Staff Dashboard */}
        {stats.role === 'staff' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                filterKey="my_open_tasks"
                label="My Open Tasks"
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </>
        )}

        {/* Manager Dashboard */}
        {stats.role === 'manager' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                filterKey="department_tasks"
                label="Department Tasks"
                value={stats.department_tasks || 0}
                icon={Package}
                color="text-blue-400"
                filterParams={{ my_tasks: false }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
              <StatCard
                filterKey="pending_assignment"
                label="Pending Assignment"
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                label="Completed Today"
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
          </>
        )}

        {/* Admin Dashboard */}
        {stats.role === 'admin' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                filterKey="total"
                label="Total Tasks"
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                label="Completed Today"
                value={stats.completed_today || 0}
                icon={TrendingUp}
                color="text-emerald-400"
                filterParams={{ completed_today: true }}
                activeFilterKey={activeFilterKey}
                onSelect={handleCardSelect}
              />
            </div>

            {/* Department Workload */}
            {stats.department_workload && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Department Workload
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(stats.department_workload).map(
                    ([dept, data]) => (
                      <div
                        key={dept}
                        className="rounded border border-white/5 bg-white/5 p-3"
                      >
                        <p className="text-sm font-medium text-white">{dept}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-[11px] text-slate-500">
                            Total: {data.total}
                          </span>
                          <span className="text-[11px] text-blue-400">
                            Open: {data.open}
                          </span>
                          <span className="text-[11px] text-rose-400">
                            Overdue: {data.overdue}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Staff Workload */}
            {stats.staff_workload && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Staff Workload
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(stats.staff_workload).map(
                    ([staffId, data]) => (
                      <div
                        key={staffId}
                        className="rounded border border-white/5 bg-white/5 p-3"
                      >
                        <p className="text-sm font-medium text-white">
                          {staffId}
                        </p>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-[11px] text-slate-500">
                            Total: {data.total}
                          </span>
                          <span className="text-[11px] text-blue-400">
                            Open: {data.open}
                          </span>
                          <span className="text-[11px] text-rose-400">
                            Overdue: {data.overdue}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`${basePath}?action=new`}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <Flag className="h-4 w-4" /> New Task
            </Link>
            <button
              type="button"
              onClick={() =>
                handleCardSelect(
                  'my_open_tasks',
                  { my_tasks: true },
                  'My Tasks'
                )
              }
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <Users className="h-4 w-4" /> My Tasks
            </button>
            <button
              type="button"
              onClick={() =>
                handleCardSelect('overdue', { overdue: true }, 'Overdue Tasks')
              }
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <AlertCircle className="h-4 w-4" /> Overdue Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
