import React from 'react';
import { Package, Truck, ArchiveX, RotateCcw } from 'lucide-react';

export default function OrdersDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Orders Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Overview of today's fulfillment queue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Pending Orders
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">45</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting packing</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Ready to Ship
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">12</p>
          <p className="mt-1 text-xs text-slate-500">Manifest generated</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Open Returns</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">3</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting inspection</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <ArchiveX className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-medium text-slate-400">Active RTOs</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">1</p>
          <p className="mt-1 text-xs text-slate-500">
            In transit back to origin
          </p>
        </div>
      </div>
    </div>
  );
}
