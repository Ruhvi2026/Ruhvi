'use client';

import React from 'react';
import { Link2 } from 'lucide-react';
import type { TopPage } from '@/types/posthog-analytics';

interface TopPagesTableProps {
  pages: TopPage[];
}

export default function TopPagesTable({ pages }: TopPagesTableProps) {
  const maxViews = Math.max(1, ...pages.map((p) => p.views));
  const hasData = pages.length > 0;

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Link2 className="h-4 w-4 text-violet-500" />
          Top Pages
        </h2>
        <span className="text-xs text-slate-400">Last 30 days</span>
      </div>

      {hasData ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 text-left font-semibold">Path</th>
                <th className="pb-2 text-right font-semibold">Views</th>
                <th className="pb-2 text-right font-semibold">Unique</th>
                <th className="w-24 pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pages.map((page, idx) => (
                <tr key={page.path + idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 pr-4">
                    <span className="font-mono text-slate-700">
                      {page.path}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-800">
                    {page.views.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 text-right text-slate-600">
                    {page.unique.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-400"
                        style={{
                          width: `${(page.views / maxViews) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">
          No page data yet.
        </div>
      )}
    </div>
  );
}
