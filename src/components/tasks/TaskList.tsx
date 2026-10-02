'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Clock,
  Eye,
  Edit,
  Users,
  Building,
  Package,
  Box,
  Ticket,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';
import { debounce } from '@/lib/debounce';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import RelatedEntityModal from './RelatedEntityModal';
import StaffAvatar from './StaffAvatar';
import {
  Task,
  TaskFilters,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskListResponse,
} from './types';

interface TaskListProps {
  initialTasks?: Task[];
  initialTotal?: number;
  initialPage?: number;
  initialLimit?: number;
  initialHasMore?: boolean;
  onTaskClick?: (task: Task) => void;
  refreshKey?: number;
  externalFilters?: Record<string, any>;
  activeFilterLabel?: string;
  onClearFilter?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  Normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Important: 'bg-red-500/20 text-red-400 border-red-500/30',
  Immediate: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  Completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function TaskList({
  initialTasks = [],
  initialTotal = 0,
  initialPage = 1,
  initialLimit = 20,
  initialHasMore = false,
  onTaskClick,
  refreshKey,
  externalFilters,
  activeFilterLabel,
  onClearFilter,
}: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const basePath = pathname ? pathname.split('?')[0] : '/admin/task-manager';

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>(() => {
    const isMyTasks = searchParams?.get('my_tasks') === 'true';
    const isOverdue = searchParams?.get('overdue') === 'true';
    return {
      sort_by: 'created_at',
      sort_dir: 'desc',
      my_tasks: isMyTasks,
      overdue: isOverdue,
    };
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [inspectModal, setInspectModal] = useState<{
    isOpen: boolean;
    type: 'order' | 'product' | 'ticket' | null;
    idOrCode: string | null;
    data?: any;
  }>({
    isOpen: false,
    type: null,
    idOrCode: null,
  });
  const debouncedFetch = useRef(
    debounce((pageNum: number, additionalFilters: Partial<TaskFilters>) => {
      fetchTasks(pageNum, additionalFilters);
    }, 300)
  );

  // Build URL for API calls
  const buildApiUrl = useCallback(
    (pageNum: number, additionalFilters: Partial<TaskFilters> = {}) => {
      const params = new URLSearchParams();
      const mergedFilters = {
        ...filters,
        ...additionalFilters,
        limit,
        offset: (pageNum - 1) * limit,
      };

      Object.entries(mergedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'boolean') {
            if (value) params.set(key, 'true');
          } else {
            params.set(key, String(value));
          }
        }
      });

      params.set('_t', String(Date.now()));
      return `/api/task-manager/tasks?${params.toString()}`;
    },
    [filters, limit]
  );

