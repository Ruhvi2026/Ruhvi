'use client';

import React, { Suspense, useState, useEffect } from 'react';
import TaskDashboard from '@/components/tasks/TaskDashboard';
import TaskList from '@/components/tasks/TaskList';
import {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@/components/tasks/types';
import TaskDetail from '@/components/tasks/TaskDetail';
import TaskForm from '@/components/tasks/TaskForm';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
  </div>
);

export default function TaskManagerPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname ? pathname.split('?')[0] : '/admin/task-manager';
  const isCreatingNew = searchParams.get('action') === 'new';

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [activeFilterParams, setActiveFilterParams] = useState<
    Record<string, unknown>
  >({});
  const [activeFilterLabel, setActiveFilterLabel] = useState<string>('');

  const handleFilterSelect = (
    key: string,
    params: Record<string, unknown>,
    label: string
  ) => {
    if (activeFilterKey === key || !key) {
      setActiveFilterKey(null);
      setActiveFilterParams({});
      setActiveFilterLabel('');
    } else {
      setActiveFilterKey(key);
      setActiveFilterParams(params);
      setActiveFilterLabel(label);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/task-manager/reference')
      .then((r) => {
        if (!r.ok)
          throw new Error(`Failed to load reference data: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setPriorities(d.priorities || []);
        setStatuses(d.statuses || []);
        setTypes(d.types || []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(
          '[TaskManagerPageContent] Failed to load reference data:',
          err
        );
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-[#0d0f1a]">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col bg-[#0d0f1a]">
        <div className="flex-1 items-center justify-center">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-rose-400">
              Failed to load reference data: {error}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ensure the database migration has been run (task_priorities,
              task_statuses, task_types tables seeded).
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isCreatingNew) {
    return (
      <div className="flex h-full flex-col bg-[#0d0f1a]">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-lg font-semibold text-white">Create New Task</h2>
          <button
            onClick={() => router.push(basePath)}
            className="text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TaskForm
            initialPriorities={priorities}
            initialStatuses={statuses}
            initialTypes={types}
          />
        </div>
      </div>
    );
  }

  if (selectedTask && editing) {
    return (
      <div className="flex h-full flex-col bg-[#0d0f1a]">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-lg font-semibold text-white">Edit Task</h2>
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TaskForm
            task={selectedTask}
            initialPriorities={priorities}
            initialStatuses={statuses}
            initialTypes={types}
          />
        </div>
      </div>
    );
  }

  if (selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onEdit={() => setEditing(true)}
        statuses={statuses}
        onRefresh={async () => {
          try {
            const res = await fetch(
              `/api/task-manager/tasks/${selectedTask.id}`
            );
            if (res.ok) {
              const data = await res.json();
              setSelectedTask(data.task);
            }
          } catch (err) {
            console.error('Failed to refresh task:', err);
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      <div className="border-b border-white/5 p-4">
        <Suspense fallback={<LoadingSpinner />}>
          <TaskDashboard
            activeFilterKey={activeFilterKey}
            onFilterSelect={handleFilterSelect}
          />
        </Suspense>
      </div>
      <div className="flex-1">
        <Suspense fallback={<LoadingSpinner />}>
          <TaskList
            onTaskClick={setSelectedTask}
            externalFilters={activeFilterParams}
            activeFilterLabel={activeFilterLabel}
            onClearFilter={() => handleFilterSelect('', {}, '')}
          />
        </Suspense>
      </div>
    </div>
  );
}
