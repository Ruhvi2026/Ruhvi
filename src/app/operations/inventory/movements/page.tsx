'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Archive, ArrowLeft, Loader2, Filter } from 'lucide-react';
import Link from 'next/link';
import { MOVEMENT_TYPE_META } from '@/lib/inventory';

export default function MovementHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('inventory_movements')
        .select(
          `id, movement_type, quantity, reason, reference_order_id, created_at, created_by,
           variant:product_variants!inner(sku, size, metal_type,
             product:products!inner(name)
           )`
        )
        .order('created_at', { ascending: false })
        .limit(200);
      setMovements(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return movements
      .filter((m) => {
        if (typeFilter !== 'all' && m.movement_type !== typeFilter)
          return false;
        if (search) {
          const q = search.toLowerCase();
          const sku = (m.variant?.sku || '').toLowerCase();
          const name = (m.variant?.product?.name || '').toLowerCase();
          if (!sku.includes(q) && !name.includes(q)) return false;
        }
        return true;
      })
      .slice(0, limit);
  }, [movements, typeFilter, search, limit]);

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
          <h1 className="text-2xl font-bold text-white">
            Stock Movement History
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Full log of every stock change across all variants.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="stock_in">Stock In</option>
          <option value="stock_out">Stock Out</option>
          <option value="adjustment">Adjustment</option>
          <option value="return">Return</option>
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value={50}>Show 50</option>
          <option value={100}>Show 100</option>
          <option value={200}>Show 200</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product / SKU</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">When</th>
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
                    Loading movements...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <Archive className="mx-auto mb-2 h-8 w-8 opacity-20" />
                    No movements found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const mm = MOVEMENT_TYPE_META[m.movement_type] || {
                    label: m.movement_type,
                    badge: 'bg-slate-500/10 text-slate-400',
                    signed: 0,
                  };
                  const prefix = mm.signed > 0 ? '+' : mm.signed < 0 ? '-' : '';
                  return (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {m.variant?.product?.name || 'Unknown'}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {m.variant?.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${mm.badge}`}
                        >
                          {mm.label}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          mm.signed > 0
                            ? 'text-emerald-400'
                            : mm.signed < 0
                              ? 'text-rose-400'
                              : 'text-amber-400'
                        }`}
                      >
                        {prefix}
                        {m.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {m.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {m.reference_order_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
