import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  Headphones,
  CheckCircle2,
  Clock,
  Users,
  Ticket,
  Plus,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react';

const STATUS_BADGES: Record<string, string> = {
  new: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  waiting_for_customer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  waiting_for_team: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  reopened: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  duplicate: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const PRIORITY_BADGES: Record<string, string> = {
  urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  normal: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const STATUS_NAMES: Record<string, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_customer: 'Waiting',
  waiting_for_team: 'Waiting on Team',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
};

interface SupportDashboardProps {
  from: string;
  to: string;
}

export default async function SupportDashboard({ from, to }: SupportDashboardProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const fromISO = `${from}T00:00:00.000Z`;
  const toISO = `${to}T23:59:59.999Z`;

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      id,
      ticket_number,
      title,
      description,
      priority,
      status,
      sla_due_at,
      sla_breached,
      ai_created,
      created_at,
      first_response_at,
      resolved_at,
      assigned_to,
      assignee:users!support_tickets_assigned_to_fkey(full_name, email),
      customer:users!support_tickets_customer_id_fkey(full_name, email)
    `)
    .gte('created_at', fromISO)
    .lte('created_at', toISO);

  const totalTickets = (tickets || []).length;
  const activeTickets = (tickets || []).filter(
    (t) =>
      !['resolved', 'closed', 'rejected', 'duplicate'].includes(t.status)
  ).length;
  const resolvedTickets = (tickets || []).filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  ).length;

  const resolutionRate =
    totalTickets > 0
      ? ((resolvedTickets / totalTickets) * 100).toFixed(1)
      : '0.0';

  // Calculate Avg Response Time
  let totalResponseMs = 0;
  let respondedCount = 0;
  (tickets || []).forEach((t) => {
    if (t.first_response_at && t.created_at) {
      const diff =
        new Date(t.first_response_at).getTime() -
        new Date(t.created_at).getTime();
      if (diff > 0) {
        totalResponseMs += diff;
        respondedCount++;
      }
    }
  });

  const avgResponseHrs =
    respondedCount > 0
      ? (totalResponseMs / respondedCount / (1000 * 60 * 60)).toFixed(1)
      : '—';

  // Calculate Agent workloads
  const agentMap: Record<
    string,
    { name: string; email: string; count: number }
  > = {};
  (tickets || []).forEach((t) => {
    if (t.assigned_to) {
      const assigneeObj = Array.isArray(t.assignee)
        ? t.assignee[0]
        : t.assignee;
      const name = assigneeObj?.full_name || 'Support Executive';
      const email = assigneeObj?.email || 'N/A';
      if (!agentMap[t.assigned_to]) {
        agentMap[t.assigned_to] = { name, email, count: 0 };
      }
      agentMap[t.assigned_to].count++;
    }
  });

  const agentsList = Object.values(agentMap).sort((a, b) => b.count - a.count);
  const activeAgentsCount = Object.keys(agentMap).length;

  const recentTickets = [...(tickets || [])]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Tickets
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{totalTickets}</p>
          <p className="mt-1 text-xs text-slate-500">Historical Lifetime</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">Active</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{activeTickets}</p>
          <p className="mt-1 text-xs text-slate-500">Not yet resolved</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Resolved</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {resolvedTickets}
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            {resolutionRate}% Resolution Rate
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Avg Response Time
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {avgResponseHrs} {avgResponseHrs !== '—' ? 'Hrs' : ''}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            From creation to response
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Active Agents
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {activeAgentsCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Handling support queue</p>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Ticket className="h-4 w-4 text-emerald-400" />
              Recent Tickets
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest customer support inquiries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/support/tickets/new"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500"
            >
              <Plus className="h-3 w-3" />
              New Ticket
            </Link>
            <Link
              href="/support/tickets"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              View Queue
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 text-left font-semibold">Ticket</th>
                <th className="px-5 py-3 text-left font-semibold">Customer</th>
                <th className="px-5 py-3 text-left font-semibold">Priority</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Assignee</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Created
                </th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {recentTickets.map((ticket: any) => {
                const customer = Array.isArray(ticket.customer)
                  ? ticket.customer[0]
                  : ticket.customer;
                const assignee = Array.isArray(ticket.assignee)
                  ? ticket.assignee[0]
                  : ticket.assignee;
                return (
                  <tr
                    key={ticket.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3">
                      <div className="min-w-[180px]">
                        <Link
                          href={`/support/tickets/${ticket.id}`}
                          className="font-mono text-[11px] font-bold text-emerald-400 hover:underline"
                        >
                          {ticket.ticket_number}
                        </Link>
                        <p className="mt-0.5 max-w-[220px] truncate text-xs font-medium text-slate-200">
                          {ticket.title}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="min-w-[140px]">
                        <p className="truncate font-medium text-slate-200">
                          {customer?.full_name || 'Guest Customer'}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          {customer?.email || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                          PRIORITY_BADGES[ticket.priority] ||
                          PRIORITY_BADGES.normal
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                          STATUS_BADGES[ticket.status] || STATUS_BADGES.open
                        }`}
                      >
                        {STATUS_NAMES[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] text-slate-400">
                        {assignee?.full_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-[11px] text-slate-500">
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/support/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                      >
                        View Ticket
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {recentTickets.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-xs text-slate-600"
                  >
                    No tickets yet. Click{' '}
                    <Link
                      href="/support/tickets/new"
                      className="font-semibold text-emerald-400 hover:underline"
                    >
                      New Ticket
                    </Link>{' '}
                    to create the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Agent Workloads
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
                <th className="pb-3 font-medium">Agent Name</th>
                <th className="pb-3 font-medium">Agent Email</th>
                <th className="pb-3 text-right font-medium">Tickets Handled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agentsList.map((agent, i) => (
                <tr key={i} className="transition-colors hover:bg-white/5">
                  <td className="py-3 font-medium text-white">{agent.name}</td>
                  <td className="py-3 text-slate-400">{agent.email}</td>
                  <td className="py-3 text-right font-semibold text-emerald-400">
                    {agent.count}
                  </td>
                </tr>
              ))}
              {agentsList.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-xs text-slate-600"
                  >
                    No active support assignments found
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
