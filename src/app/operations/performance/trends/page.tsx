'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [view, setView] = useState<'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, created_at, status')
        .order('created_at', { ascending: false });

      const { data: rtoRecords } = await supabase
        .from('rto_records')
        .select('recorded_at');

      if (!orders || orders.length === 0) {
        setLoading(false);
        return;
      }

      // Group by month-year
      const monthMap = new Map<
        string,
        { orders: number; revenue: number; rto: number }
      >();
      const enrichMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      const enrichQuarter = (dateStr: string) => {
        const d = new Date(dateStr);
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${q}`;
      };

      orders.forEach((o: any) => {
        const key =
          view === 'monthly'
            ? enrichMonth(o.created_at)
            : enrichQuarter(o.created_at);
        if (!monthMap.has(key)) {
          monthMap.set(key, { orders: 0, revenue: 0, rto: 0 });
        }
        const entry = monthMap.get(key)!;
        entry.orders++;
        entry.revenue += Number(o.total) || 0;
      });

      rtoRecords.forEach((r: any) => {
        const key =
          view === 'monthly'
            ? enrichMonth(r.recorded_at)
            : enrichQuarter(r.recorded_at);
        if (monthMap.has(key)) {
          monthMap.get(key)!.rto++;
        }
      });

      const rows = Array.from(monthMap.entries())
        .map(([period, d]) => ({
          period,
          orders: d.orders,
          revenue: d.revenue,
          rto: d.rto,
          rtoRate: d.orders > 0 ? Math.round((d.rto / d.orders) * 100) : 0,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      setMonthlyData(rows);
      setLoading(false);
    };

    fetchData();
  }, [view]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/performance"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Trend Analysis</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monthly and quarterly order, revenue, and RTO trends.
          </p>
        </div>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-1">
        <button
          onClick={() => setView('monthly')}
          className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
            view === 'monthly'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setView('quarterly')}
          className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
            view === 'quarterly'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Quarterly
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" />
          Loading trends...
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#151520] p-16 text-center">
          <BarChart3 className="mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-300">
            Insufficient data
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Trend analysis will populate once order history accumulates.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Revenue (₹)
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">RTOs</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    RTO Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {monthlyData.map((r) => (
                  <tr
                    key={r.period}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {r.period}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {r.orders}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      ₹{r.revenue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {r.rto}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${r.rtoRate > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
                      >
                        {r.rtoRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
