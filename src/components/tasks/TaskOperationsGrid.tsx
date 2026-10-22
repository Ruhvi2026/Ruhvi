'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  PlayCircle,
  XCircle,
  Trash2,
  ExternalLink,
  MessageSquare,
  Package,
  Ticket,
  Box,
  Copy,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  FileText,
  Check,
  Pin,
  Edit2,
} from 'lucide-react';
import { StaffAvatar } from './StaffAvatar';
import { Task, TaskStatus, TaskPriority } from './types';
import { playCompletionSound, triggerConfettiBurst } from './taskSoundAndFx';

export function getTaskSopUrl(task: Task): string | null {
  if (task.sop_url) return task.sop_url;
  if (task.tags && Array.isArray(task.tags)) {
    const sopTag = task.tags.find(
      (t) => typeof t === 'string' && t.toLowerCase().startsWith('sop:')
    );
    if (sopTag) return sopTag.replace(/^sop:/i, '').trim();
  }
  if (task.description) {
    const match = task.description.match(/sop:\s*(https?:\/\/[^\s]+)/i);
    if (match) return match[1];
  }
  return null;
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const statusName = task.status_name?.name;
  if (statusName === 'Completed' || statusName === 'Closed') return false;

  const due = new Date(
    task.due_time
      ? `${task.due_date}T${task.due_time}`
      : `${task.due_date}T23:59:59`
  );
  return due.getTime() < Date.now();
}

export function isTaskDueToday(task: Task): boolean {
  if (!task.due_date) return false;
  const statusName = task.status_name?.name;
  if (statusName === 'Completed' || statusName === 'Closed') return false;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueStr = task.due_date.split('T')[0];
  return todayStr === dueStr;
}

export function formatTargetDueDate(
  dateStr: string | null,
  timeStr: string | null
): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[d.getMonth()];

    // Suffix (1st, 2nd, 3rd, 4th...)
    const j = day % 10;
    const k = day % 100;
    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';

    let result = `${day}${suffix} ${month}`;
    if (timeStr) {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      result += ` ${hour12}:${m} ${ampm}`;
    }
    return result;
  } catch {
    return dateStr;
  }
}

const PRIORITY_DOT_COLORS: Record<
  string,
  { bg: string; ring: string; label: string }
> = {
  Immediate: {
    bg: 'bg-rose-500',
    ring: 'ring-rose-500/30',
    label: 'Immediate',
  },
  Important: { bg: 'bg-red-500', ring: 'ring-red-500/30', label: 'Important' },
  High: { bg: 'bg-amber-400', ring: 'ring-amber-400/30', label: 'High' },
  Normal: { bg: 'bg-blue-400', ring: 'ring-blue-400/30', label: 'Normal' },
  Low: { bg: 'bg-slate-400', ring: 'ring-slate-400/30', label: 'Low' },
};

const STATUS_PILL_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Open: { bg: 'bg-sky-500', text: 'text-white', border: 'border-sky-400' },
  Todo: { bg: 'bg-sky-500', text: 'text-white', border: 'border-sky-400' },
  Accepted: {
    bg: 'bg-indigo-600',
    text: 'text-white',
    border: 'border-indigo-500',
  },
  'In Progress': {
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-500',
  },
  Updated: {
    bg: 'bg-amber-500',
    text: 'text-black font-semibold',
    border: 'border-amber-400',
  },
  Completed: {
    bg: 'bg-emerald-600',
    text: 'text-white',
    border: 'border-emerald-500',
  },
  Closed: {
    bg: 'bg-slate-700',
    text: 'text-slate-300',
    border: 'border-slate-600',
  },
};

const DEPARTMENT_BADGE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Shipping: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
  },
  Operations: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
  },
  Support: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
  Inventory: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-500/30',
  },
  Tech: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
  },
  Marketing: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-300',
    border: 'border-pink-500/30',
  },
  Sales: {
    bg: 'bg-lime-500/10',
    text: 'text-lime-300',
    border: 'border-lime-500/30',
  },
  General: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
  },
};

