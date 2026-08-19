'use client';

import React from 'react';
import { Package, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function OperationsDashboard() {
  const { profile } = useAuth();
  const userName = profile?.full_name?.split(' ')[0] || 'User';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back, {userName}. Here is your operations overview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl transition-all hover:border-indigo-500/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">
                Total Products
              </p>
              <p className="mt-1 text-2xl font-bold text-white">1,248</p>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl transition-all hover:border-indigo-500/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">
                Low Stock Alerts
              </p>
              <p className="mt-1 text-2xl font-bold text-white">14</p>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl transition-all hover:border-indigo-500/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">
                Pending Transfers
              </p>
              <p className="mt-1 text-2xl font-bold text-white">3</p>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl transition-all hover:border-indigo-500/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">
                Active Categories
              </p>
              <p className="mt-1 text-2xl font-bold text-white">24</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-white">Recent Activity</h2>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-slate-500">
            Activity feed will load here
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-white">
            Inventory Alerts
          </h2>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-slate-500">
            Low stock items will load here
          </div>
        </div>
      </div>
    </div>
  );
}
