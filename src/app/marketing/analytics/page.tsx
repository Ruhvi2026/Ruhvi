'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Loader2,
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Marketing Analytics</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Deep dive into your marketing metrics and store performance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-medium text-slate-400">
                  Total Visitors
                </h3>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {data?.metrics?.totalVisitors.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-400">
                +12.5% vs last week
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
                {data?.metrics?.conversionRate}%
              </p>
              <p className="mt-1 text-xs text-emerald-400">
                +0.8% vs last week
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-fuchsia-400" />
                <h3 className="text-sm font-medium text-slate-400">AOV</h3>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                ₹{data?.metrics?.avgOrderValue.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-rose-400">-₹120 vs last week</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-medium text-slate-400">Revenue</h3>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                ₹{data?.metrics?.revenue.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-400">+24% vs last week</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="col-span-2 rounded-xl border border-white/5 bg-[#131726] p-6">
              <h3 className="mb-4 text-sm font-medium text-white">
                Sales vs Marketing Spend (Last 7 Days)
              </h3>
              <div className="flex h-64 items-end justify-between gap-2 border-b border-l border-white/10 px-2 pb-2 pt-10">
                {data?.chartData.map((day: any) => {
                  const maxSales = Math.max(
                    ...data.chartData.map((d: any) => d.sales)
                  );
                  const salesHeight = (day.sales / maxSales) * 100;
                  const spendHeight = (day.spend / maxSales) * 100;
                  return (
                    <div
                      key={day.date}
                      className="group relative flex w-full flex-col items-center justify-end gap-1"
                    >
                      <div className="flex w-full justify-center gap-1">
                        <div
                          style={{ height: `${salesHeight}%` }}
                          className="w-1/3 min-w-[8px] rounded-t-sm bg-fuchsia-500 transition-all hover:opacity-80"
                          title={`Sales: ₹${day.sales}`}
                        />
                        <div
                          style={{ height: `${spendHeight}%` }}
                          className="w-1/3 min-w-[8px] rounded-t-sm bg-blue-500 transition-all hover:opacity-80"
                          title={`Spend: ₹${day.spend}`}
                        />
                      </div>
                      <span className="mt-2 text-[10px] text-slate-400">
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-fuchsia-500" />
                  <span className="text-xs text-slate-400">Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-slate-400">Ad Spend</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
              <h3 className="mb-4 text-sm font-medium text-white">
                Traffic Sources
              </h3>
              <div className="space-y-4">
                {data?.sources.map((source: any, i: number) => (
                  <div key={source.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-300">{source.name}</span>
                      <span className="font-medium text-white">
                        {source.value}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${i === 0 ? 'bg-fuchsia-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${source.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
