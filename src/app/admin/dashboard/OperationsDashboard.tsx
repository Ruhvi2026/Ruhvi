import React from 'react';
import { Layers, AlertCircle, ArchiveX } from 'lucide-react';

export default function OperationsDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Stock Items
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">8,405</p>
          <p className="mt-1 text-xs text-emerald-400">
            Healthy levels across 80% SKUs
          </p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Low Stock Alerts
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-400">12 SKUs</p>
          <p className="mt-1 text-xs text-slate-500">
            Requires immediate replenishment
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-3">
            <ArchiveX className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Dead Stock (90+ Days)
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">45 SKUs</p>
          <p className="mt-1 text-xs text-slate-500">
            Zero movement in last quarter
          </p>
        </div>
      </div>
    </div>
  );
}
