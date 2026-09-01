'use client';

import React from 'react';
import { ToggleLeft, Filter, Plus } from 'lucide-react';

export default function FeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <ToggleLeft className="h-6 w-6 text-emerald-400" />
            Feature Flags
          </h1>
          <p className="mt-1 text-slate-400">
            Safely roll out new features and manage A/B tests.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20">
          <Plus className="h-4 w-4" /> Create Flag
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-4">
          <div className="flex gap-2">
            <button className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-slate-200">
              All Flags
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300">
              Production
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300">
              Staging
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <ToggleLeft className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm font-medium text-slate-400">
            No feature flags configured.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Create a flag to start rolling out features safely.
          </p>
        </div>
      </div>
    </div>
  );
}
