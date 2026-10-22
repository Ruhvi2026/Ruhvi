'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Clock,
  Building,
  Package,
  ClipboardList,
  CheckCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
  ArrowUpCircle,
  Trash2,
  FileSpreadsheet,
  Copy,
  Layers,
  LayoutGrid,
  List,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { debounce } from '@/lib/debounce';
import { useSearchParams, usePathname } from 'next/navigation';
import RelatedEntityModal from './RelatedEntityModal';
import { StaffAvatar } from './StaffAvatar';
import TaskOperationsGrid, { getTaskSopUrl } from './TaskOperationsGrid';
import { OPERATION_TASK_TEMPLATES, TaskTemplate } from './taskTemplates';
import { playCompletionSound, triggerConfettiBurst } from './taskSoundAndFx';
import { useAuth } from '@/context/AuthContext';
import {
  Task,
  TaskFilters,
  TaskPriority,
  TaskStatus,
  TaskListResponse,
  TaskUser,
} from './types';

interface TaskListProps {
  initialTasks?: Task[];
  initialTotal?: number;
  initialPage?: number;
  initialLimit?: number;
  initialHasMore?: boolean;
  onTaskClick?: (task: Task) => void;
  refreshKey?: number;
  externalFilters?: Record<string, unknown>;
  activeFilterLabel?: string;
  onClearFilter?: () => void;
  statuses?: TaskStatus[];
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  Normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Important: 'bg-red-500/20 text-red-400 border-red-500/30',
  Immediate: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  Accepted: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Updated: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
  statuses,
}: TaskListProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const currentUserId = profile?.id || user?.id;
  const isSuperAdmin = profile?.role === ('super_admin' as unknown);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const basePath = pathname ? pathname.split('?')[0] : '/admin/task-manager';
  const isAdminRole =
    isSuperAdmin ||
    profile?.role === 'admin' ||
    (profile?.role as unknown) === 'SUPER_ADMIN' ||
    (profile?.role as unknown) === 'ADMIN';
  const isInAdminPanel = pathname ? pathname.startsWith('/admin') : false;
  const canDeleteTasks = isAdminRole && isInAdminPanel;

  // View Mode: 'grid' (Spreadsheet Operations view) or 'cards' (Classic cards view)
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('task_manager_view_mode');
      if (saved === 'grid' || saved === 'cards') {
        setViewMode(saved);
      }
    }
  }, []);

  const switchViewMode = (mode: 'grid' | 'cards') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('task_manager_view_mode', mode);
    }
  };

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingTasks, setDeletingTasks] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [availableStatuses, setAvailableStatuses] = useState<TaskStatus[]>(
    statuses || []
  );
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [staffList, setStaffList] = useState<TaskUser[]>([]);

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  // Load Statuses & Priorities
  useEffect(() => {
    if (statuses && statuses.length > 0) {
      setAvailableStatuses(statuses);
    } else {
      fetch('/api/task-manager/statuses')
        .then((r) => r.json())
        .then((d) => {
          if (d.statuses) setAvailableStatuses(d.statuses);
        })
        .catch(() => {});
    }

    fetch('/api/task-manager/reference')
      .then((r) => r.json())
      .then((d) => {
        if (d.priorities) setPriorities(d.priorities);
        if (d.statuses && (!statuses || statuses.length === 0)) {
          setAvailableStatuses(d.statuses);
        }
      })
      .catch(() => {});
  }, [statuses]);

  // Load Departments & Staff for compact topbar filter dropdowns
  useEffect(() => {
    fetch('/api/task-manager/departments')
      .then((r) => r.json())
      .then((d) => {
        if (d.departments) setDepartments(d.departments);
      })
      .catch(() => {});

    fetch('/api/task-manager/staff')
      .then((r) => r.json())
      .then((d) => {
        if (d.staff) setStaffList(d.staff);
      })
      .catch(() => {});
  }, []);

  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [, setHasMore] = useState(initialHasMore);
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

  const [inspectModal, setInspectModal] = useState<{
    isOpen: boolean;
    type: 'order' | 'product' | 'ticket' | null;
    idOrCode: string | null;
    data?: unknown;
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
    (
      pageNum: number,
      additionalFilters: Partial<TaskFilters> = {},
      customLimit?: number
    ) => {
      const activeLimit = customLimit || limit;
      const params = new URLSearchParams();
      const mergedFilters = {
        ...filters,
        ...additionalFilters,
        limit: activeLimit,
        offset: (pageNum - 1) * activeLimit,
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
      additionalFilters: Partial<TaskFilters> = {},
      customLimit?: number
    ) => {
      setLoading(true);
      try {
        const url = buildApiUrl(pageNum, additionalFilters, customLimit);
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data: TaskListResponse = await response.json();

        if (data.tasks) {
          setTasks(data.tasks);
          setTotal(data.total);
          setPage(data.page);
          setHasMore(data.has_more);
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [buildApiUrl]
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
    const filterDelta = { [key]: value } as Partial<TaskFilters>;
    if (shouldDebounce) {
      debouncedFetch.current(1, filterDelta);
    } else {
      fetchTasks(1, filterDelta);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    fetchTasks(1, filters, newLimit);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (tasks.length > 0 && selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
    }
  };

  // Duplicate task functionality
  const handleDuplicateTask = async (taskToDuplicate: Task) => {
    if (actionLoading) return;
    setActionLoading(taskToDuplicate.id);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/task-manager/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `(Copy) ${taskToDuplicate.title}`,
          description: taskToDuplicate.description,
          assignee_id: taskToDuplicate.assignee_id,
          department_id: taskToDuplicate.department_id,
          priority_id: taskToDuplicate.priority_id,
          due_date: todayStr,
          due_time: taskToDuplicate.due_time,
          expected_duration: taskToDuplicate.expected_duration,
          tags: taskToDuplicate.tags,
          sop_url: getTaskSopUrl(taskToDuplicate),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate task');

      // Refresh task list
      await fetchTasks(1, filters);
      window.dispatchEvent(new Event('task-created-or-updated'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to duplicate task:', err);
      alert('Failed to duplicate task: ' + msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedTaskIds.size === 0) {
      alert('Please select at least one task to duplicate.');
      return;
    }
    const firstSelected = tasks.find((t) => selectedTaskIds.has(t.id));
    if (firstSelected) {
      handleDuplicateTask(firstSelected);
    }
  };

  // Create Task from Operational Template (Zero-Cron, 1-Click execution)
  const handleApplyTemplate = async (template: TaskTemplate) => {
    if (actionLoading) return;
    setShowTemplateMenu(false);
    setActionLoading('template');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const targetDept = departments.find(
        (d) => d.name.toLowerCase() === template.departmentName.toLowerCase()
      );
      const targetPriority = priorities.find(
        (p) => p.name.toLowerCase() === template.priority.toLowerCase()
      );

      const res = await fetch('/api/task-manager/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          department_id: targetDept?.id || null,
          priority_id: targetPriority?.id || null,
          due_date: todayStr,
          tags: template.tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply template');

      // Add template checklists if available
      if (data.task?.id && template.checklists?.length > 0) {
        for (const itemTitle of template.checklists) {
          await fetch(`/api/task-manager/tasks/${data.task.id}/checklists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: itemTitle }),
          });
        }
      }

      await fetchTasks(1, filters);
      window.dispatchEvent(new Event('task-created-or-updated'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to create task from template:', err);
      alert('Failed to apply template: ' + msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk Status Update (when floating action dock buttons are pressed)
  const handleBulkStatusUpdate = async (targetStatusName: string) => {
    if (selectedTaskIds.size === 0 || actionLoading) return;
    const targetStatus = availableStatuses.find(
      (s) => s.name === targetStatusName
    );
    if (!targetStatus) return;

    setActionLoading('bulk');
    try {
      const taskIds = Array.from(selectedTaskIds);
      await Promise.all(
        taskIds.map((id) =>
          fetch(`/api/task-manager/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_id: targetStatus.id }),
          })
        )
      );

      if (targetStatusName === 'Completed') {
        playCompletionSound();
        triggerConfettiBurst();
      }

      setSelectedTaskIds(new Set());
      await fetchTasks(page, filters);
      window.dispatchEvent(new Event('task-created-or-updated'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update tasks in bulk:', err);
      alert('Bulk status update failed: ' + msg);
    } finally {
      setActionLoading(null);
    }
  };

  // CSV Export (Google Sheets compatible)
  const handleExportCsv = () => {
    if (tasks.length === 0) return;
    const headers = [
      'Task ID',
      'Group / Dept',
      'Title',
      'Description',
      'Assignor',
      'Assignee',
      'Due Date',
      'Due Time',
      'SOP Link',
      'Status',
      'Priority',
    ];
    const rows = tasks.map((t) => [
      t.task_id_text || '',
      t.department_name || '',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.creator?.full_name || 'System',
      t.assignee?.full_name || 'Unassigned',
      t.due_date || '',
      t.due_time || '',
      getTaskSopUrl(t) || '',
      t.status_name?.name || '',
      t.priority_name?.name || 'Normal',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ruhvi_tasks_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = async () => {
    if (!canDeleteTasks || selectedTaskIds.size === 0 || deletingTasks) return;
    const count = selectedTaskIds.size;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${count} selected task(s)? This action can only be performed from the Admin Panel and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingTasks(true);
    try {
      const res = await fetch('/api/task-manager/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: Array.from(selectedTaskIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete tasks');

      const deletedSet = new Set(selectedTaskIds);
      setTasks((prev) => prev.filter((t) => !deletedSet.has(t.id)));
      setTotal((prev) => Math.max(0, (prev || 0) - deletedSet.size));
      setSelectedTaskIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Bulk delete failed:', err);
      alert('Error deleting tasks: ' + msg);
    } finally {
      setDeletingTasks(false);
    }
  };

  const handleDeleteSingleTask = async (taskToDelete: Task) => {
    if (!canDeleteTasks || deletingTasks) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete task "${taskToDelete.task_id_text || taskToDelete.title}"?`
    );
    if (!confirmed) return;

    setDeletingTasks(true);
    try {
      const res = await fetch(`/api/task-manager/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task');

      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTotal((prev) => Math.max(0, (prev || 0) - 1));
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskToDelete.id);
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete task';
      console.error('Failed to delete task:', err);
      alert('Error: ' + msg);
    } finally {
      setDeletingTasks(false);
    }
  };

  const handleQuickStatusUpdate = async (
    e: React.MouseEvent,
    task: Task,
    targetStatusName: string
  ) => {
    e.stopPropagation();
    let statusList = availableStatuses;
    if (!statusList || statusList.length === 0) {
      try {
        const sRes = await fetch('/api/task-manager/statuses');
        const sData = await sRes.json();
        statusList = sData.statuses || [];
        setAvailableStatuses(statusList);
      } catch (err) {
        console.error('Failed to fetch statuses:', err);
      }
    }

    const targetStatus = statusList.find((s) => s.name === targetStatusName);
    if (!targetStatus || actionLoading) return;

    setActionLoading(task.id);

    // Optimistically update the UI state immediately
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status_id: targetStatus.id,
              status_name: targetStatus,
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/task-manager/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: targetStatus.id }),
      });
      if (!res.ok) throw new Error('Failed to update status');

      const data = await res.json();
      if (data.task) {
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === task.id ? { ...t, ...data.task } : t))
        );
      }

      window.dispatchEvent(new Event('task-created-or-updated'));
    } catch (err) {
      console.error('Failed to update task status:', err);
      await fetchTasks(page, filters);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    const maxPage = Math.ceil(total / limit) || 1;
    if (newPage > maxPage) return;
    fetchTasks(newPage);
  };

  const totalPages = Math.ceil(total / limit) || 1;

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
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
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
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
          STATUS_COLORS[statusStr] || STATUS_COLORS.Open
        }`}
      >
        {statusStr}
      </span>
    );
  };

  const getActionButton = (task: Task) => {
    if (!currentUserId || availableStatuses.length === 0) return null;
    const currentStatus = task.status_name?.name || 'Open';
    const isAssignee = currentUserId === task.assignee_id || isSuperAdmin;
    const isAssignor = currentUserId === task.created_by || isSuperAdmin;
    const isLoading = actionLoading === task.id;

    if (currentStatus === 'Closed') return null;

    if (isAssignee) {
      if (currentStatus === 'Open') {
        return (
          <button
            onClick={(e) => handleQuickStatusUpdate(e, task, 'Accepted')}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-md disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {isLoading ? 'Accepting...' : 'Accept'}
          </button>
        );
      }
      if (currentStatus === 'Accepted') {
        return (
          <button
            onClick={(e) => handleQuickStatusUpdate(e, task, 'In Progress')}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {isLoading ? 'Starting...' : 'Start Work'}
          </button>
        );
      }
      if (currentStatus === 'In Progress' || currentStatus === 'Updated') {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleQuickStatusUpdate(e, task, 'Updated')}
              disabled={isLoading || currentStatus === 'Updated'}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-50"
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Update
            </button>
            <button
              onClick={(e) => {
                playCompletionSound();
                triggerConfettiBurst(e.clientX, e.clientY);
                handleQuickStatusUpdate(e, task, 'Completed');
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-md disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {isLoading ? 'Completing...' : 'Complete'}
            </button>
          </div>
        );
      }
    }

    if (isAssignor) {
      if (currentStatus === 'Completed') {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleQuickStatusUpdate(e, task, 'Open')}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-open
            </button>
            <button
              onClick={(e) => handleQuickStatusUpdate(e, task, 'Closed')}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-500 hover:shadow-md disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {isLoading ? 'Closing...' : 'Close Task'}
            </button>
          </div>
        );
      }
    }

    return null;
  };

  const handleInspectEntity = (
    type: 'order' | 'product' | 'ticket',
    idOrCode: string,
    data?: unknown
  ) => {
    setInspectModal({
      isOpen: true,
      type,
      idOrCode,
      data,
    });
  };

  const handleOpenMessengerGroup = (groupId: string) => {
    window.dispatchEvent(
      new CustomEvent('openMessengerGroup', {
        detail: {
          conversationId: groupId,
        },
      })
    );
  };

  const getActiveScopeValue = () => {
    if (filters.all_my_tasks) return 'all_my_tasks';
    if (filters.my_tasks) return 'my_tasks';
    if (filters.assigned_by_me) return 'assigned_by_me';
    if (filters.supporting) return 'supporting';
    if (filters.spectating) return 'spectating';
    return '';
  };

  const getActiveTimelineValue = () => {
    if (filters.overdue) return 'overdue';
    if (filters.due_today) return 'due_today';
    if (filters.due_soon) return 'due_soon';
    return '';
  };

  return (
    <div className="flex h-full flex-col bg-[#0a0d17]">
      {/* Active Dashboard Filter Banner */}
      {activeFilterLabel && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-emerald-400" />
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
                className="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 hover:text-white"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* High-Density Operations Toolbar */}
      <div className="border-b border-white/10 bg-[#101426] p-2.5 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Export CSV / Sheets Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-400 shadow-sm transition-all hover:bg-emerald-500/20"
              title="Export Current View to CSV / Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Multi-Select / Select All Toggle */}
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition-all ${
                selectedTaskIds.size > 0
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              title="Toggle Select All Tasks on Page"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>
                + Multi{' '}
                {selectedTaskIds.size > 0 ? `(${selectedTaskIds.size})` : ''}
              </span>
            </button>

            {/* Instant Refresh Button */}
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                fetchTasks(1, filters);
              }}
              disabled={loading || isRefreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 shadow-sm transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              title="Refresh Tasks"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing || loading ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={handleDuplicateSelected}
              disabled={selectedTaskIds.size === 0}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-300 shadow-sm transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                selectedTaskIds.size > 0
                  ? 'Duplicate selected task'
                  : 'Select a task to duplicate'
              }
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicate</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex h-8 items-center rounded-lg border border-white/10 bg-black/40 p-0.5">
              <button
                type="button"
                onClick={() => switchViewMode('grid')}
                className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Operations Spreadsheet Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sheet Grid</span>
              </button>
              <button
                type="button"
                onClick={() => switchViewMode('cards')}
                className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-all ${
                  viewMode === 'cards'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Standard Cards View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Cards</span>
              </button>
            </div>
          </div>

          {/* Right Action: Templates & New Task */}
          <div className="relative flex items-center gap-2">
            {/* Operational Templates Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-300 shadow-sm transition-all hover:bg-amber-500/20"
                title="Choose an Operational Routine Template"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Templates</span>
              </button>

              {/* Templates Dropdown Menu */}
              {showTemplateMenu && (
                <div className="absolute right-0 top-full z-40 mt-1.5 w-72 rounded-xl border border-white/15 bg-[#141a2e] p-1.5 shadow-2xl backdrop-blur-xl">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    One-Click Operations Templates
                  </div>
                  <div className="space-y-1">
                    {OPERATION_TASK_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs transition-colors hover:bg-white/10"
                      >
                        <span className="text-base leading-none">
                          {tmpl.icon}
                        </span>
                        <div>
                          <div className="font-semibold text-white">
                            {tmpl.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tmpl.departmentName} Dept
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* New Task Link */}
            <Link
              href={`${basePath}?action=new`}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </Link>
          </div>
        </div>

        {/* Second Row: Dense Search & Fast Filter Dropdowns */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search task, ID, keyword..."
              className="h-8 w-full rounded-lg border border-white/10 bg-black/40 py-1 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              onChange={(e) => handleFilterChange('search', e.target.value)}
              defaultValue={filters.search}
            />
          </div>

          {/* Scope Dropdown */}
          <select
            value={getActiveScopeValue()}
            onChange={(e) => {
              const val = e.target.value;
              const newScope: Partial<TaskFilters> = {
                all_my_tasks: false,
                my_tasks: false,
                assigned_by_me: false,
                supporting: false,
                spectating: false,
              };
              if (val === 'all_my_tasks') newScope.all_my_tasks = true;
              else if (val === 'my_tasks') newScope.my_tasks = true;
              else if (val === 'assigned_by_me') newScope.assigned_by_me = true;
              else if (val === 'supporting') newScope.supporting = true;
              else if (val === 'spectating') newScope.spectating = true;
              setFilters((prev) => ({ ...prev, ...newScope }));
              fetchTasks(1, newScope);
            }}
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Scope: All Tasks</option>
            <option value="my_tasks">My Assigned Tasks</option>
            <option value="assigned_by_me">Assigned by Me</option>
            <option value="supporting">Collaborating</option>
            <option value="spectating">Spectating / Inspecting</option>
          </select>

          {/* Timeline / Overdue Dropdown */}
          <select
            value={getActiveTimelineValue()}
            onChange={(e) => {
              const val = e.target.value;
              const newTimeline: Partial<TaskFilters> = {
                overdue: false,
                due_today: false,
                due_soon: false,
              };
              if (val === 'overdue') newTimeline.overdue = true;
              else if (val === 'due_today') newTimeline.due_today = true;
              else if (val === 'due_soon') newTimeline.due_soon = true;
              setFilters((prev) => ({ ...prev, ...newTimeline }));
              fetchTasks(1, newTimeline);
            }}
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Timeline: All</option>
            <option value="overdue">⚠ Overdue All</option>
            <option value="due_today">Due Today</option>
            <option value="due_soon">Due Soon (24h)</option>
          </select>

          {/* Group / Department Dropdown */}
          <select
            value={filters.department || ''}
            onChange={(e) =>
              handleFilterChange('department', e.target.value || undefined)
            }
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Group: All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Assignee Dropdown */}
          <select
            value={filters.assignee || ''}
            onChange={(e) =>
              handleFilterChange('assignee', e.target.value || undefined)
            }
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Assignee: All</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={filters.status || ''}
            onChange={(e) =>
              handleFilterChange('status', e.target.value || undefined)
            }
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Status: All</option>
            <option value="Open">Todo / Open</option>
            <option value="Accepted">Accepted</option>
            <option value="In Progress">In Progress</option>
            <option value="Updated">Updated</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={filters.priority || ''}
            onChange={(e) =>
              handleFilterChange('priority', e.target.value || undefined)
            }
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Priority: All</option>
            <option value="immediate">Immediate</option>
            <option value="important">Important</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Clear Filters Button */}
          {(filters.search ||
            filters.department ||
            filters.assignee ||
            filters.status ||
            filters.priority ||
            filters.overdue ||
            filters.due_today ||
            filters.my_tasks) && (
            <button
              type="button"
              onClick={() => {
                const reset: TaskFilters = {
                  sort_by: 'created_at',
                  sort_dir: 'desc',
                };
                setFilters(reset);
                fetchTasks(1, reset);
              }}
              className="h-8 rounded-lg px-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Quick Category Chips / Tabs Bar */}
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-white/10 bg-[#0d1122] px-3 py-2 sm:px-4">
        {/* All Tab */}
        <button
          type="button"
          onClick={() => {
            const nextFilters = {
              ...filters,
              department: undefined,
              overdue: false,
              due_today: false,
            };
            setFilters(nextFilters);
            fetchTasks(1, {
              department: undefined,
              overdue: false,
              due_today: false,
            });
          }}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            !filters.department && !filters.overdue && !filters.due_today
              ? 'bg-emerald-600 text-white shadow'
              : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>All Tasks</span>
          <span className="py-0.2 rounded-full bg-black/30 px-1.5 text-[10px]">
            {total}
          </span>
        </button>

        {/* Overdue Alert Tab */}
        <button
          type="button"
          onClick={() => {
            const nextFilters = {
              ...filters,
              overdue: true,
              due_today: false,
              department: undefined,
            };
            setFilters(nextFilters);
            fetchTasks(1, {
              overdue: true,
              due_today: false,
              department: undefined,
            });
          }}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            filters.overdue
              ? 'bg-rose-600 text-white shadow shadow-rose-900/40'
              : 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          <span>Overdue (⚠)</span>
        </button>

        {/* Due Today Tab */}
        <button
          type="button"
          onClick={() => {
            const nextFilters = {
              ...filters,
              due_today: true,
              overdue: false,
              department: undefined,
            };
            setFilters(nextFilters);
            fetchTasks(1, {
              due_today: true,
              overdue: false,
              department: undefined,
            });
          }}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            filters.due_today
              ? 'bg-amber-600 text-white shadow'
              : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          <Clock className="h-3 w-3" />
          <span>Due Today</span>
        </button>

        {/* Department Chips */}
        {departments.map((dept) => {
          const isSelected = filters.department === dept.id;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => {
                const nextDept = isSelected ? undefined : dept.id;
                const nextFilters = {
                  ...filters,
                  department: nextDept,
                  overdue: false,
                  due_today: false,
                };
                setFilters(nextFilters);
                fetchTasks(1, {
                  department: nextDept,
                  overdue: false,
                  due_today: false,
                });
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-cyan-600 text-white shadow'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{dept.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 pb-20 sm:p-4">
        {loading && tasks.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <ClipboardList className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">
              No tasks found
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              No tasks match your selected filter criteria.
            </p>
            <Link
              href={`${basePath}?action=new`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Create New Task
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          /* High-Density Spreadsheet Operations Grid */
          <TaskOperationsGrid
            tasks={tasks}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={toggleTaskSelection}
            onToggleSelectAll={toggleSelectAll}
            onTaskClick={onTaskClick}
            canDeleteTasks={canDeleteTasks}
            onDeleteSingleTask={handleDeleteSingleTask}
            onDuplicateTask={handleDuplicateTask}
            onQuickStatusUpdate={handleQuickStatusUpdate}
            availableStatuses={availableStatuses}
            priorities={priorities}
            actionLoading={actionLoading}
            currentUserId={currentUserId}
            isSuperAdmin={isSuperAdmin}
            onInspectEntity={handleInspectEntity}
            onOpenMessengerGroup={handleOpenMessengerGroup}
            onRefreshTasks={() => fetchTasks(page, filters)}
          />
        ) : (
          /* Classic Cards View */
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="group cursor-pointer rounded-lg border border-white/10 bg-[#161B2C]/80 px-3.5 py-2.5 transition-all hover:border-emerald-500/40 hover:bg-[#1C2339]"
              >
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {canDeleteTasks && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex shrink-0 items-center pr-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.has(task.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleTaskSelection(task.id);
                          }}
                          className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                        />
                      </div>
                    )}

                    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs font-medium text-slate-400">
                      {task.task_id_text || 'TASK'}
                    </span>

                    <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-emerald-400">
                      {task.title}
                    </h3>

                    {task.department_name && (
                      <span className="inline-flex items-center gap-1.5 rounded border border-white/5 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                        <Building className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{task.department_name}</span>
                      </span>
                    )}

                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <StaffAvatar user={task.creator} size="sm" />
                      <span>{task.creator?.full_name || 'System'}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                      <StaffAvatar user={task.assignee} size="sm" />
                      <span className="font-semibold text-slate-100">
                        {task.assignee?.full_name || 'Unassigned'}
                      </span>
                    </div>

                    {/* Related Entities */}
                    {task.related_order_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectEntity(
                            'order',
                            task.order?.id || task.related_order_id!,
                            task.order
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                      >
                        <Package className="h-3.5 w-3.5 text-emerald-400" />
                        <span>
                          Order:{' '}
                          {task.order?.order_number || task.related_order_id}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {statusLabel(task)}
                    {priorityLabel(task)}

                    {task.due_date && (
                      <span
                        className={`whitespace-nowrap rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-xs font-medium ${
                          getSlaStatus(task).class
                        }`}
                      >
                        SLA: {getSlaStatus(task).label}
                      </span>
                    )}

                    {getActionButton(task)}

                    {canDeleteTasks && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSingleTask(task);
                        }}
                        disabled={deletingTasks}
                        className="rounded p-1.5 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Multi-Action Bottom Dock */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-[#161c33]/95 px-4 py-2.5 shadow-2xl ring-1 ring-black/50 backdrop-blur-xl">
          <span className="pr-1 text-xs font-semibold text-emerald-300">
            {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''}{' '}
            selected
          </span>

          <button
            type="button"
            onClick={() => handleBulkStatusUpdate('In Progress')}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span>In Progress</span>
          </button>

          <button
            type="button"
            onClick={() => handleBulkStatusUpdate('Completed')}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Complete</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateSelected}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Duplicate</span>
          </button>

          {canDeleteTasks && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deletingTasks}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedTaskIds(new Set())}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-white"
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="border-t border-white/10 bg-[#101426] px-4 py-2.5 text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Row count summary */}
          <div>
            Showing{' '}
            <strong className="text-white">
              {total > 0 ? (page - 1) * limit + 1 : 0} -{' '}
              {Math.min(page * limit, total)}
            </strong>{' '}
            of <strong className="text-white">{total}</strong> rows
          </div>

          {/* Rows per page dropdown & Pagination Buttons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="h-7 rounded border border-white/10 bg-black/40 px-2 text-xs text-white focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={page <= 1 || loading}
                className="h-7 rounded border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="h-7 rounded border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Prev
              </button>
              <span className="flex h-7 min-w-[28px] items-center justify-center rounded bg-emerald-600 px-2 text-xs font-semibold text-white">
                {page}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="h-7 rounded border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={page >= totalPages || loading}
                className="h-7 rounded border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom-Right "+ New Task" Accessibility Button (Mobile) */}
      <div className="fixed bottom-6 right-6 z-30 sm:hidden">
        <Link
          href={`${basePath}?action=new`}
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
