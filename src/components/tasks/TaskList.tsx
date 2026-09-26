'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Paperclip,
  MessageSquare,
  Users,
  Flag,
  Calendar,
  Download,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
}: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    sort_by: 'created_at',
    sort_dir: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
        const response = await fetch(url);
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

  // Initial fetch
  useEffect(() => {
    fetchTasks(1);
  }, []);

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchTasks(1, { [key]: value });
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
    const priority = task.priority_name?.name || 'Normal';
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.Normal}`}
      >
        {priority}
      </span>
    );
  };

  const statusLabel = (task: Task) => {
    const status = task.status_name?.name || 'Open';
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status] || STATUS_COLORS.Open}`}
      >
        {status}
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
      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Tasks</h2>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            {total} total
          </span>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
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
            href="/admin/task-manager/new"
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
                  handleFilterChange('status', e.target.value || undefined)
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
                  handleFilterChange('priority', e.target.value || undefined)
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
                    my_tasks: false,
                    assigned_by_me: false,
                    supporting: false,
                    spectating: false,
                    due_today: false,
                    overdue: false,
                  };
                  if (val === 'my_tasks') newFilters.my_tasks = true;
                  else if (val === 'assigned_by_me')
                    newFilters.assigned_by_me = true;
                  else if (val === 'supporting') newFilters.supporting = true;
                  else if (val === 'spectating') newFilters.spectating = true;
                  else if (val === 'due_today') newFilters.due_today = true;
                  else if (val === 'overdue') newFilters.overdue = true;
                  Object.entries(newFilters).forEach(([k, v]) =>
                    handleFilterChange(k as keyof TaskFilters, v)
                  );
                }}
              >
                <option value="">All Tasks</option>
                <option value="my_tasks">My Tasks</option>
                <option value="assigned_by_me">Assigned by Me</option>
                <option value="supporting">Supporting</option>
                <option value="spectating">Spectating</option>
                <option value="due_today">Due Today</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setFilters({ sort_by: 'created_at', sort_dir: 'desc' });
              fetchTasks(1, { sort_by: 'created_at', sort_dir: 'desc' });
            }}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Clear all filters
          </button>
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
              href="/admin/task-manager/new"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Create Task
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="cursor-pointer p-4 transition-colors hover:bg-white/5"
                onClick={() => onTaskClick?.(task)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority indicator */}
                  <div className="mt-1 flex flex-col items-center gap-2">
                    {priorityLabel(task)}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 2 && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
                            +{task.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-medium text-white">
                            {task.title}
                          </h3>
                          {task.task_id_text && (
                            <span className="whitespace-nowrap text-[11px] text-slate-500">
                              {task.task_id_text}
                            </span>
                          )}
                          {statusLabel(task)}
                        </div>
                        <p className="mb-2 line-clamp-2 text-sm text-slate-400">
                          {task.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                          {task.assignee && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {task.assignee.full_name}
                            </span>
                          )}
                          {task.department_name && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {task.department_name}
                            </span>
                          )}
                          {task.due_date && (
                            <span
                              className={`flex items-center gap-1 ${getSlaStatus(task).class}`}
                            >
                              <Clock className="h-3 w-3" />
                              Due: {formatDate(task.due_date)} (
                              {getSlaStatus(task).label})
                            </span>
                          )}
                          {task.related_order_id && task.order && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Order: {task.order.order_number}
                            </span>
                          )}
                          {task.related_product_id && task.product && (
                            <span className="flex items-center gap-1">
                              <Box className="h-3 w-3" />
                              {task.product.name}
                            </span>
                          )}
                          {task.related_ticket_id && task.ticket && (
                            <span className="flex items-center gap-1">
                              <Ticket className="h-3 w-3" />
                              Ticket: {task.ticket.ticket_number}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/task-manager/${task.id}/edit`);
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
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
    </div>
  );
}

// Missing icons
function ClipboardList({ className }: { className?: string }) {
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function Building({ className }: { className?: string }) {
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
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function Package({ className }: { className?: string }) {
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
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function Box({ className }: { className?: string }) {
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
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function Ticket({ className }: { className?: string }) {
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
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"
      />
    </svg>
  );
}
