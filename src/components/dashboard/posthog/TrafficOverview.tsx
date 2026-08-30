'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Eye, Users, MousePointerClick } from 'lucide-react';
import type { DailyTrafficPoint } from '@/types/posthog-analytics';

interface TrafficOverviewProps {
  data: DailyTrafficPoint[];
  totalPageviews: number;
  totalUniqueVisitors: number;
}

const formatNumber = (val: number) =>
  new Intl.NumberFormat('en-IN').format(val);

export default function TrafficOverview({
  data,
  totalPageviews,
  totalUniqueVisitors,
}: TrafficOverviewProps) {
  const viewsPerVisit =
    totalUniqueVisitors > 0
      ? (totalPageviews / totalUniqueVisitors).toFixed(1)
      : '—';

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">
          Traffic Overview
        </h2>
        <span className="text-xs text-slate-400">Powered by PostHog</span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            <Eye className="h-3 w-3" /> Page Views
          </p>
          <h3 className="text-xl font-bold text-slate-800">
            {formatNumber(totalPageviews)}
          </h3>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3 w-3" /> Unique Visitors
          </p>
          <h3 className="text-xl font-bold text-slate-800">
            {formatNumber(totalUniqueVisitors)}
          </h3>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            <MousePointerClick className="h-3 w-3" /> Views / Visit
          </p>
          <h3 className="text-xl font-bold text-slate-800">{viewsPerVisit}</h3>
        </div>
      </div>

      <div className="h-[250px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9B5DE5" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#9B5DE5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ fontSize: '12px', color: '#64748b' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="views"
                name="Page Views"
                stroke="#9B5DE5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Unique Visitors"
                stroke="#22D3EE"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVisitors)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No traffic data available. (Configure PostHog API Key)
          </div>
        )}
      </div>
    </div>
  );
}
