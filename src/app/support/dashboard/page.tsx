'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

interface TicketCounts {
  new: number;
  open: number;
  in_progress: number;
  waiting_for_customer: number;
  resolved: number;
  closed: number;
  urgent: number;
  sla_at_risk: number;
  unassigned: number;
  my_tickets: number;
}

interface RecentTicket {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  customer: { full_name: string; email: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-500/20 text-emerald-400',
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  waiting_for_customer: 'bg-purple-500/20 text-purple-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-slate-500/20 text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_customer: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function SupportDashboard() {
  const [counts, setCounts] = useState<TicketCounts>({
    new: 0,
    open: 0,
    in_progress: 0,
    waiting_for_customer: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
    sla_at_risk: 0,
    unassigned: 0,
    my_tickets: 0,
  });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch ticket counts by status
      const res = await fetch('/api/support/tickets?limit=50');
      const data = await res.json();

      if (data.tickets) {
        const tickets = data.tickets;
        const newCounts: TicketCounts = {
          new: 0,
          open: 0,
          in_progress: 0,
          waiting_for_customer: 0,
          resolved: 0,
          closed: 0,
          urgent: 0,
          sla_at_risk: 0,
          unassigned: 0,
          my_tickets: 0,
        };

        tickets.forEach((t: any) => {
          if (t.status in newCounts) {
            (newCounts as any)[t.status]++;
          }
          if (t.priority === 'urgent') newCounts.urgent++;
          if (!t.assigned) newCounts.unassigned++;
          if (
            t.sla_breached ||
            (t.sla_due_at && new Date(t.sla_due_at) < new Date())
          ) {
            newCounts.sla_at_risk++;
          }
        });

        setCounts(newCounts);
        setRecentTickets(
          tickets.filter((t: any) => t.status !== 'closed').slice(0, 10)
        );
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      label: 'New Tickets',
      value: counts.new,
      icon: Inbox,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      href: '/support/tickets?status=new',
    },
    {
      label: 'Open',
      value: counts.open + counts.in_progress,
      icon: Ticket,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      href: '/support/tickets?status=open',
    },
    {
      label: 'Waiting for Customer',
      value: counts.waiting_for_customer,
      icon: Clock,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      href: '/support/tickets?status=waiting_for_customer',
    },
    {
      label: 'Urgent',
      value: counts.urgent,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      href: '/support/tickets?priority=urgent',
    },
    {
      label: 'SLA At Risk',
      value: counts.sla_at_risk,
      icon: AlertCircle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      href: '/support/tickets',
    },
    {
      label: 'Unassigned',
      value: counts.unassigned,
      icon: UserCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      href: '/support/tickets?assignee=unassigned',
    },
    {
      label: 'Resolved',
      value: counts.resolved,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      href: '/support/tickets?status=resolved',
    },
    {
      label: 'Total Active',
      value:
        counts.new +
        counts.open +
        counts.in_progress +
        counts.waiting_for_customer,
      icon: TrendingUp,
      color: 'text-white',
      bg: 'bg-white/5',
      href: '/support/tickets',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Support Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of customer support operations
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border border-white/5 ${card.bg} p-4 transition-all hover:border-white/10 hover:brightness-110`}
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
          </Link>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Active Tickets</h2>
          <Link
            href="/support/tickets"
            className="text-xs text-amber-400 transition-colors hover:text-amber-300"
          >
            View All →
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {recentTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Inbox className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">No active tickets</p>
            </div>
          ) : (
            recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">
                      {ticket.ticket_number}
                    </span>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        PRIORITY_COLORS[ticket.priority] ||
                        PRIORITY_COLORS.normal
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-200">
                    {ticket.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {ticket.customer?.full_name ||
                      ticket.customer?.email ||
                      'Unknown'}{' '}
                    ·{' '}
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    STATUS_COLORS[ticket.status] || STATUS_COLORS.open
                  }`}
                >
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
