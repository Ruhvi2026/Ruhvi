'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const AGING_BUCKETS = [
  { label: '0–30 days', min: 0, max: 30 },
  { label: '31–60 days', min: 31, max: 60 },
  { label: '61–90 days', min: 61, max: 90 },
  { label: '90+ days', min: 91, max: Infinity },
];

export default function AgingReportPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // All variants with positive stock + product
      const { data: variants } = await supabase
        .from('product_variants')
        .select(
          `id, sku, size, metal_type, stock_quantity,
           product:products!inner(id, name, sku_prefix)`
        )
        .gt('stock_quantity', 0);

      // Most recent movement timestamp per variant
      const { data: lastMovements } = await supabase
        .from('inventory_movements')
        .select('variant_id, created_at')
        .order('created_at', { ascending: false });

      const lastByVariant = new Map<string, string>();
      (lastMovements || []).forEach((m: any) => {
        if (!lastByVariant.has(m.variant_id)) {
          lastByVariant.set(m.variant_id, m.created_at);
        }
      });

      const now = Date.now();
      const enriched = (variants || []).map((v: any) => {
        const last = lastByVariant.get(v.id);
        const days =
          last !== undefined
            ? Math.max(
                0,
                Math.floor((now - new Date(last).getTime()) / 86400000)
              )
            : null;
        return {
          ...v,
          last_movement: last ?? null,
          days_since_movement: days,
        };
      });

      setRows(enriched);
      setLoading(false);
    };
    fetchData();
  }, []);

  const buckets = useMemo(() => {
    return AGING_BUCKETS.map((b) => {
      const items = rows.filter((r) => {
        if (r.days_since_movement === null) return false;
        return r.days_since_movement >= b.min && r.days_since_movement <= b.max;
      });
      const units = items.reduce((s, r) => s + r.stock_quantity, 0);
      return { ...b, items, units };
    });
  }, [rows]);

  const unmoved = rows.filter((r) => r.days_since_movement === null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/inventory"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Aging</h1>
          <p className="mt-1 text-sm text-slate-400">
            How long current stock has sat since its last stock movement.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" />
          Loading aging report...
        </div>
      ) : (
        <>
          {/* Bucket summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buckets.map((b) => (
              <div
                key={b.label}
                className={`rounded-xl border p-5 ${
                  b.min >= 91
                    ? 'border-rose-500/20 bg-rose-500/5'
                    : b.min >= 61
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-white/5 bg-[#151520]'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {b.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {b.items.length}
                </p>
                <p className="text-[10px] text-slate-500">{b.units} units</p>
              </div>
            ))}
          </div>

          {unmoved.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-[#151520] p-4 text-xs text-slate-400">
              {unmoved.length} variant(s) have no movement history (age
              unknown). These are likely variants created without logged stock
              movements.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Size / Metal</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Units
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Days Unmoved
                    </th>
                    <th className="px-4 py-3 font-semibold">Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No in-stock variants to report.
                      </td>
                    </tr>
                  ) : (
                    [...rows]
                      .sort(
                        (a, b) =>
                          (b.days_since_movement ?? -1) -
                          (a.days_since_movement ?? -1)
                      )
                      .map((r) => {
                        const d = r.days_since_movement;
                        const bucket =
                          d === null
                            ? null
                            : AGING_BUCKETS.find(
                                (b) => d >= b.min && d <= b.max
                              );
                        return (
                          <tr
                            key={r.id}
                            className="transition-colors hover:bg-white/5"
                          >
                            <td className="px-4 py-3 font-medium text-white">
                              {r.product?.name}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-300">
                              {r.sku}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {r.size || '-'} / {r.metal_type || '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {r.stock_quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {d === null ? '—' : d}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                                  d === null
                                    ? 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                                    : d >= 91
                                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                                      : d >= 61
                                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                }`}
                              >
                                {d === null
                                  ? 'Unknown'
                                  : bucket
                                    ? bucket.label
                                    : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
