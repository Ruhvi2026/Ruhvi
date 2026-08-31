import React from 'react';
import { BarChart, Construction } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Deep dive into your marketing metrics.
          </p>
        </div>
      </div>
      <div className="flex h-[50vh] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#131726] text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fuchsia-500/10">
          <Construction className="h-8 w-8 text-fuchsia-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-xs text-slate-400">
          The Analytics module is currently under development. Stay tuned!
        </p>
      </div>
    </div>
  );
}
