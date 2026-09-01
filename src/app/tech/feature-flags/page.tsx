'use client';

import React from 'react';
import { ToggleLeft, Filter, Plus } from 'lucide-react';

export default function FeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-900 dark:text-white">
            <ToggleLeft className="h-6 w-6 text-tech-primary" />
            Feature Flags
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600">
            Safely roll out new features and manage A/B tests.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-tech-primary/20 bg-tech-primary/10 px-4 py-2 font-medium text-tech-primary transition-colors hover:bg-tech-primary/20">
          <Plus className="h-4 w-4" /> Create Flag
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-tech-border dark:bg-tech-card">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4 dark:border-tech-border dark:bg-gray-50 dark:bg-white/5">
          <div className="flex gap-2">
            <button className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm dark:border-transparent dark:bg-white dark:bg-white/10 dark:text-slate-200 dark:text-slate-900 dark:shadow-none">
              All Flags
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:text-slate-600 dark:hover:text-slate-300 dark:hover:text-slate-900">
              Production
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:text-slate-600 dark:hover:text-slate-300 dark:hover:text-slate-900">
              Staging
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400 dark:text-slate-600 dark:hover:text-slate-900">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <ToggleLeft className="mb-3 h-10 w-10 text-slate-600 opacity-40 dark:text-slate-400 dark:text-slate-500" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-600">
            No feature flags configured.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Create a flag to start rolling out features safely.
          </p>
        </div>
      </div>
    </div>
  );
}
