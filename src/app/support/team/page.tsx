'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  Zap,
  CheckCircle2,
  Ticket,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  AlertCircle,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  active_tickets_count: number;
  active_tickets: {
    id: string;
    ticket_number: string;
    title: string;
    priority: string;
    status: string;
  }[];
  resolved_today_count: number;
  resolved_week_count: number;
  capacity_level: 'optimal' | 'moderate' | 'heavy';
}

export default function SupportTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [unassignedTickets, setUnassignedTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const fetchTeam = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/support/team');
      const data = await res.json();
      if (res.ok) {
        setTeam(data.team || []);
        setUnassignedCount(data.unassigned_count || 0);
        setUnassignedTickets(data.unassigned_tickets || []);
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

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
        toast.success(
          `✨ Distributed ${data.assigned_count} tickets based on lowest active workload!`
        );
        fetchTeam(true);
      } else {
        toast.error(data.error || 'Auto-assign failed');
      }
    } catch {
      toast.error('Network error during auto-assignment');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const filteredTeam = team.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent shadow-md" />
        <p className="text-xs text-slate-500">
          Loading Support Team & Workload Matrix...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Team & Workload Management
            </h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
              {team.length} Members
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time caseload balancing, capacity monitoring & manager dispatch
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTeam(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Unassigned Dispatch Console for Manager */}
      <div className="rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Workload-Based Auto-Assignment Engine
                </h3>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  SMART BALANCING
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {unassignedCount > 0
                  ? `There are currently ${unassignedCount} unassigned tickets ready to be distributed to under-loaded staff.`
                  : 'All support tickets are currently assigned. The queue is well-balanced across active agents.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleAutoAssignAll}
            disabled={isAutoAssigning || unassignedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-900/30 transition hover:bg-amber-400 active:scale-95 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {isAutoAssigning
                ? 'Balancing Workloads...'
                : `Distribute Unassigned (${unassignedCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filter staff by name, email or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#131726] py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeam.map((member) => {
          const loadPercent = Math.min(
            Math.round((member.active_tickets_count / 10) * 100),
            100
          );

          return (
            <div
              key={member.id}
              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#131726] p-5 shadow-lg transition-all hover:border-white/10"
            >
              <div>
                {/* Agent Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800/80 text-sm font-bold text-white shadow-inner">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {member.full_name}
                      </h3>
                      <p className="font-mono text-[11px] text-slate-400">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold capitalize text-slate-300">
                    {member.role}
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-slate-500">
                      Active
                    </p>
                    <p className="text-sm font-bold text-white">
                      {member.active_tickets_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-slate-500">
                      Today
                    </p>
                    <p className="text-sm font-bold text-emerald-400">
                      {member.resolved_today_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-slate-500">
                      This Week
                    </p>
                    <p className="text-sm font-bold text-blue-400">
                      {member.resolved_week_count}
                    </p>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold uppercase text-slate-400">
                      Workload Capacity
                    </span>
                    <span
                      className={`font-bold ${
                        member.capacity_level === 'heavy'
                          ? 'text-rose-400'
                          : member.capacity_level === 'moderate'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      {member.capacity_level === 'heavy'
                        ? 'High Load'
                        : member.capacity_level === 'moderate'
                          ? 'Moderate Load'
                          : 'Optimal Load'}
                    </span>
                  </div>

                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        member.capacity_level === 'heavy'
                          ? 'bg-rose-500'
                          : member.capacity_level === 'moderate'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(loadPercent, 6)}%` }}
                    />
                  </div>
                </div>

                {/* Active Tickets Snippet */}
                {member.active_tickets && member.active_tickets.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Recent Caseload
                    </p>
                    {member.active_tickets.map((t) => (
                      <Link
                        key={t.id}
                        href={`/support/tickets/${t.id}`}
                        className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1 text-[11px] transition hover:bg-white/5"
                      >
                        <span className="font-mono font-medium text-emerald-400">
                          {t.ticket_number}
                        </span>
                        <span className="max-w-[140px] truncate text-slate-300">
                          {t.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* View Agent Tickets Link */}
              <div className="mt-5 border-t border-white/5 pt-3">
                <Link
                  href={`/support/tickets?assignee=${member.id}`}
                  className="flex items-center justify-between text-xs font-semibold text-emerald-400 transition hover:text-emerald-300"
                >
                  <span>View All Assigned Tickets</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
