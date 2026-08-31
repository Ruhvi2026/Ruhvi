'use client';

import React from 'react';
import { Server, AlertTriangle, ExternalLink, Activity } from 'lucide-react';

export default function SentryLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-2xl font-bold text-slate-100">
            <Server className="h-6 w-6 text-rose-500" />
            Sentry Error Logs
          </h1>
          <p className="mt-1 text-slate-400">
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
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm text-slate-400">Total Issues (24h)</p>
            <Activity className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-200">24</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
            <AlertTriangle className="h-3 w-3" /> +12% from yesterday
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm text-slate-400">Crash-Free Users</p>
            <Activity className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-200">99.8%</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            Above 99.5% target
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm text-slate-400">Unresolved Critical</p>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-500">3</p>
          <p className="mt-1 text-xs text-slate-400">
            Requires immediate attention
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-6 py-4">
          <h2 className="text-lg font-medium text-slate-200">Recent Issues</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {[
            {
              id: '1',
              error:
                'TypeError: Cannot read properties of undefined (reading map)',
              file: 'app/products/page.tsx',
              time: '10 mins ago',
              level: 'error',
            },
            {
              id: '2',
              error: 'NetworkError: Failed to fetch API',
              file: 'lib/api/client.ts',
              time: '1 hour ago',
              level: 'warning',
            },
            {
              id: '3',
              error: 'Unhandled Rejection: Supabase connection timeout',
              file: 'middleware.ts',
              time: '2 hours ago',
              level: 'error',
            },
          ].map((issue, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-800/50"
            >
              <div
                className={`mt-1 rounded-full p-1.5 ${issue.level === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium text-slate-200">
                  {issue.error}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono">
                    {issue.file}
                  </span>
                  <span>{issue.time}</span>
                </div>
              </div>
              <button className="rounded bg-cyan-950/30 px-3 py-1.5 text-sm text-cyan-400 transition-colors hover:bg-cyan-900/50 hover:text-cyan-300">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
