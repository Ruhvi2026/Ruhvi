import React from 'react';
import { ArchiveX } from 'lucide-react';

export default function RTOMangementPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">RTO Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Track and reconcile Return to Origin shipments.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
        <ArchiveX className="mx-auto mb-4 h-12 w-12 text-slate-700" />
        <h2 className="mb-2 text-lg font-semibold text-white">
          RTO Queue Placeholder
        </h2>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          RTO tracking will sync automatically with shipping couriers to detect
          undelivered packages traveling back to the warehouse.
        </p>
      </div>
    </div>
  );
}
