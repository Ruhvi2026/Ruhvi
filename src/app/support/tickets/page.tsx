'use client';

import React, { useEffect, useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active_tickets_count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface TicketRecord {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status:
    | 'new'
    | 'open'
    | 'in_progress'
    | 'waiting_for_customer'
    | 'resolved'
    | 'closed';
  created_at: string;
  updated_at: string;
  sla_due_at?: string;
  sla_breached?: boolean;
  ai_created?: boolean;
  assigned_to?: string | null;
  customer?: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
  assigned?: { id?: string; full_name?: string; email?: string } | null;
  category?: { id?: string; name?: string; slug?: string } | null;
  order?: { id?: string; order_number?: string; status?: string } | null;
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

const STATUS_BADGES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  new: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  open: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  in_progress: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  waiting_for_customer: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  resolved: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
  },
  closed: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
};

const STATUS_NAMES: Record<string, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_customer: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function SupportTicketQueue() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState<
    'all' | 'unassigned' | 'me' | 'urgent' | 'waiting' | 'resolved'
  >(
    searchParams.get('assignee') === 'unassigned'
      ? 'unassigned'
      : searchParams.get('assignee') === 'me'
        ? 'me'
        : searchParams.get('priority') === 'urgent'
          ? 'urgent'
          : searchParams.get('status') === 'waiting_for_customer'
            ? 'waiting'
            : searchParams.get('status') === 'resolved'
              ? 'resolved'
              : 'all'
  );

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || ''
  );
  const [priorityFilter, setPriorityFilter] = useState(
    searchParams.get('priority') || ''
  );
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get('category') || ''
  );
  const [assigneeFilter, setAssigneeFilter] = useState(
    searchParams.get('assignee') || ''
  );
  const [showFilters, setShowFilters] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [inlineUpdatingId, setInlineUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Team & Categories once
  useEffect(() => {
    async function loadMeta() {
      try {
        const [teamRes, catRes] = await Promise.all([
          fetch('/api/support/team'),
          fetch('/api/support/categories'),
        ]);
        if (teamRes.ok) {
          const tData = await teamRes.json();
          setTeamMembers(tData.team || []);
        }
        if (catRes.ok) {
          const cData = await catRes.json();
          setCategories(cData.flat || []);
        }
      } catch (err) {
        console.error('Failed to load team/categories meta:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Tickets
  const fetchTickets = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '20');

        // Apply Tab or custom filter
        if (activeTab === 'unassigned') {
          params.set('assignee', 'unassigned');
        } else if (activeTab === 'me') {
          params.set('assignee', 'me');
        } else if (activeTab === 'urgent') {
          params.set('priority', 'urgent');
        } else if (activeTab === 'waiting') {
          params.set('status', 'waiting_for_customer');
        } else if (activeTab === 'resolved') {
          params.set('status', 'resolved_all');
        } else {
          // Custom filters
          if (statusFilter) params.set('status', statusFilter);
          if (priorityFilter) params.set('priority', priorityFilter);
          if (assigneeFilter) params.set('assignee', assigneeFilter);
        }

        if (categoryFilter) params.set('category', categoryFilter);
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/support/tickets?${params.toString()}`);
        const data = await res.json();

        setTickets(data.tickets || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Fetch tickets error:', err);
        toast.error('Failed to load tickets');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      activeTab,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      categoryFilter,
      search,
    ]
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time subscription for live updates of tickets
  useEffect(() => {
    if (!teamMembers.length) return; // Wait until team members are loaded to map assignees

    const supabase = createClient();
    const channel = supabase
      .channel('public:support_tickets')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload: any) => {
          setTickets((prev) => {
            const index = prev.findIndex((t) => t.id === payload.new.id);
            if (index === -1) return prev;

            const oldTicket = prev[index];
            const isAssignedChanged =
              oldTicket.assigned_to !== payload.new.assigned_to;
            const isStatusChanged = oldTicket.status !== payload.new.status;
            const isPriorityChanged =
              oldTicket.priority !== payload.new.priority;

            if (!isAssignedChanged && !isStatusChanged && !isPriorityChanged) {
              return prev;
            }

            const updatedTickets = [...prev];
            const updatedTicket = { ...oldTicket, ...payload.new };

            if (isAssignedChanged) {
              if (payload.new.assigned_to) {
                const staff = teamMembers.find(
                  (m) => m.id === payload.new.assigned_to
                );
                if (staff) {
                  updatedTicket.assigned = {
                    id: staff.id,
                    full_name: staff.full_name,
                    email: staff.email,
                  };
                }
              } else {
                updatedTicket.assigned = null;
              }
            }

            updatedTickets[index] = updatedTicket;
            return updatedTickets;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamMembers]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds([]);
  };

  const handleCopyTicketNumber = (
    e: React.MouseEvent,
    num: string,
    id: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    toast.success(`Copied ${num}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Inline Assign
  const handleInlineAssign = async (ticketId: string, staffId: string) => {
    setInlineUpdatingId(ticketId);
    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      const payload: any = { assigned_to: staffId || null };
      if (staffId && ticket?.status === 'new') {
        payload.status = 'open';
      }

      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(staffId ? 'Ticket assigned' : 'Ticket unassigned');
        fetchTickets(true);
      } else {
        toast.error('Assignment update failed');
      }
    } catch {
      toast.error('Network error updating assignment');
    } finally {
      setInlineUpdatingId(null);
    }
  };

  // Batch Auto-Assign
  const handleBatchAutoAssign = async () => {
    if (selectedIds.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/support/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `✨ Auto-assigned ${data.assigned_count} tickets by lowest workload!`
        );
        setSelectedIds([]);
        fetchTickets(true);
      } else {
        toast.error(data.error || 'Batch auto-assign failed');
      }
    } catch {
      toast.error('Failed to auto-assign selected tickets');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Assign to Specific Staff
  const handleBatchAssignTo = async (staffId: string) => {
    if (selectedIds.length === 0 || !staffId || isBatchProcessing) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/support/tickets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_ids: selectedIds,
          action: 'assign',
          value: staffId,
        }),
      });
      if (res.ok) {
        toast.success(`Assigned ${selectedIds.length} tickets`);
        setSelectedIds([]);
        fetchTickets(true);
      } else {
        toast.error('Batch assign failed');
      }
    } catch {
      toast.error('Network error during batch assignment');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Status Change
  const handleBatchStatus = async (newStatus: string) => {
    if (selectedIds.length === 0 || !newStatus || isBatchProcessing) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/support/tickets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_ids: selectedIds,
          action: 'status',
          value: newStatus,
        }),
      });
      if (res.ok) {
        toast.success(`Updated ${selectedIds.length} tickets to ${newStatus}`);
        setSelectedIds([]);
        fetchTickets(true);
      } else {
        toast.error('Batch status update failed');
      }
    } catch {
      toast.error('Network error during batch status update');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Ticket Queue
            </h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
              {total} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Dispatch, prioritize, and resolve customer support inquiries
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Refresh queue"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/support/tickets/new"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 transition hover:bg-emerald-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Queue View Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-2">
        <button
          onClick={() => handleTabChange('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          All Tickets
        </button>

        <button
          onClick={() => handleTabChange('unassigned')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'unassigned'
              ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Unassigned Queue</span>
        </button>

        <button
          onClick={() => handleTabChange('me')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'me'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Assigned to Me
        </button>

        <button
          onClick={() => handleTabChange('urgent')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'urgent'
              ? 'border border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-sm'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-3 w-3 text-rose-400" />
          <span>Urgent & Escalations</span>
        </button>

        <button
          onClick={() => handleTabChange('waiting')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'waiting'
              ? 'border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-sm'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Waiting on Customer
        </button>

        <button
          onClick={() => handleTabChange('resolved')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'resolved'
              ? 'border border-green-500/30 bg-green-500/10 text-green-400 shadow-sm'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Resolved Archive
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ticket #, subject, customer name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-[#131726] py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
            showFilters ||
            categoryFilter ||
            statusFilter ||
            priorityFilter ||
            assigneeFilter
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
              : 'border-white/10 bg-[#131726] text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {(statusFilter ||
            priorityFilter ||
            categoryFilter ||
            assigneeFilter) && (
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-[#131726] p-4 shadow-lg">
          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" className="bg-[#131726]">
                All Statuses
              </option>
              <option value="new" className="bg-[#131726]">
                New
              </option>
              <option value="open" className="bg-[#131726]">
                Open
              </option>
              <option value="in_progress" className="bg-[#131726]">
                In Progress
              </option>
              <option value="waiting_for_customer" className="bg-[#131726]">
                Waiting for Customer
              </option>
              <option value="resolved" className="bg-[#131726]">
                Resolved
              </option>
              <option value="closed" className="bg-[#131726]">
                Closed
              </option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" className="bg-[#131726]">
                All Priorities
              </option>
              <option value="urgent" className="bg-[#131726]">
                Urgent
              </option>
              <option value="high" className="bg-[#131726]">
                High
              </option>
              <option value="normal" className="bg-[#131726]">
                Normal
              </option>
              <option value="low" className="bg-[#131726]">
                Low
              </option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Assignee
            </label>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" className="bg-[#131726]">
                All Assignees
              </option>
              <option value="unassigned" className="bg-[#131726]">
                ⚡ Unassigned Only
              </option>
              <option value="me" className="bg-[#131726]">
                Assigned to Me
              </option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#131726]">
                  {m.full_name} ({m.active_tickets_count})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" className="bg-[#131726]">
                All Categories
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#131726]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="self-end pb-1">
            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
                setAssigneeFilter('');
                setSearch('');
                setPage(1);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar (when tickets are selected) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs shadow-lg">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{selectedIds.length} ticket(s) selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Assign Selected */}
            <button
              onClick={handleBatchAutoAssign}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-slate-950 shadow transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Auto-Assign ({selectedIds.length})</span>
            </button>

            {/* Assign To Specific Agent */}
            <select
              onChange={(e) => {
                if (e.target.value) handleBatchAssignTo(e.target.value);
              }}
              disabled={isBatchProcessing}
              defaultValue=""
              className="rounded-lg border border-white/10 bg-[#131726] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Assign to agent...
              </option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.active_tickets_count} active)
                </option>
              ))}
            </select>

            {/* Update Status */}
            <select
              onChange={(e) => {
                if (e.target.value) handleBatchStatus(e.target.value);
              }}
              disabled={isBatchProcessing}
              defaultValue=""
              className="rounded-lg border border-white/10 bg-[#131726] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Change status...
              </option>
              <option value="in_progress">Mark In Progress</option>
              <option value="waiting_for_customer">Mark Waiting</option>
              <option value="resolved">Mark Resolved</option>
              <option value="closed">Mark Closed</option>
            </select>

            <button
              onClick={() => setSelectedIds([])}
              className="rounded-lg px-2.5 py-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726] shadow-xl">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent shadow-md" />
            <p className="text-xs text-slate-500">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Inbox className="mb-3 h-12 w-12 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">
              No tickets found
            </p>
            <p className="mt-1 text-xs">
              Try adjusting your filters or search keywords
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === tickets.length &&
                        tickets.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Ticket</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Priority</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">SLA / Target</th>
                  <th className="px-4 py-3 font-semibold">Assignee</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Created
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {tickets.map((ticket) => {
                  const pStyle =
                    PRIORITY_BADGES[ticket.priority] || PRIORITY_BADGES.normal;
                  const sStyle =
                    STATUS_BADGES[ticket.status] || STATUS_BADGES.open;
                  const isSelected = selectedIds.includes(ticket.id);

                  const isSlaOverdue =
                    !['resolved', 'closed'].includes(ticket.status) &&
                    (ticket.sla_breached ||
                      (ticket.sla_due_at &&
                        new Date(ticket.sla_due_at) < new Date()));

                  return (
                    <tr
                      key={ticket.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/5'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(ticket.id)}
                          className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                        />
                      </td>

                      {/* Ticket Number & Subject */}
                      <td className="px-4 py-3.5">
                        <div className="min-w-[200px] max-w-sm">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/support/tickets/${ticket.id}`}
                              className="font-mono text-xs font-bold text-emerald-400 hover:underline"
                            >
                              {ticket.ticket_number}
                            </Link>

                            <button
                              onClick={(e) =>
                                handleCopyTicketNumber(
                                  e,
                                  ticket.ticket_number,
                                  ticket.id
                                )
                              }
                              className="text-slate-500 transition hover:text-slate-300"
                              title="Copy ticket number"
                            >
                              {copiedId === ticket.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>

                            {ticket.ai_created && (
                              <span className="py-0.2 rounded bg-violet-500/20 px-1 text-[8px] font-bold text-violet-400">
                                AI
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/support/tickets/${ticket.id}`}
                            className="mt-1 block truncate text-xs font-semibold text-slate-200 hover:text-white"
                          >
                            {ticket.title}
                          </Link>

                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                            {ticket.category && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-slate-400">
                                {ticket.category.name}
                              </span>
                            )}
                            {ticket.order && (
                              <span className="text-slate-500">
                                Order #{ticket.order.order_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="min-w-[120px]">
                          <p className="font-semibold text-slate-200">
                            {ticket.customer?.full_name || 'Guest Customer'}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">
                            {ticket.customer?.email || '—'}
                          </p>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}
                        >
                          {STATUS_NAMES[ticket.status] || ticket.status}
                        </span>
                      </td>

                      {/* SLA Due */}
                      <td className="px-4 py-3.5">
                        {['resolved', 'closed'].includes(ticket.status) ? (
                          <span className="text-[10px] font-medium text-emerald-400">
                            ✓ Resolved
                          </span>
                        ) : isSlaOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                            <Clock className="h-3 w-3" />
                            Overdue
                          </span>
                        ) : ticket.sla_due_at ? (
                          <span className="text-[10px] text-slate-400">
                            Due{' '}
                            {new Date(ticket.sla_due_at).toLocaleTimeString(
                              'en-IN',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>

                      {/* Assignee / Quick Dropdown */}
                      <td className="px-4 py-3.5">
                        <div className="relative min-w-[160px]">
                          <select
                            value={ticket.assigned_to || ''}
                            onChange={(e) =>
                              handleInlineAssign(ticket.id, e.target.value)
                            }
                            disabled={inlineUpdatingId === ticket.id}
                            className={`w-full rounded-lg border px-2.5 py-1 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              ticket.assigned_to
                                ? 'border-white/10 bg-white/5 text-slate-200'
                                : 'border-amber-500/40 bg-amber-500/10 font-semibold text-amber-300'
                            }`}
                          >
                            <option
                              value=""
                              className="bg-[#131726] text-amber-400"
                            >
                              ⚡ Unassigned
                            </option>
                            {teamMembers.map((member) => (
                              <option
                                key={member.id}
                                value={member.id}
                                className="bg-[#131726] text-slate-200"
                              >
                                {member.full_name} (
                                {member.active_tickets_count})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[11px] text-slate-500">
                        {new Date(ticket.created_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </td>

                      {/* View Action */}
                      <td className="px-4 py-3.5 text-center">
                        <Link
                          href={`/support/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3 text-xs text-slate-400">
          <p>
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{' '}
            {total} tickets
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-300">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
