'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ValuationReportPage() {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('product_variants')
        .select(
          `id, sku, size, metal_type, stock_quantity, cost_price_override,
           product:products!inner(id, name, sku_prefix, cost_price, base_selling_price,
             category:categories!left(name)
           )`
        )
        .order('stock_quantity', { ascending: false });
      setVariants(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const rows = useMemo(() => {
    return variants.map((v: any) => {
      const cost = v.cost_price_override ?? v.product?.cost_price ?? 0;
      const qty = v.stock_quantity ?? 0;
      const unitValue = cost || 0;
      return {
        ...v,
        cost_price: cost,
        unit_value: unitValue,
        total_value: qty * unitValue,
      };
    });
  }, [variants]);

  const totals = useMemo(() => {
    const costValue = rows.reduce((s, r) => s + r.total_value, 0);
    const retailValue = rows.reduce((s, r) => {
      const retail =
        r.product?.base_selling_price ?? r.product?.cost_price ?? 0;
      return s + (r.stock_quantity ?? 0) * retail;
    }, 0);
    const units = rows.reduce((s, r) => s + (r.stock_quantity ?? 0), 0);
    return { costValue, retailValue, units };
  }, [rows]);

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
          <h1 className="text-2xl font-bold text-white">Inventory Valuation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Current stock valued at cost price across all variants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Units
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{totals.units}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-[#151520] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            At Cost Price
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            ₹{totals.costValue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-[#151520] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            At Base Selling Price
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            ₹{totals.retailValue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Size / Metal</th>
                <th className="px-4 py-3 text-right font-semibold">Units</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Unit Cost (₹)
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Total Value (₹)
                </th>
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
                    Loading valuation...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No inventory data yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-white/5">
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
                      ₹{Number(r.cost_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-400">
                      ₹{r.total_value.toLocaleString('en-IN')}
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
