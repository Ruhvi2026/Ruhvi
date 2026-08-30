'use client';

import React from 'react';
import { PackageSearch } from 'lucide-react';
import type { ProductPerformance } from '@/types/posthog-analytics';

interface ProductPerformanceTableProps {
  products: ProductPerformance[];
}

export default function ProductPerformanceTable({
  products,
}: ProductPerformanceTableProps) {
  const hasData = products.length > 0;

  return (
    <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
        <PackageSearch className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">
          Product View → Cart Conversion
        </h3>
      </div>

      {hasData ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 text-left font-semibold">Product</th>
                <th className="pb-2 text-right font-semibold">Views</th>
                <th className="pb-2 text-right font-semibold">Added</th>
                <th className="w-32 pb-2" />
                <th className="pb-2 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((p) => (
                <tr key={p.product_id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4">
                    <span className="line-clamp-1 font-medium text-slate-200">
                      {p.name}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-400">
                    {p.viewed.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 text-right text-slate-400">
                    {p.added_to_cart.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, p.view_to_cart_pct)}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-bold text-violet-300">
                    {p.view_to_cart_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-xs text-slate-500">
          No product event data yet.
        </div>
      )}
    </div>
  );
}
