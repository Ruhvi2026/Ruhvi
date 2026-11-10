'use client';

import React, { useState } from 'react';
import {
  X,
  ClipboardList,
  Loader2,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { EmailMessage } from '@/types/mailbox';

interface MailboxConvertTaskModalProps {
  message: EmailMessage;
  onClose: () => void;
  onSuccess: (taskIdText: string) => void;
}

export function MailboxConvertTaskModal({
  message,
  onClose,
  onSuccess,
}: MailboxConvertTaskModalProps) {
  const [title, setTitle] = useState(
    `[Email] ${message.subject || 'Inquiry from ' + (message.from.name || message.from.email)}`
  );
  const [description, setDescription] = useState(
    `Source Email:\nFrom: ${message.from.name ? `${message.from.name} <${message.from.email}>` : message.from.email}\nDate: ${new Date(message.date).toLocaleString('en-IN')}\nSubject: ${message.subject}\n\nMessage Snippet:\n${message.bodyText || message.snippet || '(No text available)'}`
  );
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/task-manager/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      const taskIdText = data.task?.task_id_text || data.task?.id || 'Created';
      onSuccess(taskIdText);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#161D31] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1A223B] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                Convert Email to Task
              </h4>
              <p className="text-[10px] text-slate-400">
                Turn this message into an action item in Task Manager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3 p-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-[11px] text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-300">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0D111E] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-300">
              Description / Notes
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0D111E] px-3 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-300">
              Target Due Date (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0D111E] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Task...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
