import React from 'react';
import { Package, Truck, AlertTriangle, RotateCcw } from 'lucide-react';

export default function OrdersDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Order Volume
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">1,248</p>
          <p className="mt-1 text-xs text-slate-500">This month</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Shipping Success Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">98.2%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">RTO Rate</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">1.8%</p>
          <p className="mt-1 text-xs text-slate-500">Return to Origin</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-medium text-slate-400">Error Rate</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">0.5%</p>
          <p className="mt-1 text-xs text-slate-500">Failed fulfillments</p>
        </div>
      </div>
    </div>
  );
}
