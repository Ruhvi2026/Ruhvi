'use client';

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Star, MoreVertical, TrendingUp, TrendingDown, Maximize } from 'lucide-react';

interface DashboardChartsProps {
  salesChartData: { date: string; Revenue: number; Orders: number }[];
  totalRevenue: number;
  totalOrders: number;
  topProductsData: { name: string; value: number }[];
  earningsByCategoryData: { name: string; value: number }[];
  recentReviews: { customer_name: string; rating: number; review_text: string; created_at: string }[];
}

const COLORS = ['#5DE2A3', '#5E9CF6', '#F38181', '#FCE38A', '#9B5DE5'];

export default function DashboardCharts({
  salesChartData,
  totalRevenue,
  totalOrders,
  topProductsData,
  earningsByCategoryData,
  recentReviews
}: DashboardChartsProps) {
  
  // Dummy traffic/conversion data since we don't have a tracker yet
  const totalTraffic = 324222;
  const cartAbandonment = 73;
  const revenueLeft = 12432;
  const visits = 15678;
  const bounceRate = 46.41;

  // Formatting utils
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-IN').format(val);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Main Chart + Bottom Row (Earnings & Mini Stats) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Sales Analytics Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-800">Sales Analytics</h2>
            <div className="flex items-center gap-3">
              <select className="text-xs border border-slate-200 rounded px-2 py-1 outline-none text-slate-600 bg-white">
                <option>This Month</option>
                <option>Last Month</option>
              </select>
              <button className="text-slate-400 hover:text-slate-600"><Maximize className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Traffic</p>
              <h3 className="text-xl font-bold text-slate-800">{formatNumber(totalTraffic)}</h3>
              <p className="text-xs text-emerald-500 flex items-center mt-1 font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +15%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Orders</p>
              <h3 className="text-xl font-bold text-slate-800">{formatNumber(totalOrders)}</h3>
              <p className="text-xs text-emerald-500 flex items-center mt-1 font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +4%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Revenue</p>
              <h3 className="text-xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</h3>
              <p className="text-xs text-red-500 flex items-center mt-1 font-medium"><TrendingDown className="w-3 h-3 mr-1" /> -5%</p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5DE2A3" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#5DE2A3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ fontSize: '12px', color: '#64748b' }}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#5DE2A3" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No sales data this month.</div>
            )}
          </div>
        </div>

        {/* Bottom Row: Earnings Pie & Mini Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings By Item Type */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-6">Earnings By Item Type</h2>
            <div className="h-[200px] w-full flex items-center justify-center">
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm">No earnings data.</div>
              )}
            </div>
          </div>

          {/* Mini Stats (Visits & Bounce Rate) */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 flex items-center justify-between h-full">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{formatNumber(visits)}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wide mt-1 flex items-center">
                  VISITS <TrendingDown className="w-3 h-3 text-red-500 ml-1" />
                </p>
              </div>
              <div className="w-24 h-12">
                {/* Simulated sparkline */}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[{v:10}, {v:30}, {v:20}, {v:40}, {v:35}, {v:60}]}>
                    <Area type="monotone" dataKey="v" stroke="#FCE38A" fill="#FCE38A" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 flex items-center justify-between h-full">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{bounceRate}%</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wide mt-1 flex items-center">
                  BOUNCE RATE <TrendingUp className="w-3 h-3 text-emerald-500 ml-1" />
                </p>
              </div>
              <div className="w-24 h-16 flex items-end gap-1">
                {/* Simulated bar sparkline */}
                {[20, 40, 60, 30, 50, 70].map((h, i) => (
                  <div key={i} className="w-3 bg-blue-300 rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Top Products, Conversion Rate, Reviews */}
      <div className="space-y-6">
        
        {/* Top 5 Products */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-6">Top 5 Products</h2>
          <div className="h-[220px] w-full flex items-center justify-center">
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend iconType="square" wrapperStyle={{ fontSize: '11px', lineHeight: '24px' }} layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No sales data.</div>
            )}
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-6">Conversion Rate</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#5DE2A3" strokeWidth="12" fill="none" strokeDasharray="301.59" strokeDashoffset={301.59 * (1 - 0.33)} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-800">33%</span>
                <span className="text-[10px] text-emerald-500 font-bold flex items-center"><TrendingUp className="w-3 h-3" /> +33%</span>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Cart Abandonment</p>
                <h4 className="text-lg font-bold text-slate-800">{cartAbandonment}%</h4>
                <p className="text-[10px] text-emerald-500 flex items-center mt-0.5 font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +15%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Revenue Left</p>
                <h4 className="text-lg font-bold text-slate-800">{formatCurrency(revenueLeft)}</h4>
                <p className="text-[10px] text-emerald-500 flex items-center mt-0.5 font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +4%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-800">Recent Reviews</h2>
            <select className="text-xs border border-slate-200 rounded px-2 py-1 outline-none text-slate-600 bg-white">
              <option>Sort By Newest</option>
            </select>
          </div>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {recentReviews.length > 0 ? (
              recentReviews.map((review, idx) => (
                <div key={idx} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex text-orange-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    By <strong className="text-slate-700">{review.customer_name || 'Anonymous'}</strong> {new Date(review.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    "{review.review_text}"
                  </p>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-sm text-center py-4">No reviews yet.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
