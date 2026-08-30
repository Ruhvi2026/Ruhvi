'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import type { FunnelStep } from '@/types/posthog-analytics';

interface FunnelStripProps {
  funnel: FunnelStep[];
}

export default function FunnelStrip({ funnel }: FunnelStripProps) {
  const hasData = funnel.length > 0 && funnel[0].count > 0;

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Filter className="h-4 w-4 text-violet-500" />
          Purchase Funnel
        </h2>
        <span className="text-xs text-slate-400">Last 30 days</span>
      </div>

      {hasData ? (
        <div className="space-y-4">
          {funnel.map((step, idx) => {
            const widthPct = idx === 0 ? 100 : step.conversion;
            return (
              <div key={step.step} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {step.step}
                  </span>
                  <span className="text-slate-500">
                    <strong className="text-slate-800">
                      {step.count.toLocaleString('en-IN')}
                    </strong>{' '}
                    {idx > 0 && (
                      <span className="text-violet-600">
                        · {step.conversion}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === funnel.length - 1
                        ? 'bg-cyan-400'
                        : idx === 0
                          ? 'bg-violet-500'
                          : 'bg-violet-300'
                    }`}
                    style={{ width: `${Math.max(2, widthPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">
          No funnel data yet — events will appear once customers convert.
        </div>
      )}
    </div>
  );
}
