'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Star, Maximize } from 'lucide-react';

interface DashboardChartsProps {
  salesChartData: { date: string; Revenue: number; Orders: number }[];
  totalRevenue: number;
  totalOrders: number;
  topProductsData: { name: string; value: number }[];
  earningsByCategoryData: { name: string; value: number }[];
  recentReviews: {
    customer_name: string;
    rating: number;
    review_text: string;
    created_at: string;
  }[];
  todayRevenue?: number;
  cancelledOrders?: number;
  cancelledRevenue?: number;
  posthogPageviewsData?: { date: string; views: number }[];
}

const COLORS = ['#5DE2A3', '#5E9CF6', '#F38181', '#FCE38A', '#9B5DE5'];

export default function DashboardCharts({
  salesChartData,
  totalRevenue,
  totalOrders,
  topProductsData,
  earningsByCategoryData,
  recentReviews,
  todayRevenue = 0,
  cancelledOrders = 0,
  cancelledRevenue = 0,
  posthogPageviewsData = [],
}: DashboardChartsProps) {
  // Real metrics derived from fetched order data
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cancellationRate =
    totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
  const orderSuccessRate = totalOrders > 0 ? 100 - cancellationRate : 0;

  // Formatting utils
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-IN').format(val);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT COLUMN: Main Chart + Bottom Row (Earnings & Mini Stats) */}
      <div className="space-y-6 lg:col-span-2">
        {/* Sales Analytics Chart */}
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Sales Analytics
            </h2>
            <div className="flex items-center gap-3">
              <select className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none">
                <option>This Month</option>
                <option>Last Month</option>
              </select>
              <button className="text-slate-400 hover:text-slate-600">
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div>
              <p className="mb-1 text-xs text-slate-500">Revenue</p>
              <h3 className="text-xl font-bold text-slate-800">
                {formatCurrency(totalRevenue)}
              </h3>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Orders</p>
              <h3 className="text-xl font-bold text-slate-800">
                {formatNumber(totalOrders)}
              </h3>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Avg Order Value</p>
              <h3 className="text-xl font-bold text-slate-800">
                {formatCurrency(avgOrderValue)}
              </h3>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesChartData}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#5DE2A3" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#5DE2A3" stopOpacity={0} />
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
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ fontSize: '12px', color: '#64748b' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#5DE2A3"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No sales data this month.
              </div>
            )}
          </div>
        </div>

        {/* Web Analytics Chart (PostHog) */}
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Web Analytics (Page Views)
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Powered by PostHog</span>
              <button className="text-slate-400 hover:text-slate-600">
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {posthogPageviewsData && posthogPageviewsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={posthogPageviewsData}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9B5DE5" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#9B5DE5" stopOpacity={0} />
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
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ fontSize: '12px', color: '#64748b' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#9B5DE5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No web analytics data available. (Configure PostHog API Key)
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Earnings Pie & Mini Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Earnings By Item Type */}
          <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-base font-semibold text-slate-800">
              Earnings By Item Type
            </h2>
            <div className="flex h-[200px] w-full items-center justify-center">
              {earningsByCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={earningsByCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {earningsByCategoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any) => formatCurrency(Number(value))}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-slate-400">No earnings data.</div>
              )}
            </div>
          </div>

          {/* Mini Stats (Today's Revenue & Cancellation Rate) */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="flex h-full items-center justify-between rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {formatCurrency(todayRevenue)}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  TODAY&apos;S REVENUE
                </p>
              </div>
            </div>
            <div className="flex h-full items-center justify-between rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {cancellationRate.toFixed(1)}%
                </h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  CANCELLATION RATE
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs text-slate-500">Cancelled Orders</p>
                <h4 className="text-lg font-bold text-slate-800">
                  {formatNumber(cancelledOrders)}
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Top Products, Order Success Rate, Reviews */}
      <div className="space-y-6">
        {/* Top 5 Products */}
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-base font-semibold text-slate-800">
            Top 5 Products
          </h2>
          <div className="flex h-[220px] w-full items-center justify-center">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {topProductsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: '11px', lineHeight: '24px' }}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No sales data.</div>
            )}
          </div>
        </div>

        {/* Order Success Rate */}
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-base font-semibold text-slate-800">
            Order Success Rate
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative h-28 w-28 flex-shrink-0">
              <svg className="h-full w-full -rotate-90 transform">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#5DE2A3"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="301.59"
                  strokeDashoffset={301.59 * (1 - orderSuccessRate / 100)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-800">
                  {orderSuccessRate.toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-500">This month</span>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <p className="mb-1 text-xs text-slate-500">Orders</p>
                <h4 className="text-lg font-bold text-slate-800">
                  {formatNumber(totalOrders)}
                </h4>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">Revenue Cancelled</p>
                <h4 className="text-lg font-bold text-slate-800">
                  {formatCurrency(cancelledRevenue)}
                </h4>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Recent Reviews
            </h2>
            <select className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none">
              <option>Sort By Newest</option>
            </select>
          </div>

          <div className="custom-scrollbar max-h-[300px] space-y-4 overflow-y-auto pr-2">
            {recentReviews.length > 0 ? (
              recentReviews.map((review, idx) => (
                <div
                  key={idx}
                  className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex text-orange-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-current' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">
                    By{' '}
                    <strong className="text-slate-700">
                      {review.customer_name || 'Anonymous'}
                    </strong>{' '}
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                    "{review.review_text}"
                  </p>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-sm text-slate-400">
                No reviews yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
