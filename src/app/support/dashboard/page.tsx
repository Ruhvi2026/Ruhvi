'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Inbox,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Sparkles,
  Zap,
  Users,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSupportRealtime } from '@/hooks/useSupportRealtime';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active_tickets_count: number;
  resolved_today_count: number;
  capacity_level: 'optimal' | 'moderate' | 'heavy';
}

interface TicketRecord {
  id: string;
  ticket_number: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status:
    | 'new'
    | 'open'
    | 'in_progress'
    | 'waiting_for_customer'
    | 'resolved'
    | 'closed';
  created_at: string;
  sla_due_at?: string;
  sla_breached?: boolean;
  ai_created?: boolean;
  assigned_to?: string | null;
  customer?: { id?: string; full_name?: string; email?: string } | null;
  assigned?: { id?: string; full_name?: string; email?: string } | null;
  category?: { id?: string; name?: string } | null;
}

const PRIORITY_BADGES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  urgent: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  high: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  normal: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  low: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
};

const STATUS_BADGES: Record<string, { bg: string }> = {
  new: { bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  open: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  in_progress: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  waiting_for_customer: {
    bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  resolved: { bg: 'bg-green-500/10 text-green-400 border-green-500/20' },
  closed: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const STATUS_NAMES: Record<string, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_customer: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#10b981',
  open: '#3b82f6',
  in_progress: '#f59e0b',
  waiting_for_customer: '#a855f7',
  resolved: '#22c55e',
  closed: '#64748b',
};

export default function SupportDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketRecord[]>([]);
  const [unassignedTickets, setUnassignedTickets] = useState<TicketRecord[]>(
    []
  );
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(
    null
  );

  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    new: 0,
    open: 0,
    in_progress: 0,
    waiting_for_customer: 0,
    unassigned: 0,
    urgent: 0,
    sla_at_risk: 0,
    resolved_today: 0,
    resolution_rate: 0,
  });

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch team members & workloads
      const teamRes = await fetch('/api/support/team');
      const teamData = await teamRes.json();
      if (teamData.team) {
        setTeamMembers(teamData.team);
      }

      // 2. Fetch ticket list (all active)
      const ticketsRes = await fetch(
        '/api/support/tickets?limit=50&sort=created_at&order=desc'
      );
      const ticketsData = await ticketsRes.json();

      if (ticketsData.tickets) {
        const tList: TicketRecord[] = ticketsData.tickets;

        const newCounts = {
          total: ticketsData.total || tList.length,
          active: 0,
          new: 0,
          open: 0,
          in_progress: 0,
          waiting_for_customer: 0,
          unassigned: 0,
          urgent: 0,
          sla_at_risk: 0,
          resolved_today: 0,
          resolution_rate: 0,
        };

        const todayStr = new Date().toDateString();
        const unassignedArr: TicketRecord[] = [];

        tList.forEach((t) => {
          if (
            ['new', 'open', 'in_progress', 'waiting_for_customer'].includes(
              t.status
            )
          ) {
            newCounts.active++;
          }
          if (t.status === 'new') newCounts.new++;
          if (t.status === 'open') newCounts.open++;
          if (t.status === 'in_progress') newCounts.in_progress++;
          if (t.status === 'waiting_for_customer')
            newCounts.waiting_for_customer++;

          if (!t.assigned_to && !['resolved', 'closed'].includes(t.status)) {
            newCounts.unassigned++;
            unassignedArr.push(t);
          }

          if (
            t.priority === 'urgent' &&
            !['resolved', 'closed'].includes(t.status)
          ) {
            newCounts.urgent++;
          }

          if (
            !['resolved', 'closed'].includes(t.status) &&
            (t.sla_breached ||
              (t.sla_due_at && new Date(t.sla_due_at) < new Date()))
          ) {
            newCounts.sla_at_risk++;
          }

          if (
            ['resolved', 'closed'].includes(t.status) &&
            new Date(t.created_at).toDateString() === todayStr
          ) {
            newCounts.resolved_today++;
          }
        });

        newCounts.resolution_rate =
          newCounts.total > 0
            ? Math.round(
                ((newCounts.total - newCounts.active) / newCounts.total) * 100
              )
            : 100;

        setCounts(newCounts);
        setUnassignedTickets(unassignedArr.slice(0, 5));
        setRecentTickets(tList.slice(0, 8));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time listener for incoming tickets/updates
  useSupportRealtime({
    onNewTicket: () => loadData(true),
    onTicketUpdated: () => loadData(true),
    onNewMessage: () => loadData(true),
  });

  const handleAutoAssignAll = async () => {
    if (isAutoAssigning) return;
    setIsAutoAssigning(true);
    try {
      const res = await fetch('/api/support/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_unassigned: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.assigned_count > 0) {
          toast.success(
            `✨ Assigned ${data.assigned_count} tickets based on lowest load!`
          );
        } else {
          toast.success('No unassigned tickets found to distribute');
        }
        loadData(true);
      } else {
        toast.error(data.error || 'Auto-assign failed');
      }
    } catch {
      toast.error('Network error during auto-assignment');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleManualAssign = async (ticketId: string, staffId: string) => {
    setAssigningTicketId(ticketId);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: staffId }),
      });
      if (res.ok) {
        toast.success('Ticket assigned successfully');
        loadData(true);
      } else {
        toast.error('Failed to assign ticket');
      }
    } catch {
      toast.error('Assignment error');
    } finally {
      setAssigningTicketId(null);
    }
  };

  const chartData = [
    { name: 'New', value: counts.new, color: STATUS_COLORS.new },
    { name: 'Open', value: counts.open, color: STATUS_COLORS.open },
    {
      name: 'In Progress',
      value: counts.in_progress,
      color: STATUS_COLORS.in_progress,
    },
    {
      name: 'Waiting',
      value: counts.waiting_for_customer,
      color: STATUS_COLORS.waiting_for_customer,
    },
  ].filter((c) => c.value > 0);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent shadow-lg" />
        <p className="text-xs text-slate-500">
          Loading Support Operations Console...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Support Command Center
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
              LIVE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time ticket dispatch, workload distribution & concierge
            resolution
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/support/tickets/new"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 transition-all hover:bg-indigo-500"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Manager Dispatch Notice Banner (when unassigned tickets exist) */}
      {counts.unassigned > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#131726] to-amber-500/5 p-5 shadow-lg shadow-amber-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {counts.unassigned} Unassigned Support Ticket
                    {counts.unassigned > 1 ? 's' : ''} Pending Dispatch
                  </h3>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                    Action Required
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Tickets can be automatically distributed to executives with
                  the lowest active workload with 1-click.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/support/tickets?assignee=unassigned"
                className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Review List
              </Link>
              <button
                onClick={handleAutoAssignAll}
                disabled={isAutoAssigning}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-900/30 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50"
              >
                <Zap className="h-4 w-4 fill-current" />
                {isAutoAssigning
                  ? 'Distributing...'
                  : 'Auto-Distribute by Workload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (8 Cards matching Admin aesthetic) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {/* Card 1: Active Tickets */}
        <Link
          href="/support/tickets"
          className="group flex flex-col justify-between rounded-2xl border border-indigo-500/10 bg-[#080B14]/60 p-4 shadow-2xl backdrop-blur-xl transition-all hover:border-white/10 hover:bg-[#161b2e]"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Ticket className="h-4 w-4" />
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition-colors group-hover:text-indigo-400" />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Active Tickets
            </p>
            <p className="text-2xl font-bold text-white">{counts.active}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {counts.new} newly submitted
            </p>
          </div>
        </Link>

        {/* Card 2: Unassigned */}
        <Link
          href="/support/tickets?assignee=unassigned"
          className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all hover:bg-[#161b2e] ${
            counts.unassigned > 0
              ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
              : 'border border-indigo-500/10 bg-[#080B14]/60 shadow-2xl backdrop-blur-xl hover:border-white/10'
          }`}
        >
          <div className="flex items-start justify-between">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                counts.unassigned > 0
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              <Inbox className="h-4 w-4" />
            </div>
            {counts.unassigned > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                PENDING
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Unassigned
            </p>
            <p
              className={`text-2xl font-bold ${counts.unassigned > 0 ? 'text-amber-400' : 'text-white'}`}
            >
              {counts.unassigned}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Needs agent assignment
            </p>
          </div>
        </Link>

        {/* Card 3: Urgent / Escalations */}
        <Link
          href="/support/tickets?priority=urgent"
          className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all hover:bg-[#161b2e] ${
            counts.urgent > 0
              ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
              : 'border border-indigo-500/10 bg-[#080B14]/60 shadow-2xl backdrop-blur-xl hover:border-white/10'
          }`}
        >
          <div className="flex items-start justify-between">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                counts.urgent > 0
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            {counts.urgent > 0 && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                URGENT
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Urgent Priority
            </p>
            <p
              className={`text-2xl font-bold ${counts.urgent > 0 ? 'text-rose-400' : 'text-white'}`}
            >
              {counts.urgent}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              High-priority resolution
            </p>
          </div>
        </Link>

        {/* Card 4: SLA At Risk */}
        <Link
          href="/support/tickets?sla_status=overdue"
          className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all hover:bg-[#161b2e] ${
            counts.sla_at_risk > 0
              ? 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50'
              : 'border border-indigo-500/10 bg-[#080B14]/60 shadow-2xl backdrop-blur-xl hover:border-white/10'
          }`}
        >
          <div className="flex items-start justify-between">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                counts.sla_at_risk > 0
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              <Clock className="h-4 w-4" />
            </div>
            {counts.sla_at_risk > 0 && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold text-orange-400">
                SLA
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              SLA Risk / Overdue
            </p>
            <p
              className={`text-2xl font-bold ${counts.sla_at_risk > 0 ? 'text-orange-400' : 'text-white'}`}
            >
              {counts.sla_at_risk}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Near 24h resolution SLA
            </p>
          </div>
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column: Live Urgent / Unassigned Queue (2 cols) */}
        <div className="space-y-6 xl:col-span-2">
          {/* Active Workboard Table */}
          <div className="overflow-hidden rounded-2xl border border-indigo-500/10 bg-[#080B14]/60 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-indigo-500/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-white">
                  Live Support Queue
                </h2>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                  {recentTickets.length} active
                </span>
              </div>
              <Link
                href="/support/tickets"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-400 transition hover:text-emerald-300"
              >
                <span>Full Queue</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <CheckCircle2 className="mb-2 h-10 w-10 text-indigo-500/40" />
                <p className="text-sm font-medium text-slate-300">
                  All caught up!
                </p>
                <p className="text-xs text-slate-500">
                  No active support tickets pending resolution
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-indigo-500/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Ticket</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Priority</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">
                        Assignee / Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {recentTickets.map((ticket) => {
                      const pStyle =
                        PRIORITY_BADGES[ticket.priority] ||
                        PRIORITY_BADGES.normal;
                      const sStyle =
                        STATUS_BADGES[ticket.status] || STATUS_BADGES.open;

                      return (
                        <tr
                          key={ticket.id}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          {/* Ticket Number & Subject */}
                          <td className="px-5 py-3.5">
                            <div className="min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/support/tickets/${ticket.id}`}
                                  className="font-mono text-[11px] font-bold text-indigo-400 hover:underline"
                                >
                                  {ticket.ticket_number}
                                </Link>
                                {ticket.ai_created && (
                                  <span className="py-0.2 rounded bg-violet-500/20 px-1 text-[8px] font-bold text-violet-400">
                                    AI
                                  </span>
                                )}
                              </div>
                              <Link
                                href={`/support/tickets/${ticket.id}`}
                                className="mt-0.5 block truncate text-xs font-medium text-slate-200 hover:text-white"
                              >
                                {ticket.title}
                              </Link>
                              {ticket.category && (
                                <span className="text-[10px] text-slate-500">
                                  {ticket.category.name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="px-4 py-3.5">
                            <div className="min-w-[120px]">
                              <p className="truncate font-medium text-slate-200">
                                {ticket.customer?.full_name || 'Guest Customer'}
                              </p>
                              <p className="truncate text-[10px] text-slate-500">
                                {ticket.customer?.email || '—'}
                              </p>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                            >
                              {ticket.priority}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sStyle.bg}`}
                            >
                              {STATUS_NAMES[ticket.status] || ticket.status}
                            </span>
                          </td>

                          {/* Assignee / Inline Assignment Dropdown */}
                          <td className="px-4 py-3.5">
                            <div className="relative min-w-[150px]">
                              <select
                                value={ticket.assigned_to || ''}
                                onChange={(e) =>
                                  handleManualAssign(ticket.id, e.target.value)
                                }
                                disabled={assigningTicketId === ticket.id}
                                className={`w-full rounded-lg border px-2.5 py-1 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                  ticket.assigned_to
                                    ? 'border-white/10 bg-white/5 text-slate-200'
                                    : 'border-amber-500/40 bg-amber-500/10 font-semibold text-amber-300'
                                }`}
                              >
                                <option
                                  value=""
                                  className="border border-indigo-500/10 bg-[#080B14]/60 text-amber-400 shadow-2xl backdrop-blur-xl"
                                >
                                  ⚡ Unassigned
                                </option>
                                {teamMembers.map((member) => (
                                  <option
                                    key={member.id}
                                    value={member.id}
                                    className="border border-indigo-500/10 bg-[#080B14]/60 text-slate-200 shadow-2xl backdrop-blur-xl"
                                  >
                                    {member.full_name} (
                                    {member.active_tickets_count} active)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status Breakdown Chart */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-indigo-500/10 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white">
                Active Queue Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Breakdown of tickets currently in progress
              </p>

              <div className="mt-4 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131726',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Support Team Workload Live Gauge (1 col) */}
        <div className="space-y-6">
          {/* Team Workload Card */}
          <div className="rounded-2xl border border-indigo-500/10 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Team Workload</h2>
              </div>
              <Link
                href="/support/team"
                className="text-xs font-semibold text-indigo-400 hover:underline"
              >
                Manage
              </Link>
            </div>

            <div className="mt-4 space-y-3.5">
              {teamMembers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No support staff configured.
                </p>
              ) : (
                teamMembers.map((member) => {
                  const loadPercent = Math.min(
                    Math.round((member.active_tickets_count / 10) * 100),
                    100
                  );
                  const isLeastLoaded =
                    member.active_tickets_count ===
                    Math.min(...teamMembers.map((m) => m.active_tickets_count));

                  return (
                    <div
                      key={member.id}
                      className="rounded-xl border border-indigo-500/10 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-800/80 text-xs font-bold text-white shadow-inner">
                            {member.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-slate-200">
                                {member.full_name}
                              </p>
                              {isLeastLoaded && (
                                <span
                                  className="py-0.2 rounded border border-indigo-500/20 bg-indigo-500/10 px-1 text-[8px] font-bold text-indigo-400"
                                  title="Lowest load target for auto-assign"
                                >
                                  AUTO TARGET
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] capitalize text-slate-500">
                              {member.role}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-white">
                            {member.active_tickets_count}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {' '}
                            active
                          </span>
                        </div>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="mt-2.5">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full transition-all ${
                              member.capacity_level === 'heavy'
                                ? 'bg-rose-500'
                                : member.capacity_level === 'moderate'
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.max(loadPercent, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 border-t border-indigo-500/10 pt-3">
              <button
                onClick={handleAutoAssignAll}
                disabled={isAutoAssigning || counts.unassigned === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Re-balance Active Workload</span>
              </button>
            </div>
          </div>

          {/* Quick Support Guidelines / Shortcuts */}
          <div className="rounded-2xl border border-indigo-500/10 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Support Standards
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                <span>
                  <strong className="text-slate-200">
                    First Response SLA:
                  </strong>{' '}
                  Target within 2 hours of ticket submission.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                <span>
                  <strong className="text-slate-200">
                    Materials & Plating:
                  </strong>{' '}
                  Our products are premium gold-plated; guide customers to the
                  product details page for material information.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                <span>
                  <strong className="text-slate-200">Internal Notes:</strong>{' '}
                  Always leave private notes for custom sizing and return
                  dispatch notes.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
