'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

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

export default function SupportTicketQueue() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    assignee: searchParams.get('assignee') || '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assignee) params.set('assignee', filters.assignee);
      if (search) params.set('search', search);

      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      const data = await res.json();

      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Fetch tickets error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Ticket Queue</h1>
          <p className="mt-0.5 text-sm text-slate-500">{total} tickets total</p>
        </div>
        <Link
          href="/support/tickets/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          New Ticket
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ticket number or title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            showFilters
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
              : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-white/5 bg-[#131726] p-3">
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_customer">Waiting for Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => {
              setFilters({ ...filters, priority: e.target.value });
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.assignee}
            onChange={(e) => {
              setFilters({ ...filters, assignee: e.target.value });
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Assignees</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <button
            onClick={() => {
              setFilters({ status: '', priority: '', assignee: '' });
              setSearch('');
              setPage(1);
            }}
            className="text-xs text-slate-500 transition-colors hover:text-white"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Ticket List */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Inbox className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No tickets found</p>
            <p className="mt-1 text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tickets.map((ticket: any) => (
              <Link
                key={ticket.id}
                href={`/support/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                    {ticket.ai_created && (
                      <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-400">
                        AI
                      </span>
                    )}
                    {ticket.category && (
                      <span className="text-[10px] text-slate-600">
                        {ticket.category.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-200">
                    {ticket.title}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                    <span>
                      {ticket.customer?.full_name ||
                        ticket.customer?.email ||
                        'Unknown'}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {ticket.assigned && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500/70">
                          → {ticket.assigned.full_name || ticket.assigned.email}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    STATUS_COLORS[ticket.status] || STATUS_COLORS.open
                  }`}
                >
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
