'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Clock,
  Flag,
  Paperclip,
  MessageSquare,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Package,
  Ticket,
  Box,
  Plus,
  GitBranch,
} from 'lucide-react';
import {
  Task,
  TaskComment,
  TaskActivity,
  TaskAttachment,
  TaskChecklist,
  TaskSpectator,
  TaskAssignment,
  TaskDependencyItem,
} from './types';

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
  onEdit: () => void;
  /** Re-fetch the task without leaving the detail view */
  onRefresh?: () => void;
}

export default function TaskDetail({
  task,
  onBack,
  onEdit,
  onRefresh,
}: TaskDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [isProgressUpdate, setIsProgressUpdate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [checklistBusy, setChecklistBusy] = useState(false);
  const [dependencies, setDependencies] = useState<TaskDependencyItem[]>([]);
  const [depVersion, setDepVersion] = useState(0);
  const [depBusy, setDepBusy] = useState(false);

  const priorityColors: Record<string, string> = {
    Low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    Normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Important: 'bg-red-500/20 text-red-400 border-red-500/30',
    Immediate: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
  };

  const statusColors: Record<string, string> = {
    Open: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
    Completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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

  const getSlaStatus = () => {
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/task-manager/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          is_progress_update: isProgressUpdate,
        }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      setNewComment('');
      setIsProgressUpdate(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(
        `/api/task-manager/upload?id=${attachmentId}&task_id=${task.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete attachment');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  const handleCreateMessengerGroup = async () => {
    if (isCreatingGroup) return;
    setIsCreatingGroup(true);
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${task.id}/messenger-group`,
        {
          method: 'POST',
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create group');
      }
      // Group created, refresh task to get the new messenger_group_id
      onRefresh?.();
    } catch (err) {
      console.error('Failed to create messenger group:', err);
      alert('Error: ' + (err as Error).message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Dependencies (loaded separately so a failure never breaks the detail view)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/task-manager/tasks/${task.id}/dependencies`)
      .then((r) => (r.ok ? r.json() : { dependencies: [] }))
      .then((d) => {
        if (!cancelled) setDependencies(d.dependencies || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [task.id, depVersion]);

  const handleToggleChecklist = async (item: TaskChecklist) => {
    if (checklistBusy) return;
    setChecklistBusy(true);
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${task.id}/checklists?checklist_id=${item.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !item.completed }),
        }
      );
      if (!res.ok) throw new Error('Failed to update checklist item');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update checklist item:', err);
    } finally {
      setChecklistBusy(false);
    }
  };

  const handleAddChecklist = async () => {
    const title = newChecklistTitle.trim();
    if (!title || checklistBusy) return;
    setChecklistBusy(true);
    try {
      const res = await fetch(`/api/task-manager/tasks/${task.id}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to add checklist item');
      setNewChecklistTitle('');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    } finally {
      setChecklistBusy(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (checklistBusy) return;
    setChecklistBusy(true);
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${task.id}/checklists?checklist_id=${checklistId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete checklist item');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    } finally {
      setChecklistBusy(false);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', task.id);
      const res = await fetch('/api/task-manager/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload attachment');
      }
      onRefresh?.();
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      alert('Upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (depBusy) return;
    setDepBusy(true);
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${task.id}/dependencies?dependency_id=${dependencyId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to remove dependency');
      setDepVersion((v) => v + 1);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to remove dependency:', err);
    } finally {
      setDepBusy(false);
    }
  };

  const slaStatus = getSlaStatus();
  const checklistItems = task.checklists || [];
  const checklistDone = checklistItems.filter((c) => c.completed).length;
  const checklistPct = checklistItems.length
    ? Math.round((checklistDone / checklistItems.length) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {task.task_id_text}
              </span>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                  priorityColors[task.priority_name?.name || 'Normal'] ||
                  priorityColors.Normal
                }`}
              >
                {typeof task.priority_name?.name === 'string'
                  ? task.priority_name.name
                  : 'Normal'}
              </span>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                  statusColors[task.status_name?.name || 'Open'] ||
                  statusColors.Open
                }`}
              >
                {typeof task.status_name?.name === 'string'
                  ? task.status_name.name
                  : 'Open'}
              </span>
              {typeof task.type_name?.name === 'string' && (
                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                  {task.type_name.name}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {task.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.messenger_group_id ? (
            <Link
              href={`/admin/chat?c=${task.messenger_group_id}`}
              className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-3 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-600/30"
            >
              <MessageSquare className="h-4 w-4" /> Open Task Group
            </Link>
          ) : (
            <button
              onClick={handleCreateMessengerGroup}
              disabled={isCreatingGroup}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              <MessageSquare className="h-4 w-4" />
              {isCreatingGroup ? 'Creating...' : 'Create Task Group'}
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 px-4">
        {[
          { id: 'details', label: 'Details', icon: null },
          { id: 'comments', label: 'Comments', icon: MessageSquare },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'attachments', label: 'Attachments', icon: Paperclip },
          { id: 'spectators', label: 'Spectators', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-emerald-500 text-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Description */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-sm font-semibold text-white">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-300">
                {task.description}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-medium text-slate-500">
                  Created By
                </span>
                <p className="mt-1 text-sm font-medium text-white">
                  {task.creator?.full_name || 'Unknown'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-medium text-slate-500">
                  Assigned To
                </span>
                <p className="mt-1 text-sm font-medium text-white">
                  {task.assignee?.full_name || 'Unassigned'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-medium text-slate-500">
                  Department
                </span>
                <p className="mt-1 text-sm font-medium text-white">
                  {task.department_name || '-'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-medium text-slate-500">
                  Due Date
                </span>
                <p className={`mt-1 text-sm font-medium ${slaStatus.class}`}>
                  {task.due_date
                    ? `${formatDate(task.due_date)} (${slaStatus.label})`
                    : 'No due date'}
                </p>
              </div>
            </div>

            {/* Related Entities */}
            {(task.related_order_id ||
              task.related_product_id ||
              task.related_ticket_id) && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Related Entities
                </h3>
                <div className="flex flex-wrap gap-3">
                  {task.related_order_id && task.order && (
                    <Link
                      href={`/admin/orders/${task.order.id}`}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:text-white"
                    >
                      <Package className="h-4 w-4" /> Order:{' '}
                      {task.order.order_number}
                    </Link>
                  )}
                  {task.related_product_id && task.product && (
                    <Link
                      href={`/admin/products/${task.product.id}`}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:text-white"
                    >
                      <Box className="h-4 w-4" /> {task.product.name}
                    </Link>
                  )}
                  {task.related_ticket_id && task.ticket && (
                    <Link
                      href={`/admin/support/${task.ticket.id}`}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:text-white"
                    >
                      <Ticket className="h-4 w-4" /> Ticket:{' '}
                      {task.ticket.ticket_number}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Checklist */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Checklist</h3>
                {checklistItems.length > 0 && (
                  <span className="text-xs font-medium text-emerald-400">
                    {checklistDone}/{checklistItems.length} complete (
                    {checklistPct}%)
                  </span>
                )}
              </div>

              {checklistItems.length > 0 && (
                <>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {checklistItems.map((item: TaskChecklist) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(item)}
                          disabled={checklistBusy}
                          aria-label="Toggle checklist item"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            item.completed
                              ? 'border-emerald-500 bg-emerald-500/20'
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          {item.completed && (
                            <CheckCircle className="h-3 w-3 text-emerald-400" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            item.completed
                              ? 'text-slate-500 line-through'
                              : 'text-slate-300'
                          }`}
                        >
                          {item.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklist(item.id)}
                          disabled={checklistBusy}
                          title="Remove subtask"
                          className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklist();
                    }
                  }}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Add a subtask..."
                />
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  disabled={!newChecklistTitle.trim() || checklistBusy}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Dependencies
                  </h3>
                </div>
                <div className="space-y-2">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                          dep.status === 'ready'
                            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                            : dep.status === 'blocked'
                              ? 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                              : 'border-amber-500/30 bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {dep.status === 'ready'
                          ? 'Ready'
                          : dep.status === 'blocked'
                            ? 'Blocked'
                            : 'Waiting'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {dep.task?.task_id_text || 'TASK'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                        {dep.task?.title || 'Unknown task'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dep.id)}
                        disabled={depBusy}
                        title="Remove dependency"
                        className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Add Comment
              </h3>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Write a comment or progress update..."
              />
              <label className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isProgressUpdate}
                  onChange={(e) => setIsProgressUpdate(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-400">
                  Mark as progress update
                </span>
              </label>
              <button
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Comment'}
              </button>
            </div>

            <div className="space-y-3">
              {(task.comments || []).map((comment: TaskComment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {comment.user?.full_name || 'Unknown'}
                    </span>
                    {comment.is_progress_update && (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        Progress Update
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatDateTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {comment.content}
                  </p>
                </div>
              ))}
              {(task.comments || []).length === 0 && (
                <p className="text-center text-sm text-slate-500">
                  No comments yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {(task.activity || []).map((activity: TaskActivity) => (
              <div
                key={activity.id}
                className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-400">
                  {activity.user?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {activity.user?.full_name || 'System'} {activity.action}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {(task.activity || []).length === 0 && (
              <p className="text-center text-sm text-slate-500">
                No activity yet
              </p>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-3">
            {/* Upload (uses the existing Messenger Secondary Cloudinary route) */}
            <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-4 text-center">
              <input
                type="file"
                id="task-attachment-upload"
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAttachment(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById('task-attachment-upload')?.click()
                }
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Attachment'}
              </button>
              <p className="mt-2 text-[11px] text-slate-500">
                Images, video, PDF and documents up to 20 MB
              </p>
            </div>

            {(task.attachments || []).map((attachment: TaskAttachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <Paperclip className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {attachment.mime_type} •{' '}
                      {attachment.file_size
                        ? `${(attachment.file_size / 1024).toFixed(1)} KB`
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={attachment.cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-2 text-slate-400 hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="rounded p-2 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {(task.attachments || []).length === 0 && (
              <p className="text-center text-sm text-slate-500">
                No attachments
              </p>
            )}
          </div>
        )}

        {activeTab === 'spectators' && (
          <div className="space-y-3">
            {(task.spectators || []).map((spectator: TaskSpectator) => (
              <div
                key={spectator.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-400">
                  {spectator.spectator?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {spectator.spectator?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Added {formatDateTime(spectator.added_at)}
                  </p>
                </div>
              </div>
            ))}
            {(task.spectators || []).length === 0 && (
              <p className="text-center text-sm text-slate-500">
                No spectators
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
