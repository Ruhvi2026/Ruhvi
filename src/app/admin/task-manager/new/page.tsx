'use client';

import React, { useState, useEffect } from 'react';
import TaskForm from '@/components/tasks/TaskForm';
import { TaskPriority, TaskStatus, TaskType } from '@/components/tasks/types';

export default function NewTaskPage() {
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
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
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <h2 className="text-lg font-semibold text-white">Create New Task</h2>
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
