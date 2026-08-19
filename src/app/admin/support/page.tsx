import React from 'react';
import { Headphones, CheckCircle2 } from 'lucide-react';

export default function SupportManagementPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Support Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Ticket assignments, resolution tracking, and support QA.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
        <Headphones className="mx-auto mb-4 h-12 w-12 text-slate-700" />
        <h2 className="mb-2 text-lg font-semibold text-white">
          Support Center Placeholder
        </h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          This section will host the full ticketing interface allowing you to
          re-assign complaints, review chat logs, and monitor agent performance.
        </p>
      </div>
    </div>
  );
}
