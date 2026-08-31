'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  getInventoryThresholds,
  InventoryThresholds,
  DEFAULT_INVENTORY_THRESHOLDS,
} from '@/lib/inventory';

export default function CostVariancePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<InventoryThresholds>(
    DEFAULT_INVENTORY_THRESHOLDS
  );

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const config = await getInventoryThresholds(supabase);
      setThresholds(config);

      const { data: costs } = await supabase
        .from('product_supplier_costs')
        .select(
          `id, cost_price, effective_date, notes,
           product:products!inner(id, name, sku),
           supplier:suppliers!left(id, name)`
        )
        .order('effective_date', { ascending: true });

      // Group by product, order by date; flag when latest > prev * (1 + pct/100)
      const byProduct = new Map<string, any[]>();
      (costs || []).forEach((c: any) => {
        const pid = c.product?.id;
        if (!byProduct.has(pid)) byProduct.set(pid, []);
        byProduct.get(pid)!.push(c);
      });

      const computed: any[] = [];
      byProduct.forEach((entries) => {
        const sorted = [...entries].sort(
          (a, b) =>
            new Date(a.effective_date).getTime() -
            new Date(b.effective_date).getTime()
        );
        for (let i = 0; i < sorted.length; i++) {
          const cur = sorted[i];
          const prev = i > 0 ? sorted[i - 1] : null;
          const prevCost = prev?.cost_price ?? null;
          let variancePct: number | null = null;
          let flagged = false;
          if (prevCost !== null && prevCost > 0) {
            variancePct =
              Math.round(((cur.cost_price - prevCost) / prevCost) * 100 * 10) /
              10;
            flagged = variancePct > (config.cost_variance_flag_pct ?? 10);
          }
          computed.push({ ...cur, variance_pct: variancePct, flagged });
        }
      });

      setRows(computed);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => Number(b.flagged) - Number(a.flagged)),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/dashboard"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Cost Variance</h1>
          <p className="mt-1 text-sm text-slate-400">
            Supplier cost history per product, flagged when latest cost rises
            over {thresholds.cost_variance_flag_pct ?? 10}% vs. the previous
            entry.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 text-right font-semibold">Cost (₹)</th>
                <th className="px-4 py-3 text-right font-semibold">Variance</th>
                <th className="px-4 py-3 font-semibold">Effective Date</th>
                <th className="px-4 py-3 font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading cost history...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No supplier cost entries recorded yet.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-white/5 ${
                      r.flagged ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {r.product?.name}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {r.product?.sku}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {r.supplier?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      ₹{Number(r.cost_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.variance_pct === null ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span
                          className={`flex items-center justify-end gap-1 font-medium ${
                            r.variance_pct > 0
                              ? 'text-rose-400'
                              : r.variance_pct < 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {r.variance_pct > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : r.variance_pct < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          {r.variance_pct > 0 ? '+' : ''}
                          {r.variance_pct}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(r.effective_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.flagged ? (
                        <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold text-rose-400">
                          Cost Spike
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
