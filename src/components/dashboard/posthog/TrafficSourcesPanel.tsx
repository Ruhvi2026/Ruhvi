'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import type { TrafficSource } from '@/types/posthog-analytics';

interface TrafficSourcesPanelProps {
  sources: TrafficSource[];
}

export default function TrafficSourcesPanel({
  sources,
}: TrafficSourcesPanelProps) {
  const max = Math.max(1, ...sources.map((s) => s.count));
  const hasData = sources.length > 0;

  return (
    <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
        <Globe className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Traffic Sources</h3>
      </div>

      {hasData ? (
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.source} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="line-clamp-1 font-medium text-slate-200">
                  {s.source}
                </span>
                <span className="font-semibold text-slate-400">
                  {s.count.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500/80 transition-all duration-500"
                  style={{ width: `${(s.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-xs text-slate-500">
          No traffic source data yet.
        </div>
      )}
    </div>
  );
}
