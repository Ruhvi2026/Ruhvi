import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function ReturnsManagementPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Returns Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Approve returns and coordinate pickups.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
        <RotateCcw className="mx-auto mb-4 h-12 w-12 text-slate-700" />
        <h2 className="mb-2 text-lg font-semibold text-white">
          Returns Queue Placeholder
        </h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          This UI will pull all return requests that require manual inspection
          or courier pickup approval.
        </p>
      </div>
    </div>
  );
}
