'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/admin/marketing/analytics');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          toast.error('Failed to load analytics data');
        }
      } catch (e) {
        toast.error('Network error loading analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
        <p className="text-sm text-slate-400">
          Fetching live data from PostHog...
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Marketing Analytics</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Live marketing and conversion metrics (Last 30 Days).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Visitors
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.kpis?.totalVisitors?.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Conversion Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.kpis?.conversionRate || 0}%
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Add to Cart Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.kpis?.addToCartRate || 0}%
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-fuchsia-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Checkout Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.kpis?.checkoutRate || 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Traffic Trends */}
        <div className="col-span-2 rounded-xl border border-white/5 bg-[#131726] p-6">
          <h3 className="mb-4 text-sm font-medium text-white">
            Daily Traffic Trend
          </h3>
          <div className="flex h-64 items-end justify-between gap-1 border-b border-l border-white/10 px-2 pb-2 pt-10">
            {data.traffic?.slice(-14).map((day: any, i: number) => {
              const maxViews = Math.max(
                ...data.traffic.map((d: any) => Math.max(d.views, d.visitors)),
                1
              );
              const viewHeight = (day.views / maxViews) * 100;
              const visitorHeight = (day.visitors / maxViews) * 100;
              const dateObj = new Date(day.date);
              const label = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;

              return (
                <div
                  key={day.date}
                  className="group relative flex w-full flex-col items-center justify-end gap-1"
                >
                  <div className="flex w-full justify-center gap-0.5">
                    <div
                      style={{ height: `${viewHeight}%` }}
                      className="w-1/2 min-w-[4px] max-w-[12px] rounded-t-sm bg-blue-500/80 transition-all hover:bg-blue-400"
                      title={`Views: ${day.views}`}
                    />
                    <div
                      style={{ height: `${visitorHeight}%` }}
                      className="w-1/2 min-w-[4px] max-w-[12px] rounded-t-sm bg-fuchsia-500/80 transition-all hover:bg-fuchsia-400"
                      title={`Unique Visitors: ${day.visitors}`}
                    />
                  </div>
                  <span className="mt-2 hidden text-[8px] text-slate-500 md:block">
                    {i % 2 === 0 ? label : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500/80" />
              <span className="text-xs text-slate-400">Pageviews</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-fuchsia-500/80" />
              <span className="text-xs text-slate-400">Unique Visitors</span>
            </div>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
          <h3 className="mb-4 text-sm font-medium text-white">
            Traffic Sources
          </h3>
          {data.sources?.length > 0 ? (
            <div className="space-y-4">
              {data.sources.map((source: any, i: number) => {
                const maxCount = Math.max(
                  ...data.sources.map((s: any) => s.count),
                  1
                );
                const pct = Math.round((source.count / maxCount) * 100);
                return (
                  <div key={source.source}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate pr-2 text-slate-300">
                        {source.source}
                      </span>
                      <span className="font-medium text-white">
                        {source.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${i === 0 ? 'bg-fuchsia-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-slate-500">
              No source data available.
            </div>
          )}
        </div>
      </div>

      {/* Purchase Funnel */}
      <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
        <h3 className="mb-6 text-sm font-medium text-white">
          E-Commerce Funnel & Cart Abandonment
        </h3>
        {data.funnel?.length > 0 ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {data.funnel.map((step: any, i: number) => {
              const prevStep = i > 0 ? data.funnel[i - 1] : null;
              const dropoff =
                prevStep && prevStep.count > 0
                  ? Math.round(
                      ((prevStep.count - step.count) / prevStep.count) * 100
                    )
                  : 0;

              return (
                <React.Fragment key={step.step}>
                  <div className="relative flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {step.step}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {step.count}
                    </p>

                    {i === 0 ? (
                      <p className="mt-1 text-xs text-blue-400">
                        100% (Baseline)
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-400">
                        {step.conversion}% of total
                      </p>
                    )}
                  </div>

                  {i < data.funnel.length - 1 && (
                    <div className="flex flex-col items-center justify-center">
                      <ArrowRight className="hidden h-5 w-5 text-slate-600 md:block" />
                      {dropoff > 0 && (
                        <span className="mt-1 text-[10px] font-medium text-rose-500">
                          -{dropoff}% drop
                        </span>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-xs text-slate-500">
            Not enough funnel events tracked yet.
          </div>
        )}
      </div>
    </div>
  );
}
