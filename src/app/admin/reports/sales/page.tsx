'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, IndianRupee, ShoppingBag, Users, Calendar, Download } from 'lucide-react';

const REVENUE_TIMELINE = [
  { date: 'Jul 25', revenue: 45000, orders: 3 },
  { date: 'Jul 26', revenue: 62000, orders: 4 },
  { date: 'Jul 27', revenue: 89000, orders: 6 },
  { date: 'Jul 28', revenue: 54000, orders: 4 },
  { date: 'Jul 29', revenue: 112000, orders: 8 },
  { date: 'Jul 30', revenue: 98000, orders: 7 },
  { date: 'Jul 31', revenue: 125000, orders: 9 },
];

const TOP_CATEGORIES = [
  { name: 'Diamond Rings', sales: '₹2,45,000', count: 18, percentage: '42%' },
  { name: 'Gold Earrings', sales: '₹1,85,000', count: 24, percentage: '31%' },
  { name: 'Kundan Necklaces', sales: '₹1,15,000', count: 6, percentage: '19%' },
  { name: 'Gold Bangles', sales: '₹45,000', count: 4, percentage: '8%' },
];

export default function SalesReportPage() {
  const totalRevenue = REVENUE_TIMELINE.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = REVENUE_TIMELINE.reduce((acc, curr) => acc + curr.orders, 0);
  const avgOrderValue = Math.round(totalRevenue / (totalOrders || 1));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Sales & Revenue Analytics</h1>
            <p className="text-xs text-stone-500 mt-1">Real-time performance and sales reports</p>
          </div>
        </div>

        <button 
          onClick={() => alert('Exporting Sales Report to CSV...')}
          className="inline-flex items-center justify-center space-x-2 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <IndianRupee className="w-5 h-5 text-amber-900" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <div className="flex items-center text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> +18.4% vs last week
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-5 h-5 text-indigo-700" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">{totalOrders}</p>
          <div className="flex items-center text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> +12.0% vs last week
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Order Value (AOV)</span>
            <Users className="w-5 h-5 text-rose-700" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">₹{avgOrderValue.toLocaleString('en-IN')}</p>
          <div className="text-xs text-stone-400">High-intent purchases</div>
        </div>
      </div>

      {/* Sales Trend Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
        <h2 className="font-serif text-lg font-bold text-stone-900">Daily Revenue Breakdown</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Orders Placed</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {REVENUE_TIMELINE.map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-stone-800">{item.date}</td>
                  <td className="py-3 px-4 text-stone-600">{item.orders} orders</td>
                  <td className="py-3 px-4 font-bold text-stone-900">₹{item.revenue.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-stone-600">₹{Math.round(item.revenue / item.orders).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
        <h2 className="font-serif text-lg font-bold text-stone-900">Top Category Performance</h2>

        <div className="space-y-4">
          {TOP_CATEGORIES.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-stone-800">{cat.name} ({cat.count} sold)</span>
                <span className="font-bold text-stone-900">{cat.sales}</span>
              </div>
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-900 h-full rounded-full" style={{ width: cat.percentage }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
