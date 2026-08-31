'use client';

import React from 'react';
import {
  Activity,
  ExternalLink,
  Globe,
  Users,
  MousePointer,
  Zap,
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-2xl font-bold text-slate-100">
            <Activity className="h-6 w-6 text-blue-400" />
            Analytics & Performance
          </h1>
          <p className="mt-1 text-slate-400">
            Unified view of PostHog events and Vercel Speed Insights.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="https://posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-orange-400 transition-colors hover:bg-orange-500/20"
          >
            PostHog <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href="https://vercel.com/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-300 transition-colors hover:bg-white/10"
          >
            Vercel <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vercel Speed Insights */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Zap className="h-5 w-5 text-yellow-400" />
              Core Web Vitals
            </h2>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
              Score: 98
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-400">
                  Largest Contentful Paint (LCP)
                </span>
                <span className="font-medium text-emerald-400">1.2s</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: '85%' }}
                ></div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-400">First Input Delay (FID)</span>
                <span className="font-medium text-emerald-400">12ms</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: '95%' }}
                ></div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-400">
                  Cumulative Layout Shift (CLS)
                </span>
                <span className="font-medium text-emerald-400">0.01</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: '98%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* PostHog Analytics */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Users className="h-5 w-5 text-orange-400" />
              User Engagement
            </h2>
            <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
              Past 7 days
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Users className="h-4 w-4" />
                Unique Users
              </div>
              <p className="text-2xl font-bold text-slate-200">12.4k</p>
              <p className="mt-1 text-xs text-emerald-400">+14.2%</p>
            </div>
            <div className="rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Globe className="h-4 w-4" />
                Pageviews
              </div>
              <p className="text-2xl font-bold text-slate-200">48.2k</p>
              <p className="mt-1 text-xs text-emerald-400">+8.1%</p>
            </div>
            <div className="rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Activity className="h-4 w-4" />
                Bounce Rate
              </div>
              <p className="text-2xl font-bold text-slate-200">42.3%</p>
              <p className="mt-1 text-xs text-rose-400">+2.1%</p>
            </div>
            <div className="rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <MousePointer className="h-4 w-4" />
                Conversion
              </div>
              <p className="text-2xl font-bold text-slate-200">3.8%</p>
              <p className="mt-1 text-xs text-emerald-400">+0.4%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
