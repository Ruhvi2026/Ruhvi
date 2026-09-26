'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function TaskManagerPage() {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
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
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d0f1a]">
      <div className="border-b border-white/5 p-4">
        <TaskDashboard />
      </div>
      <div className="flex-1">
        <TaskList onTaskClick={setSelectedTask} />
      </div>
    </div>
  );
}
