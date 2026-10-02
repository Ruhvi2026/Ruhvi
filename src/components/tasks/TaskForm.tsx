'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Clock,
  Flag,
  Users,
  Package,
  ListChecks,
  GitBranch,
  Calendar,
  Bell,
  CheckCircle2,
  Box,
  Ticket,
  Search,
  Eye,
} from 'lucide-react';
import RelatedEntityModal from './RelatedEntityModal';
import {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskUser,
  TaskListResponse,
  TaskDependencyItem,
} from './types';

interface TaskFormProps {
  task?: Task | null;
  initialPriorities?: TaskPriority[];
  initialStatuses?: TaskStatus[];
  initialTypes?: TaskType[];
}

export default function TaskForm({
  task,
  initialPriorities = [],
  initialStatuses = [],
  initialTypes = [],
}: TaskFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname ? pathname.split('?')[0] : '/admin/task-manager';
  const isEdit = !!task;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    department_id: '',
    priority_id: '',
    status_id: '',
    spectator_id: '',
    due_date: '',
    due_time: '',
    start_time: '',
    expected_duration: '',
    related_order_id: '',
    related_product_id: '',
    related_ticket_id: '',
    tags: '',
    schedule_type: 'none',
    schedule_time: '09:00',
    schedule_days: ['saturday'],
    schedule_day_of_month: 1,
    remind_overdue: true,
  });

  const [inspectModal, setInspectModal] = useState<{
    isOpen: boolean;
    type: 'order' | 'product' | 'ticket' | null;
    idOrCode: string | null;
  }>({
    isOpen: false,
    type: null,
    idOrCode: null,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loadingRelatedList, setLoadingRelatedList] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState<
    { id: string | null; title: string }[]
  >([]);
  const [removedChecklistIds, setRemovedChecklistIds] = useState<string[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [dependencies, setDependencies] = useState<TaskDependencyItem[]>([]);
  const [depCandidates, setDepCandidates] = useState<Task[]>([]);
  const [newDepId, setNewDepId] = useState('');
  const [depError, setDepError] = useState('');
  const [depSaving, setDepSaving] = useState(false);
  const [staffList, setStaffList] = useState<TaskUser[]>([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [assignmentType, setAssignmentType] = useState<
    'individual' | 'department'
  >('individual');

  useEffect(() => {
    if (task) {
      const initialSpectatorId =
        task.spectators && task.spectators.length > 0
          ? task.spectators[0].user_id || task.spectators[0].spectator?.id || ''
          : '';

      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignee_id: task.assignee_id || '',
        department_id: task.department_id || '',
        priority_id: task.priority_id || '',
        status_id: task.status_id || '',
        spectator_id: initialSpectatorId,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        due_time: task.due_time || '',
        start_time: task.start_time ? task.start_time.split('T')[0] : '',
        expected_duration: task.expected_duration || '',
        related_order_id: task.related_order_id || '',
        related_product_id: task.related_product_id || '',
        related_ticket_id: task.related_ticket_id || '',
        tags: (task.tags || []).join(', '),
        schedule_type: 'none',
        schedule_time: '09:00',
        schedule_days: ['saturday'],
        schedule_day_of_month: 1,
        remind_overdue: true,
      });
      if (task.department_id && !task.assignee_id) {
        setAssignmentType('department');
      }
      setChecklistDraft(
        (task.checklists || []).map((c) => ({ id: c.id, title: c.title }))
      );
      setRemovedChecklistIds([]);
    }
  }, [task]);

  // Load recent related entities on demand
  useEffect(() => {
    if (showRelated && recentOrders.length === 0 && !loadingRelatedList) {
      setLoadingRelatedList(true);
      Promise.all([
        fetch('/api/task-manager/related-entities?type=order')
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/task-manager/related-entities?type=product')
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/task-manager/related-entities?type=ticket')
          .then((r) => r.json())
          .catch(() => ({})),
      ])
        .then(([ord, prd, tkt]) => {
          if (ord.success && ord.list) setRecentOrders(ord.list);
          if (prd.success && prd.list) setRecentProducts(prd.list);
          if (tkt.success && tkt.list) setRecentTickets(tkt.list);
        })
        .finally(() => setLoadingRelatedList(false));
    }
  }, [showRelated, recentOrders.length, loadingRelatedList]);

  const handleIndividualSelect = (assigneeId: string) => {
    const staff = staffList.find((s) => s.id === assigneeId);
    setFormData((prev) => ({
      ...prev,
      assignee_id: assigneeId,
      department_id:
        staff?.department_id || (assigneeId ? prev.department_id : ''),
    }));
  };

  const handleDepartmentSelect = (deptId: string) => {
    let manager = staffList.find(
      (s) => s.department_id === deptId && s.role?.toLowerCase() === 'manager'
    );
    if (!manager) {
      manager = staffList.find(
        (s) =>
          s.department_id === deptId &&
          ['admin', 'super_admin'].includes(s.role?.toLowerCase() || '')
      );
    }
    if (!manager) {
      manager = staffList.find((s) => s.department_id === deptId);
    }

    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      assignee_id: manager ? manager.id : '',
    }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch('/api/task-manager/staff')
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setStaffList(d.staff || []);
        }),
      fetch('/api/task-manager/departments')
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setDepartments(d.departments || []);
        }),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Advanced Options (edit mode): load dependencies + candidate tasks
  useEffect(() => {
    if (!task) return;
    let cancelled = false;

    fetch(`/api/task-manager/tasks/${task.id}/dependencies`)
      .then((r) => (r.ok ? r.json() : { dependencies: [] }))
      .then((d) => {
        if (!cancelled) setDependencies(d.dependencies || []);
      })
      .catch(() => {});

    fetch('/api/task-manager/tasks?limit=100')
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d: TaskListResponse) => {
        if (!cancelled) {
          setDepCandidates(
            (d.tasks || []).filter((t: Task) => t.id !== task.id)
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [task]);

  const addChecklistItem = () => {
    const title = newChecklistTitle.trim();
    if (!title) return;
    setChecklistDraft((prev) => [...prev, { id: null, title }]);
    setNewChecklistTitle('');
  };

  const removeChecklistItem = (index: number) => {
    const item = checklistDraft[index];
    if (item?.id) {
      setRemovedChecklistIds((ids) =>
        ids.includes(item.id as string) ? ids : [...ids, item.id as string]
      );
    }
    setChecklistDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const addDependency = async () => {
    if (!task || !newDepId || depSaving) return;
    setDepSaving(true);
    setDepError('');
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${task.id}/dependencies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depends_on_task_id: newDepId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setDepError(data.error || 'Failed to add dependency');
        return;
      }
      setDependencies(data.dependencies || []);
      setNewDepId('');
    } catch {
      setDepError('Network error occurred');
    } finally {
      setDepSaving(false);
    }
  };

  const removeDependency = async (dependencyId: string) => {
    if (!task || depSaving) return;
    setDepSaving(true);
    setDepError('');
    try {
      const res = await fetch(
        `/api/task-manager/tasks/${task.id}/dependencies?dependency_id=${dependencyId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        setDepError(data.error || 'Failed to remove dependency');
        return;
      }
      setDependencies(data.dependencies || []);
    } catch {
      setDepError('Network error occurred');
    } finally {
      setDepSaving(false);
    }
  };

  // Persist the Advanced Options checklist once the task itself exists
  const syncChecklist = async (taskId: string) => {
    try {
      for (const item of checklistDraft) {
        if (item.id || !item.title.trim()) continue;
        const res = await fetch(
          `/api/task-manager/tasks/${taskId}/checklists`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: item.title.trim() }),
          }
        );
        if (!res.ok) {
          console.error('[TaskForm] Failed to add checklist item:', item.title);
        }
      }
      for (const checklistId of removedChecklistIds) {
        const res = await fetch(
          `/api/task-manager/tasks/${taskId}/checklists?checklist_id=${checklistId}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          console.error(
            '[TaskForm] Failed to delete checklist item:',
            checklistId
          );
        }
      }
    } catch (err) {
      // Task data is already saved; checklist items stay manageable on the detail page
      console.error('[TaskForm] Checklist sync failed:', err);
    }
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim())
      newErrors.description = 'Description is required';
    if (!formData.assignee_id && !formData.department_id) {
      newErrors.assignee_id = 'Assignment (Assignee or Department) is required';
    }
    if (formData.due_date && isNaN(Date.parse(formData.due_date)))
      newErrors.due_date = 'Invalid due date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/task-manager/tasks/${task!.id}`
        : '/api/task-manager/tasks';
      const method = isEdit ? 'PUT' : 'POST';

      const body: Record<string, any> = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      // Clean up empty strings to null
      Object.keys(body).forEach((key) => {
        if (body[key] === '') body[key] = null;
      });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        console.log('[TaskForm] Task saved successfully:', responseData);
        // Persist optional Advanced Options (checklist) once the task exists
        if (checklistDraft.length > 0 || removedChecklistIds.length > 0) {
          let savedTaskId: string | undefined = task?.id;
          if (!isEdit) {
            savedTaskId = responseData?.task?.id;
          }
          if (savedTaskId) {
            await syncChecklist(savedTaskId);
          }
        }
        router.push(basePath);
        router.refresh();
      } else {
        // A non-JSON body (e.g. a framework-level 404/405) must not be
        // reported as a network failure.
        const errorMessage =
          responseData?.error ||
          `Failed to save task (request failed with status ${response.status})`;
        console.error('[TaskForm] Save failed:', errorMessage, responseData);
        setErrors({
          submit: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Network error occurred';
      console.error('[TaskForm] Network error:', err);
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-[#0d0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/task-manager')}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showAdvanced
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            Advanced Options
          </button>

          <button
            type="button"
            onClick={() => setShowRelated(!showRelated)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showRelated
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" />
            Related
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {errors.submit && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
            {errors.submit}
          </div>
        )}

        {/* Basic Fields */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Title */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.title ? 'border-rose-500/50' : 'border-white/10'
              }`}
              placeholder="Enter task title..."
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.description ? 'border-rose-500/50' : 'border-white/10'
              }`}
              placeholder="Describe the task..."
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-400">{errors.description}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              <Flag className="mr-1 inline h-3 w-3" /> Priority
            </label>
            <select
              value={formData.priority_id}
              onChange={(e) => handleChange('priority_id', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Priority</option>
              {initialPriorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Status
            </label>
            <select
              value={formData.status_id}
              onChange={(e) => handleChange('status_id', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Status</option>
              {initialStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="h-4 w-4 text-emerald-400" /> Assignment Mode{' '}
                <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs font-normal text-slate-400">
                Assign directly to individual staff or to a department manager
              </span>
            </div>
            {errors.assignee_id && (
              <p className="mb-3 text-xs font-medium text-rose-400">
                {errors.assignee_id}
              </p>
            )}

            {/* Toggle Tabs */}
            <div className="mb-4 flex rounded-lg border border-white/5 bg-black/30 p-1">
              <button
                type="button"
                onClick={() => setAssignmentType('individual')}
                className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${
                  assignmentType === 'individual'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Individual Staff Member
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentType('department');
                  if (formData.department_id) {
                    handleDepartmentSelect(formData.department_id);
                  }
                }}
                className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${
                  assignmentType === 'department'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Department (Manager Assignment)
              </button>
            </div>

            {assignmentType === 'individual' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Assignee (Direct Staff){' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.assignee_id}
                    onChange={(e) => handleIndividualSelect(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Assignee</option>
                    {staffList.map((u) => {
                      const dept = departments.find(
                        (d) => d.id === u.department_id
                      );
                      return (
                        <option key={u.id} value={u.id}>
                          {u.full_name} {dept ? `[Dept: ${dept.name}]` : ''}{' '}
                          {u.role ? `(${u.role})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Auto-Fetched Department
                  </label>
                  <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-emerald-400">
                    {(() => {
                      const selectedStaff = staffList.find(
                        (s) => s.id === formData.assignee_id
                      );
                      const dept = departments.find(
                        (d) =>
                          d.id ===
                          (selectedStaff?.department_id ||
                            formData.department_id)
                      );
                      return dept
                        ? dept.name
                        : selectedStaff
                          ? 'No department set for staff'
                          : 'Unassigned';
                    })()}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Department is automatically fetched from staff profile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Target Department <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => handleDepartmentSelect(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Assigned Manager
                  </label>
                  <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-emerald-400">
                    {(() => {
                      const mgr = staffList.find(
                        (s) => s.id === formData.assignee_id
                      );
                      return mgr
                        ? `${mgr.full_name} (${mgr.role || 'Manager'})`
                        : formData.department_id
                          ? 'Department Manager (Auto-assigned)'
                          : 'Select a department above';
                    })()}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Assigned to department manager who can reassign to team
                    members.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Suspector / Inspector (Progress Monitor) */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Eye className="h-4 w-4 text-cyan-400" /> Suspector / Inspector
                (Progress Monitor)
              </label>
              <span className="text-xs font-normal text-slate-400">
                Any staff member who monitors task progress
              </span>
            </div>
            <select
              value={formData.spectator_id}
              onChange={(e) => handleChange('spectator_id', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">None (No Suspector/Inspector)</option>
              {staffList.map((u) => {
                const dept = departments.find((d) => d.id === u.department_id);
                return (
                  <option key={u.id} value={u.id}>
                    {u.full_name} {dept ? `[Dept: ${dept.name}]` : ''}{' '}
                    {u.role ? `(${u.role})` : ''}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              The assigned suspector/inspector can monitor task progress,
              activity, and updates.
            </p>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              <Clock className="mr-1 inline h-3 w-3" /> Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.due_date && (
              <p className="mt-1 text-xs text-rose-400">{errors.due_date}</p>
            )}
          </div>

          {/* Due Time */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Due Time
            </label>
            <input
              type="time"
              value={formData.due_time}
              onChange={(e) => handleChange('due_time', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_time}
              onChange={(e) => handleChange('start_time', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Expected Duration */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Expected Duration
            </label>
            <input
              type="text"
              value={formData.expected_duration}
              onChange={(e) =>
                handleChange('expected_duration', e.target.value)
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., 4 hours, 1 day, 1 week"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Default: Normal=4h, Medium=24h, Large=48h
            </p>
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Advanced Options
              </h3>
              <p className="text-xs text-slate-400">
                Tags, subtasks, and dependencies for this task.
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="tag1, tag2, tag3"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Separate tags with commas
              </p>
            </div>

            {/* Subtasks / Checklist */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-medium text-white">
                  Subtasks / Checklist
                </h4>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                Break this task into steps. Completion progress is shown on the
                task detail page.
              </p>

              {checklistDraft.length > 0 && (
                <div className="mb-3 space-y-2">
                  {checklistDraft.map((item, index) => (
                    <div
                      key={`${item.id ?? 'new'}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/20" />
                      <span className="flex-1 text-sm text-slate-300">
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        title="Remove subtask"
                        className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Verify product information"
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  disabled={!newChecklistTitle.trim()}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            {/* Dependencies */}
            {isEdit ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-amber-400" />
                  <h4 className="text-sm font-medium text-white">
                    Dependencies
                  </h4>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  This task waits on other tasks. When a dependency is completed
                  it automatically becomes{' '}
                  <span className="text-emerald-400">Ready</span>.
                </p>

                {depError && (
                  <p className="mb-2 text-xs text-rose-400">{depError}</p>
                )}

                {dependencies.length > 0 && (
                  <div className="mb-3 space-y-2">
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
                          onClick={() => removeDependency(dep.id)}
                          title="Remove dependency"
                          className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={newDepId}
                    onChange={(e) => setNewDepId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select a task this depends on...</option>
                    {depCandidates
                      .filter(
                        (t) =>
                          t.id !== task?.id &&
                          !dependencies.some(
                            (d) => d.depends_on_task_id === t.id
                          )
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.task_id_text ? `${t.task_id_text} — ` : ''}
                          {t.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={addDependency}
                    disabled={!newDepId || depSaving}
                    className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />{' '}
                    {depSaving ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Dependencies can be added after creation — open the task, click
                Edit, then use Advanced Options.
              </p>
            )}
          </div>
        )}

        {/* Related Context */}
        {showRelated && (
          <div className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Package className="h-4 w-4 text-emerald-400" />
                Related Entities
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Link this task to an Order, Product, or Support Ticket. Staff
                can inspect full details with one click.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Related Order */}
              <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Related Order
                  </label>
                  {formData.related_order_id && (
                    <button
                      type="button"
                      onClick={() =>
                        setInspectModal({
                          isOpen: true,
                          type: 'order',
                          idOrCode: formData.related_order_id,
                        })
                      }
                      className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/30"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.related_order_id}
                  onChange={(e) =>
                    handleChange('related_order_id', e.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Order ID or Number (e.g. ORD-1042)"
                />
                {recentOrders.length > 0 && (
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-400">
                      Recent Orders:
                    </label>
                    <select
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-300"
                      onChange={(e) => {
                        if (e.target.value)
                          handleChange('related_order_id', e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="">Select recent order...</option>
                      {recentOrders.map((o) => (
                        <option key={o.id} value={o.order_number || o.id}>
                          {o.order_number} — ₹{o.total} ({o.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Related Product */}
              <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Related Product
                  </label>
                  {formData.related_product_id && (
                    <button
                      type="button"
                      onClick={() =>
                        setInspectModal({
                          isOpen: true,
                          type: 'product',
                          idOrCode: formData.related_product_id,
                        })
                      }
                      className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/30"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.related_product_id}
                  onChange={(e) =>
                    handleChange('related_product_id', e.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Product ID, SKU or Slug"
                />
                {recentProducts.length > 0 && (
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-400">
                      Recent Products:
                    </label>
                    <select
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-300"
                      onChange={(e) => {
                        if (e.target.value)
                          handleChange('related_product_id', e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="">Select recent product...</option>
                      {recentProducts.map((p) => (
                        <option key={p.id} value={p.sku || p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Related Support Ticket */}
              <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Related Support Ticket
                  </label>
                  {formData.related_ticket_id && (
                    <button
                      type="button"
                      onClick={() =>
                        setInspectModal({
                          isOpen: true,
                          type: 'ticket',
                          idOrCode: formData.related_ticket_id,
                        })
                      }
                      className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/30"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.related_ticket_id}
                  onChange={(e) =>
                    handleChange('related_ticket_id', e.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ticket ID or Ticket #"
                />
                {recentTickets.length > 0 && (
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-400">
                      Recent Tickets:
                    </label>
                    <select
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-300"
                      onChange={(e) => {
                        if (e.target.value)
                          handleChange('related_ticket_id', e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="">Select recent ticket...</option>
                      {recentTickets.map((t) => (
                        <option key={t.id} value={t.ticket_number || t.id}>
                          {t.ticket_number} — {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Accessibility Action Bar (Duplicate of Top Right Options) */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-white/10 bg-[#0d0f1a]/95 px-4 py-3.5 backdrop-blur-md sm:px-6">
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          {showAdvanced && (
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <Clock className="h-3 w-3" /> Advanced Options Open
            </span>
          )}
          {showRelated && (
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <Package className="h-3 w-3" /> Related Context Open
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Duplicate Advanced Options button */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showAdvanced
                ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                : 'border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Advanced Options</span>
          </button>

          {/* Duplicate Related button */}
          <button
            type="button"
            onClick={() => setShowRelated(!showRelated)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showRelated
                ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                : 'border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Related</span>
          </button>

          {/* Duplicate Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500 disabled:opacity-50 sm:px-5"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isEdit ? 'Update Task' : 'Create Task'}</span>
          </button>
        </div>
      </div>

      {/* Related Entity Inspection Modal */}
      <RelatedEntityModal
        isOpen={inspectModal.isOpen}
        onClose={() =>
          setInspectModal({ isOpen: false, type: null, idOrCode: null })
        }
        type={inspectModal.type}
        idOrCode={inspectModal.idOrCode}
      />
    </form>
  );
}
