'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Clock,
  AlertCircle,
  CheckCircle,
  Flag,
  Users,
  Package,
  TrendingUp,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { DashboardStats } from './types';

interface TaskDashboardProps {
  initialStats?: DashboardStats;
}

export default function TaskDashboard({ initialStats }: TaskDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (!initialStats) {
      fetchDashboard();
    }
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

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color = 'text-white',
    bgColor = 'bg-white/5',
  }: {
    label: string;
    value: number;
    icon: any;
    color?: string;
    bgColor?: string;
  }) => (
    <div className={`rounded-lg border p-4 ${bgColor} border-white/10`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className="h-6 w-6 text-slate-500" />
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">
            Task Manager Dashboard
          </h2>
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
                label="My Open Tasks"
                value={stats.my_open_tasks || 0}
                icon={Flag}
                color="text-blue-400"
              />
              <StatCard
                label="Due Today"
                value={stats.due_today || 0}
                icon={Clock}
                color="text-amber-400"
              />
              <StatCard
                label="Due Soon"
                value={stats.due_soon || 0}
                icon={ArrowUpRight}
                color="text-emerald-400"
              />
              <StatCard
                label="Overdue"
                value={stats.overdue || 0}
                icon={AlertCircle}
                color="text-rose-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Supporting"
                value={stats.supporting || 0}
                icon={Users}
                color="text-purple-400"
              />
              <StatCard
                label="Spectating"
                value={stats.spectating || 0}
                icon={EyeIcon}
                color="text-slate-400"
              />
            </div>
          </>
        )}

        {/* Manager Dashboard */}
        {stats.role === 'manager' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Department Tasks"
                value={stats.department_tasks || 0}
                icon={Package}
                color="text-blue-400"
              />
              <StatCard
                label="Pending Assignment"
                value={stats.pending_assignment || 0}
                icon={Users}
                color="text-amber-400"
              />
              <StatCard
                label="High Priority"
                value={stats.high_priority || 0}
                icon={Flag}
                color="text-red-400"
              />
              <StatCard
                label="Overdue"
                value={stats.overdue || 0}
                icon={AlertCircle}
                color="text-rose-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Unassigned"
                value={stats.unassigned || 0}
                icon={Minus}
                color="text-slate-400"
              />
              <StatCard
                label="Completed Today"
                value={stats.completed_today || 0}
                icon={CheckCircle}
                color="text-emerald-400"
              />
              <StatCard
                label="SLA Breached"
                value={stats.sla_breached || 0}
                icon={AlertCircle}
                color="text-rose-400"
              />
            </div>
          </>
        )}

        {/* Admin Dashboard */}
        {stats.role === 'admin' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Tasks"
                value={stats.total || 0}
                icon={Package}
                color="text-white"
              />
              <StatCard
                label="Open"
                value={stats.open || 0}
                icon={Flag}
                color="text-blue-400"
              />
              <StatCard
                label="In Progress"
                value={stats.in_progress || 0}
                icon={Activity}
                color="text-amber-400"
              />
              <StatCard
                label="Completed"
                value={stats.completed || 0}
                icon={CheckCircle}
                color="text-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Overdue"
                value={stats.overdue || 0}
                icon={AlertCircle}
                color="text-rose-400"
              />
              <StatCard
                label="SLA Breached"
                value={stats.sla_breached || 0}
                icon={AlertCircle}
                color="text-red-500"
              />
              <StatCard
                label="Completed Today"
                value={stats.completed_today || 0}
                icon={TrendingUp}
                color="text-emerald-400"
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
              href="/admin/task-manager/new"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <Flag className="h-4 w-4" /> New Task
            </Link>
            <Link
              href="/admin/task-manager?my_tasks=true"
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <Users className="h-4 w-4" /> My Tasks
            </Link>
            <Link
              href="/admin/task-manager?overdue=true"
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <AlertCircle className="h-4 w-4" /> Overdue Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Missing icon component
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
