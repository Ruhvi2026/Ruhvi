import React from 'react';
import { Package, Truck, Boxes } from 'lucide-react';

export default function OperationsManagementPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Operations Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Stock adjustments, supplier tracking, and warehouse sync.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
        <Boxes className="mx-auto mb-4 h-12 w-12 text-slate-700" />
        <h2 className="mb-2 text-lg font-semibold text-white">
          Operations Center Placeholder
        </h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          This dashboard connects with the internal Operations Portal to give
          you a top-down view of all stock movements and warehouse logs.
        </p>
      </div>
    </div>
  );
}