  const fetchTasks = useCallback(
    async (
      pageNum: number = 1,
      additionalFilters: Partial<TaskFilters> = {}
    ) => {
      setLoading(true);
      try {
        const url = buildApiUrl(pageNum, additionalFilters);
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data: TaskListResponse = await response.json();

        if (data.tasks) {
          if (pageNum === 1) {
            setTasks(data.tasks);
          } else {
            setTasks((prev) => [...prev, ...data.tasks]);
          }
          setTotal(data.total);
          setPage(data.page);
          setHasMore(data.has_more);
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl, limit]
  );

  // Initial fetch and re-fetch on route change or externalFilters / refreshKey change
  useEffect(() => {
    const isMyTasks = searchParams?.get('my_tasks') === 'true';
    const isOverdue = searchParams?.get('overdue') === 'true';
    const mergedFilters: TaskFilters = {
      sort_by: 'created_at',
      sort_dir: 'desc',
      my_tasks: isMyTasks,
      overdue: isOverdue,
      ...externalFilters,
    };
    setFilters(mergedFilters);
    fetchTasks(1, mergedFilters);
  }, [
    pathname,
    searchParams?.toString(),
    refreshKey,
    JSON.stringify(externalFilters),
  ]);

  useEffect(() => {
    const handleTaskCreated = () => {
      fetchTasks(1);
    };
    window.addEventListener('task-created-or-updated', handleTaskCreated);
    return () =>
      window.removeEventListener('task-created-or-updated', handleTaskCreated);
  }, [fetchTasks]);

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    const shouldDebounce = key === 'search';
    if (shouldDebounce) {
      debouncedFetch.current(1, { [key]: value });
    } else {
      fetchTasks(1, { [key]: value });
    }
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSlaStatus = (task: Task) => {
    if (!task.due_date)
      return { label: 'No Due Date', class: 'text-slate-500' };
    if (
      task.status_name?.name === 'Completed' ||
      task.status_name?.name === 'Closed'
    ) {
      return { label: 'Completed', class: 'text-emerald-400' };
    }

    const due = new Date(task.due_date);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return {
        label: `${Math.abs(Math.round(diffHours))}h Overdue`,
        class: 'text-rose-400',
      };
    } else if (diffHours < 4) {
      return {
        label: `${Math.round(diffHours)}h Remaining`,
        class: 'text-amber-400',
      };
    } else if (diffHours < 24) {
      return {
        label: `${Math.round(diffHours)}h Remaining`,
        class: 'text-blue-400',
      };
    } else {
      const days = Math.round(diffHours / 24);
      return { label: `${days}d Remaining`, class: 'text-emerald-400' };
    }
  };

  const priorityLabel = (task: Task) => {
    const priority = task.priority_name?.name;
    const priorityStr = typeof priority === 'string' ? priority : 'Normal';
    if (priority && typeof priority !== 'string') {
      console.error(
        'DEBUG: TaskList: Invalid priority_name.name:',
        task.priority_name
      );
    }
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${
          PRIORITY_COLORS[priorityStr] || PRIORITY_COLORS.Normal
        }`}
      >
        {priorityStr}
      </span>
    );
  };

  const statusLabel = (task: Task) => {
    const status = task.status_name?.name;
    const statusStr = typeof status === 'string' ? status : 'Open';
    if (status && typeof status !== 'string') {
      console.error(
        'DEBUG: TaskList: Invalid status_name.name:',
        task.status_name
      );
    }
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${
          STATUS_COLORS[statusStr] || STATUS_COLORS.Open
        }`}
      >
        {statusStr}
      </span>
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      {activeFilterLabel && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-emerald-400" />
              <span>
                Filtered by dashboard tile:{' '}
                <strong className="font-semibold text-emerald-300">
                  {activeFilterLabel}
                </strong>{' '}
                ({total} {total === 1 ? 'task' : 'tasks'} found)
              </span>
            </div>
            {onClearFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 hover:text-white"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Tasks</h2>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            {total} total
          </span>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            onClick={() => handleFilterChange('overdue', !filters.overdue)}
            className={`hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors sm:flex ${
              filters.overdue
                ? 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Overdue
          </button>

          <div className="relative ml-2 flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              onChange={(e) => handleSearch(e.target.value)}
              defaultValue={filters.search}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <Link
            href={`${basePath}?action=new`}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="space-y-4 border-b border-white/5 bg-white/5 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-[11px] font-medium text-slate-400">
                Status
              </label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value || undefined,
                  }))
                }
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-[11px] font-medium text-slate-400">
                Priority
              </label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={filters.priority || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: e.target.value || undefined,
                  }))
                }
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="important">Important</option>
                <option value="immediate">Immediate</option>
              </select>
            </div>

            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-[11px] font-medium text-slate-400">
                View
              </label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                onChange={(e) => {
                  const val = e.target.value;
                  const newFilters: Partial<TaskFilters> = {
                    all_my_tasks: false,
                    my_tasks: false,
                    assigned_by_me: false,
                    supporting: false,
                    spectating: false,
                    due_today: false,
                    overdue: false,
                  };
                  if (val === 'all_my_tasks') newFilters.all_my_tasks = true;
                  else if (val === 'my_tasks') newFilters.my_tasks = true;
                  else if (val === 'assigned_by_me')
                    newFilters.assigned_by_me = true;
                  else if (val === 'supporting') newFilters.supporting = true;
                  else if (val === 'spectating') newFilters.spectating = true;
                  else if (val === 'due_today') newFilters.due_today = true;
                  else if (val === 'overdue') newFilters.overdue = true;
                  setFilters((prev) => ({ ...prev, ...newFilters }));
                }}
                value={
                  filters.all_my_tasks
                    ? 'all_my_tasks'
                    : filters.my_tasks
                      ? 'my_tasks'
                      : filters.assigned_by_me
                        ? 'assigned_by_me'
                        : filters.supporting
                          ? 'supporting'
                          : filters.spectating
                            ? 'spectating'
                            : filters.due_today
                              ? 'due_today'
                              : filters.overdue
                                ? 'overdue'
                                : ''
                }
              >
                <option value="all_my_tasks">All Tasks (Involved)</option>
                <option value="my_tasks">My Tasks</option>
                <option value="assigned_by_me">Assigned by Me</option>
                <option value="supporting">Supporting</option>
                <option value="spectating">Spectating</option>
                <option value="due_today">Due Today</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                const defaultFilters: Partial<TaskFilters> = {
                  sort_by: 'created_at',
                  sort_dir: 'desc',
                  all_my_tasks: true,
                };
                setFilters(defaultFilters as TaskFilters);
                fetchTasks(1, defaultFilters);
                setShowFilters(false);
              }}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Clear all filters
            </button>

            <button
              onClick={() => {
                fetchTasks(1, filters);
                setShowFilters(false);
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <ClipboardList className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-white">
              No tasks found
            </h3>
            <p className="mb-4 text-slate-500">
              Get started by creating your first task
            </p>
            <Link
              href={`${basePath}?action=new`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Create Task
            </Link>
          </div>
        ) : (
          <div className="space-y-3 p-3 sm:p-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="group cursor-pointer space-y-3 rounded-xl border border-white/10 bg-[#161B2C]/80 p-4 shadow-sm transition-all hover:border-emerald-500/40 hover:bg-[#1C2339] hover:shadow-lg sm:p-5"
              >
                {/* Top Row: Task ID, Title, Priority, Status, SLA */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs font-medium text-slate-400">
                      {task.task_id_text || 'TASK'}
                    </span>
                    <h3 className="truncate text-base font-semibold text-white transition-colors group-hover:text-emerald-400">
                      {task.title}
                    </h3>
                    {priorityLabel(task)}
                    {statusLabel(task)}
                  </div>

                  {task.due_date && (
                    <div
                      className={`whitespace-nowrap rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium ${
                        getSlaStatus(task).class
                      }`}
                    >
                      SLA: {getSlaStatus(task).label}
                    </div>
                  )}
                </div>

                {/* Description */}
                {task.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">
                    {task.description}
                  </p>
                )}

                {/* Middle Section: Full-Width People Cards (By, To, Suspector) */}
                <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-3">
                  {/* Created By Card */}
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/40 px-3 py-2">
                    <StaffAvatar user={task.creator} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Created By
                      </span>
                      <p className="truncate text-xs font-semibold text-white">
                        {task.creator?.full_name || 'System'}
                      </p>
                    </div>
                  </div>

                  {/* Assigned To Card */}
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/40 px-3 py-2">
                    <StaffAvatar user={task.assignee} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Assigned To
                      </span>
                      <p className="truncate text-xs font-semibold text-white">
                        {task.assignee?.full_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {/* Suspector / Inspector Card */}
                  <div className="flex items-center gap-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
                    {task.spectators &&
                    task.spectators.length > 0 &&
                    task.spectators[0].spectator ? (
                      <>
                        <StaffAvatar
                          user={task.spectators[0].spectator}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] font-medium uppercase tracking-wider text-cyan-400">
                            Suspector / Inspector
                          </span>
                          <p className="truncate text-xs font-semibold text-cyan-200">
                            {task.spectators[0].spectator.full_name}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Suspector / Inspector
                        </span>
                        <p className="truncate text-xs font-medium text-slate-400">
                          None Assigned
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Section: Department, Messenger Group, Tags, Related Entities */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-2 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {task.department_name && (
                      <span className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                        <Building className="h-3.5 w-3.5 text-emerald-400" />
                        {task.department_name}
                      </span>
                    )}

                    {task.messenger_group_id && (
                      <span className="flex items-center gap-1.5 rounded border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-medium text-indigo-300">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Chat Group Active
                      </span>
                    )}

                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Related Entities Buttons */}
                  {(task.related_order_id ||
                    task.related_ticket_id ||
                    task.related_product_id) && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {task.related_order_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectModal({
                              isOpen: true,
                              type: 'order',
                              idOrCode: task.order?.id || task.related_order_id,
                              data: task.order,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                          <Package className="h-3.5 w-3.5 text-emerald-400" />
                          <span>
                            Order:{' '}
                            {task.order?.order_number || task.related_order_id}
                          </span>
                        </button>
                      )}
                      {task.related_ticket_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectModal({
                              isOpen: true,
                              type: 'ticket',
                              idOrCode:
                                task.ticket?.id || task.related_ticket_id,
                              data: task.ticket,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-300 transition-colors hover:bg-blue-500/20"
                        >
                          <Ticket className="h-3.5 w-3.5 text-blue-400" />
                          <span>
                            Ticket:{' '}
                            {task.ticket?.ticket_number ||
                              task.related_ticket_id}
                          </span>
                        </button>
                      )}
                      {task.related_product_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectModal({
                              isOpen: true,
                              type: 'product',
                              idOrCode:
                                task.product?.id || task.related_product_id,
                              data: task.product,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-purple-300 transition-colors hover:bg-purple-500/20"
                        >
                          <Box className="h-3.5 w-3.5 text-purple-400" />
                          <span className="max-w-[140px] truncate">
                            Product:{' '}
                            {task.product?.name || task.related_product_id}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination / Load More */}
        {tasks.length > 0 && hasMore && (
          <div className="border-t border-white/5 p-4">
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={loading}
              className="w-full rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {loading
                ? 'Loading...'
                : `Load More (${tasks.length} of ${total})`}
            </button>
          </div>
        )}
      </div>

      {/* Floating Bottom-Right "+ New Task" Accessibility Button */}
      <div className="fixed bottom-6 right-6 z-30 sm:hidden">
        <Link
          href="/admin/task-manager/new"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-950/50 transition-all hover:scale-105 hover:bg-emerald-500"
          title="Create New Task"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

      {/* Related Entity Modal */}
      <RelatedEntityModal
        isOpen={inspectModal.isOpen}
        onClose={() =>
          setInspectModal({ isOpen: false, type: null, idOrCode: null })
        }
        type={inspectModal.type}
        idOrCode={inspectModal.idOrCode}
        initialData={inspectModal.data}
      />
    </div>
  );
}
