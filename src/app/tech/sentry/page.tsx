'use client';

import React from 'react';
import { Server, AlertTriangle, ExternalLink, Activity } from 'lucide-react';

export default function SentryLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Server className="h-6 w-6 text-rose-500" />
            Sentry Error Logs
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Monitor unhandled exceptions and performance bottlenecks.
          </p>
        </div>
        <a
          href="https://sentry.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-rose-400 transition-colors hover:bg-rose-500/20"
        >
          Open Sentry Dashboard <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-tech-border dark:bg-tech-card">
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Total Issues (24h)
            </p>
            <Activity className="h-4 w-4 text-slate-500 dark:text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">
            —
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            No data available
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-tech-border dark:bg-tech-card">
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Crash-Free Users
            </p>
            <Activity className="h-4 w-4 text-slate-500 dark:text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">
            —
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            No data available
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-tech-border dark:bg-tech-card">
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Unresolved Critical
            </p>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-500">—</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            No data available
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-tech-border dark:bg-tech-card">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-tech-border dark:bg-white/5">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-200">
            Recent Issues
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No recent issues
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            No error events recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