interface TaskOperationsGridProps {
  tasks: Task[];
  selectedTaskIds: Set<string>;
  onToggleTaskSelection: (taskId: string) => void;
  onToggleSelectAll: () => void;
  onTaskClick?: (task: Task) => void;
  canDeleteTasks: boolean;
  onDeleteSingleTask?: (task: Task) => void;
  onDuplicateTask?: (task: Task) => void;
  onQuickStatusUpdate: (
    e: React.MouseEvent,
    task: Task,
    targetStatusName: string
  ) => void;
  availableStatuses: TaskStatus[];
  priorities?: TaskPriority[];
  actionLoading: string | null;
  currentUserId?: string | null;
  isSuperAdmin?: boolean;
  onInspectEntity: (
    type: 'order' | 'product' | 'ticket',
    idOrCode: string,
    data?: unknown
  ) => void;
  onOpenMessengerGroup?: (groupId: string) => void;
  onRefreshTasks?: () => void;
}

export default function TaskOperationsGrid({
  tasks,
  selectedTaskIds,
  onToggleTaskSelection,
  onToggleSelectAll,
  onTaskClick,
  canDeleteTasks,
  onDeleteSingleTask,
  onDuplicateTask,
  onQuickStatusUpdate,
  availableStatuses,
  priorities = [],
  actionLoading,
  currentUserId,
  isSuperAdmin,
  onInspectEntity,
  onOpenMessengerGroup,
  onRefreshTasks,
}: TaskOperationsGridProps) {
  const [activeChecklistPopoverId, setActiveChecklistPopoverId] = useState<
    string | null
  >(null);
  const [statusMenuOpenTaskId, setStatusMenuOpenTaskId] = useState<
    string | null
  >(null);
  const [priorityMenuOpenTaskId, setPriorityMenuOpenTaskId] = useState<
    string | null
  >(null);

  // Task Pinning State (Persisted in localStorage)
  const [pinnedTaskIds, setPinnedTaskIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('ruhvi_pinned_tasks');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const togglePinTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      try {
        localStorage.setItem(
          'ruhvi_pinned_tasks',
          JSON.stringify(Array.from(next))
        );
      } catch {}
      return next;
    });
  };

  // Inline Title Editing State
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [savingTitle, setSavingTitle] = useState(false);

  const startEditingTitle = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(task.id);
    setEditingTitleValue(task.title);
  };

  const handleSaveInlineTitle = async (taskId: string) => {
    const trimmed = editingTitleValue.trim();
    if (!trimmed || savingTitle) {
      setEditingTitleId(null);
      return;
    }
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/task-manager/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        onRefreshTasks?.();
      }
    } catch (err) {
      console.error('Failed to update task title inline:', err);
    } finally {
      setSavingTitle(false);
      setEditingTitleId(null);
    }
  };

  // Inline Checklist Subtask Toggle
  const handleToggleChecklistItem = async (
    taskId: string,
    checklistId: string,
    currentCompleted: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${taskId}/checklists?checklist_id=${checklistId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !currentCompleted }),
        }
      );
      if (res.ok) {
        onRefreshTasks?.();
      }
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
    }
  };

  // Inline Priority Update
  const handleInlinePriorityChange = async (
    taskId: string,
    priorityId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setPriorityMenuOpenTaskId(null);
    try {
      const res = await fetch(`/api/task-manager/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_id: priorityId }),
      });
      if (res.ok) {
        onRefreshTasks?.();
      }
    } catch (err) {
      console.error('Failed to change priority inline:', err);
    }
  };

  // Status Change with Sound & Particle celebration
  const handleCelebratedStatusUpdate = (
    e: React.MouseEvent,
    task: Task,
    targetStatusName: string
  ) => {
    if (targetStatusName === 'Completed') {
      playCompletionSound();
      triggerConfettiBurst(e.clientX, e.clientY);
    }
    onQuickStatusUpdate(e, task, targetStatusName);
  };

  const allSelected = tasks.length > 0 && selectedTaskIds.size === tasks.length;

  // Sort pinned tasks to the very top
  const sortedTasks = [...tasks].sort((a, b) => {
    const aPinned = pinnedTaskIds.has(a.id) ? 1 : 0;
    const bPinned = pinnedTaskIds.has(b.id) ? 1 : 0;
    return bPinned - aPinned;
  });

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#0c101d] shadow-2xl">
      <div className="scrollbar-thin scrollbar-track-[#0a0d17] scrollbar-thumb-white/10 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-xs text-slate-200">
          {/* Table Header */}
          <thead>
            <tr className="sticky top-0 z-20 border-b border-white/10 bg-[#141a2e] text-[11px] font-semibold tracking-wider text-slate-400">
              {/* Checkbox */}
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/40"
                  title="Select all tasks on page"
                />
              </th>

              {/* Pin / Priority Alert Bar (CA) */}
              <th
                className="w-6 px-1 py-3 text-center"
                title="Pin / Status Alert"
              >
                CA
              </th>

              {/* Department / Group */}
              <th className="w-28 px-3 py-3 font-semibold uppercase">GROUP</th>

              {/* Task Details */}
              <th className="min-w-[280px] px-3 py-3 font-semibold uppercase">
                TASK
              </th>

              {/* Status Dot */}
              <th className="w-8 px-2 py-3 text-center" title="Active Status">
                ●
              </th>

              {/* Assignor */}
              <th className="w-32 px-3 py-3 font-semibold uppercase">
                ASSIGNOR
              </th>

              {/* Assignee */}
              <th className="w-36 px-3 py-3 font-semibold uppercase">
                ASSIGNEE
              </th>

              {/* Target / TAT (Due Date & Time) */}
              <th className="w-32 px-3 py-3 font-semibold uppercase">
                TAT / DUE
              </th>

              {/* SOP (Standard Operating Procedure) */}
              <th
                className="w-20 px-2 py-3 text-center font-semibold uppercase"
                title="Standard Operating Procedure"
              >
                SOP
              </th>

              {/* Checklist (CL) Progress Bar */}
              <th
                className="w-24 px-2 py-3 text-center font-semibold uppercase"
                title="Checklist Progress"
              >
                CL
              </th>

              {/* Status */}
              <th className="w-28 px-3 py-3 font-semibold uppercase">STATUS</th>

              {/* Priority (P) */}
              <th
                className="w-12 px-2 py-3 text-center font-semibold uppercase"
                title="Priority"
              >
                P
              </th>

              {/* Action */}
              <th className="w-28 px-3 py-3 text-right font-semibold uppercase">
                ACTION
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/5">
            {sortedTasks.map((task) => {
              const isSelected = selectedTaskIds.has(task.id);
              const isPinned = pinnedTaskIds.has(task.id);
              const overdue = isTaskOverdue(task);
              const dueToday = isTaskDueToday(task);
              const statusName = task.status_name?.name || 'Open';
              const isCompleted =
                statusName === 'Completed' || statusName === 'Closed';
              const sopUrl = getTaskSopUrl(task);
              const priorityName = task.priority_name?.name || 'Normal';
              const priorityConfig =
                PRIORITY_DOT_COLORS[priorityName] || PRIORITY_DOT_COLORS.Normal;
              const statusPill =
                STATUS_PILL_STYLES[statusName] || STATUS_PILL_STYLES.Open;
              const deptName = task.department_name || 'General';
              const deptStyle =
                DEPARTMENT_BADGE_COLORS[deptName] ||
                DEPARTMENT_BADGE_COLORS.General;

              // Checklists summary & progress percentage
              const checklists = task.checklists || [];
              const totalChecklists = checklists.length;
              const completedChecklists = checklists.filter(
                (c) => c.completed
              ).length;
              const checklistPercent =
                totalChecklists > 0
                  ? Math.round((completedChecklists / totalChecklists) * 100)
                  : 0;

              // Row Border Left indicator
              let rowBorderColor = 'border-l-transparent';
              if (isPinned) rowBorderColor = 'border-l-amber-400';
              else if (overdue) rowBorderColor = 'border-l-rose-500';
              else if (dueToday) rowBorderColor = 'border-l-amber-500';
              else if (isCompleted) rowBorderColor = 'border-l-emerald-500';
              else if (statusName === 'In Progress')
                rowBorderColor = 'border-l-blue-500';

              // Permissions
              const isAssignee =
                currentUserId === task.assignee_id || isSuperAdmin;
              const isAssignor =
                currentUserId === task.created_by || isSuperAdmin;
              const isLoading = actionLoading === task.id;

              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className={`group cursor-pointer border-l-4 ${rowBorderColor} transition-colors ${
                    isPinned
                      ? 'bg-amber-950/20 hover:bg-amber-950/30'
                      : isSelected
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                        : overdue
                          ? 'bg-rose-950/10 hover:bg-rose-950/20'
                          : dueToday
                            ? 'bg-amber-950/10 hover:bg-amber-950/20'
                            : 'hover:bg-[#151c33]'
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="px-3 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleTaskSelection(task.id);
                      }}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/40"
                    />
                  </td>

                  {/* Pin to Top Button (CA column) */}
                  <td
                    className="px-1 py-2.5 text-center"
                    onClick={(e) => togglePinTask(task.id, e)}
                  >
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center transition-colors ${
                        isPinned
                          ? 'text-amber-400'
                          : 'text-slate-600 opacity-0 hover:text-amber-300 group-hover:opacity-100'
                      }`}
                      title={isPinned ? 'Unpin from Top' : 'Pin to Top'}
                    >
                      <Pin
                        className={`h-3.5 w-3.5 ${isPinned ? 'fill-amber-400' : ''}`}
                      />
                    </button>
                  </td>

                  {/* GROUP / Department */}
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${deptStyle.bg} ${deptStyle.text} ${deptStyle.border}`}
                    >
                      {deptName}
                    </span>
                  </td>

                  {/* TASK details (with Inline Title Editing) */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Task ID text */}
                        <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400">
                          {task.task_id_text || 'TASK'}
                        </span>

                        {/* Inline Title Editor */}
                        {editingTitleId === task.id ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingTitleValue}
                              onChange={(e) =>
                                setEditingTitleValue(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleSaveInlineTitle(task.id);
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              className="h-6 rounded border border-emerald-500 bg-black/80 px-2 text-xs font-medium text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineTitle(task.id)}
                              className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-500"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTitleId(null)}
                              className="rounded px-1 text-[10px] text-slate-400 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            className="group/title flex items-center gap-1"
                            onDoubleClick={(e) => startEditingTitle(task, e)}
                          >
                            <span
                              className="font-medium text-white transition-colors group-hover:text-emerald-300"
                              title="Double click to edit title inline"
                            >
                              {task.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => startEditingTitle(task, e)}
                              className="text-slate-500 opacity-0 transition-opacity hover:text-emerald-400 group-hover/title:opacity-100"
                              title="Edit Title Inline"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Brief description snippet & Related Entities */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        {task.description && (
                          <span className="line-clamp-1 max-w-md text-slate-400/80">
                            {task.description}
                          </span>
                        )}

                        {/* Related Order pill */}
                        {task.related_order_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectEntity(
                                'order',
                                task.order?.id || task.related_order_id!,
                                task.order
                              );
                            }}
                            className="py-0.2 inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-300 hover:bg-emerald-500/20"
                            title="Inspect Order"
                          >
                            <Package className="h-3 w-3" />
                            <span>
                              {task.order?.order_number ||
                                task.related_order_id}
                            </span>
                          </button>
                        )}

                        {/* Related Ticket pill */}
                        {task.related_ticket_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectEntity(
                                'ticket',
                                task.ticket?.id || task.related_ticket_id!,
                                task.ticket
                              );
                            }}
                            className="py-0.2 inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 text-[10px] text-blue-300 hover:bg-blue-500/20"
                            title="Inspect Ticket"
                          >
                            <Ticket className="h-3 w-3" />
                            <span>
                              {task.ticket?.ticket_number ||
                                task.related_ticket_id}
                            </span>
                          </button>
                        )}

                        {/* Related Product pill */}
                        {task.related_product_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectEntity(
                                'product',
                                task.product?.id || task.related_product_id!,
                                task.product
                              );
                            }}
                            className="py-0.2 inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-1.5 text-[10px] text-purple-300 hover:bg-purple-500/20"
                            title="Inspect Product"
                          >
                            <Box className="h-3 w-3" />
                            <span className="max-w-[100px] truncate">
                              {task.product?.name || task.related_product_id}
                            </span>
                          </button>
                        )}

                        {/* Group Messenger / Chat button */}
                        {task.messenger_group_id && onOpenMessengerGroup && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMessengerGroup(task.messenger_group_id!);
                            }}
                            className="py-0.2 inline-flex items-center gap-1 rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 text-[10px] text-indigo-300 hover:bg-indigo-500/20"
                            title="Open Task Chat"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Chat</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status Indicator Dot (●) */}
                  <td className="px-2 py-2.5 text-center">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                          : statusName === 'In Progress'
                            ? 'bg-blue-400 shadow-sm shadow-blue-400/40'
                            : overdue
                              ? 'animate-pulse bg-rose-500 shadow-sm shadow-rose-500/40'
                              : 'bg-emerald-400/80'
                      }`}
                      title={`Status: ${statusName}`}
                    />
                  </td>

                  {/* ASSIGNOR */}
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <StaffAvatar user={task.creator} size="sm" />
                      <span className="max-w-[90px] truncate font-medium text-slate-200">
                        {task.creator?.full_name || 'System'}
                      </span>
                    </div>
                  </td>

                  {/* ASSIGNEE */}
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <StaffAvatar user={task.assignee} size="sm" />
                      <div className="flex flex-col">
                        <span className="max-w-[95px] truncate font-medium text-slate-100">
                          {task.assignee?.full_name || 'Unassigned'}
                        </span>
                        {task.collaborators &&
                          task.collaborators.length > 0 && (
                            <span className="text-[10px] text-purple-400">
                              +{task.collaborators.length} collab
                            </span>
                          )}
                      </div>
                    </div>
                  </td>

                  {/* TARGET / TAT (DUE) */}
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {task.due_date ? (
                      <div className="flex items-center gap-1.5">
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            {formatTargetDueDate(task.due_date, task.due_time)}
                          </span>
                        ) : dueToday ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                            <Clock className="h-3 w-3" />
                            {formatTargetDueDate(task.due_date, task.due_time)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300">
                            {formatTargetDueDate(task.due_date, task.due_time)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* SOP (Standard Operating Procedure) */}
                  <td
                    className="whitespace-nowrap px-2 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sopUrl ? (
                      <a
                        href={sopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2 py-1 text-[11px] font-semibold text-cyan-300 shadow-sm transition-all hover:bg-cyan-500/25 hover:text-white"
                        title={`Open SOP: ${sopUrl}`}
                      >
                        <FileText className="h-3 w-3" />
                        <span>SOP</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  {/* Checklist (CL) with Progress Bar */}
                  <td
                    className="relative whitespace-nowrap px-2 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {totalChecklists > 0 ? (
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveChecklistPopoverId(
                              activeChecklistPopoverId === task.id
                                ? null
                                : task.id
                            )
                          }
                          className="inline-flex flex-col items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1.5 transition-all hover:border-emerald-500/40"
                          title="Click to toggle subtasks"
                        >
                          <div className="flex w-16 items-center justify-between gap-1 text-[10px]">
                            <span className="font-mono text-slate-300">
                              {completedChecklists}/{totalChecklists}
                            </span>
                            <span
                              className={`font-semibold ${completedChecklists === totalChecklists ? 'text-emerald-400' : 'text-slate-400'}`}
                            >
                              {checklistPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                              style={{ width: `${checklistPercent}%` }}
                            />
                          </div>
                        </button>

                        {/* Interactive Checklist Popover with Direct Toggling */}
                        {activeChecklistPopoverId === task.id && (
                          <div className="absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 rounded-xl border border-white/15 bg-[#161c31] p-3 text-left shadow-2xl backdrop-blur-md">
                            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="font-semibold text-white">
                                Subtasks ({completedChecklists}/
                                {totalChecklists})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveChecklistPopoverId(null)
                                }
                                className="text-slate-400 hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 text-xs">
                              {checklists.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={(e) =>
                                    handleToggleChecklistItem(
                                      task.id,
                                      c.id,
                                      c.completed,
                                      e
                                    )
                                  }
                                  className="flex w-full items-start gap-2.5 rounded-lg bg-black/30 p-2 text-left transition-colors hover:bg-black/50"
                                >
                                  <span className="mt-0.5 shrink-0">
                                    {c.completed ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <div className="h-3.5 w-3.5 rounded border border-slate-500" />
                                    )}
                                  </span>
                                  <span
                                    className={`leading-tight text-slate-200 ${
                                      c.completed
                                        ? 'text-slate-400 line-through'
                                        : ''
                                    }`}
                                  >
                                    {c.title}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  {/* STATUS PILL */}
                  <td
                    className="relative whitespace-nowrap px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setStatusMenuOpenTaskId(
                          statusMenuOpenTaskId === task.id ? null : task.id
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all hover:brightness-110 ${statusPill.bg} ${statusPill.text} ${statusPill.border}`}
                      title="Click to change status"
                    >
                      <span>{statusName}</span>
                      <ChevronDown className="h-3 w-3 opacity-80" />
                    </button>

                    {/* Quick Status Dropdown Menu */}
                    {statusMenuOpenTaskId === task.id && (
                      <div className="absolute left-0 top-full z-30 mt-1 min-w-[140px] rounded-xl border border-white/15 bg-[#161c31] py-1 shadow-2xl backdrop-blur-md">
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase text-slate-400">
                          Set Status:
                        </div>
                        {availableStatuses.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={(e) => {
                              handleCelebratedStatusUpdate(e, task, st.name);
                              setStatusMenuOpenTaskId(null);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                              task.status_id === st.id
                                ? 'font-semibold text-emerald-400'
                                : 'text-slate-200'
                            }`}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: st.color || '#3b82f6' }}
                            />
                            <span>{st.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* PRIORITY (P) with Inline Quick Dropdown */}
                  <td
                    className="relative whitespace-nowrap px-2 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setPriorityMenuOpenTaskId(
                          priorityMenuOpenTaskId === task.id ? null : task.id
                        )
                      }
                      className="inline-flex items-center justify-center p-1"
                      title={`Priority: ${priorityConfig.label} (Click to change)`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full ring-2 ${priorityConfig.bg} ${priorityConfig.ring}`}
                      />
                    </button>

                    {/* Quick Priority Popover */}
                    {priorityMenuOpenTaskId === task.id && (
                      <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] rounded-xl border border-white/15 bg-[#161c31] py-1 text-left shadow-2xl backdrop-blur-md">
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase text-slate-400">
                          Set Priority:
                        </div>
                        {priorities.map((p) => {
                          const dot =
                            PRIORITY_DOT_COLORS[p.name] ||
                            PRIORITY_DOT_COLORS.Normal;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={(e) =>
                                handleInlinePriorityChange(task.id, p.id, e)
                              }
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${dot.bg}`}
                              />
                              <span>{p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td
                    className="whitespace-nowrap px-3 py-2.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {/* One-Click Status Progression Button (↪) with Sound & FX */}
                      {isAssignee &&
                      (statusName === 'Open' || statusName === 'Todo') ? (
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCelebratedStatusUpdate(e, task, 'Accepted')
                          }
                          disabled={isLoading}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/90 text-white shadow transition-all hover:scale-105 hover:bg-emerald-500 disabled:opacity-50"
                          title="Accept Task"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : isAssignee && statusName === 'Accepted' ? (
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCelebratedStatusUpdate(e, task, 'In Progress')
                          }
                          disabled={isLoading}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/90 text-white shadow transition-all hover:scale-105 hover:bg-blue-500 disabled:opacity-50"
                          title="Start Working"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : isAssignee &&
                        (statusName === 'In Progress' ||
                          statusName === 'Updated') ? (
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCelebratedStatusUpdate(e, task, 'Completed')
                          }
                          disabled={isLoading}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/90 text-white shadow transition-all hover:scale-105 hover:bg-emerald-500 disabled:opacity-50"
                          title="Complete Task"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : statusName === 'Completed' && isAssignor ? (
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCelebratedStatusUpdate(e, task, 'Closed')
                          }
                          disabled={isLoading}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-slate-300 shadow transition-all hover:bg-slate-600 hover:text-white disabled:opacity-50"
                          title="Close Task"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : null}

                      {/* Duplicate Task Button */}
                      {onDuplicateTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateTask(task);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 transition-all hover:bg-amber-500/25"
                          title="Duplicate Task (Clone routine task)"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Inspect / Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(task);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                        title="View / Edit Task Details"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      {/* Delete Task Button (Admin only) */}
                      {canDeleteTasks && onDeleteSingleTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSingleTask(task);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/25"
                          title="Delete Task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
