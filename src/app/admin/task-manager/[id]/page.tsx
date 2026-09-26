'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TaskDetail from '@/components/tasks/TaskDetail';
import TaskForm from '@/components/tasks/TaskForm';
import {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@/components/tasks/types';

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/task-manager/tasks/${id}`)
        .then((r) => r.json())
        .then((d) => setTask(d.task || null)),
      fetch('/api/task-manager/priorities')
        .then((r) => r.json())
        .then((d) => setPriorities(d.priorities || [])),
      fetch('/api/task-manager/statuses')
        .then((r) => r.json())
        .then((d) => setStatuses(d.statuses || [])),
      fetch('/api/task-manager/types')
        .then((r) => r.json())
        .then((d) => setTypes(d.types || [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <h3 className="mb-1 text-lg font-medium text-white">Task not found</h3>
        <p className="mb-4 text-slate-500">
          The task you're looking for doesn't exist or you don't have access.
        </p>
        <button
          onClick={() => router.push('/admin/task-manager')}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex h-full flex-col bg-[#0d0f1a]">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-lg font-semibold text-white">Edit Task</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TaskForm
            task={task}
            initialPriorities={priorities}
            initialStatuses={statuses}
            initialTypes={types}
          />
        </div>
      </div>
    );
  }

  return (
    <TaskDetail
      task={task}
      onBack={() => router.push('/admin/task-manager')}
      onEdit={() => setEditing(true)}
    />
  );
}
