'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Award,
  Package,
  AlertTriangle,
  Loader2,
  BarChart3,
  Plus,
  Search,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import toast from 'react-hot-toast';
import { recordRto } from './actions';
import {
  getInventoryThresholds,
  InventoryThresholds,
  DEFAULT_INVENTORY_THRESHOLDS,
} from '@/lib/inventory';

interface ProductPerformance {
  product_id: string;
  product_name: string;
  product_sku: string;
  category_name: string | null;
  cost_price: number;
  base_selling_price: number;
  margin_pct: number;
  order_count: number;
  total_quantity_sold: number;
  total_revenue: number;
  rto_count: number;
  rto_rate: number;
  combined_score: number;
}

export default function ProductPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [thresholds, setThresholds] = useState<InventoryThresholds>(
    DEFAULT_INVENTORY_THRESHOLDS
  );
  const [sortBy, setSortBy] = useState<'score' | 'orders' | 'margin' | 'rto'>(
    'score'
  );
  const [isPending, startTransition] = useTransition();

  // RTO recording form
  const [showRtoForm, setShowRtoForm] = useState(false);
  const [rtoSearch, setRtoSearch] = useState('');
  const [rtoResults, setRtoResults] = useState<any[]>([]);
  const [rtoProduct, setRtoProduct] = useState<any>(null);
  const [rtoVariant, setRtoVariant] = useState('');
  const [rtoOrderRef, setRtoOrderRef] = useState('');
  const [rtoReason, setRtoReason] = useState('');

  // Debounced RTO product search
  useEffect(() => {
    if (rtoSearch.trim().length < 2) {
      setRtoResults([]);
      return;
    }
    const supabase = createClient();
    const delay = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select(`id, name, sku, product_variants(id, sku, size, metal_type)`)
        .or(`name.ilike.%${rtoSearch}%,sku.ilike.%${rtoSearch}%`)
        .limit(8);
      setRtoResults(data || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [rtoSearch]);

  const handleRecordRto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rtoProduct) {
      toast.error('Select a product');
      return;
    }
    const fd = new FormData();
    fd.append('product_id', rtoProduct.id);
    fd.append('variant_id', rtoVariant);
    fd.append('order_reference', rtoOrderRef);
    fd.append('reason', rtoReason);
    startTransition(async () => {
      const result = await recordRto(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success('RTO recorded');
        setShowRtoForm(false);
        setRtoProduct(null);
        setRtoVariant('');
        setRtoOrderRef('');
        setRtoReason('');
        setRtoSearch('');
      }
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const config = await getInventoryThresholds(supabase);
      setThresholds(config);

      // Products with cost/pricing data
      const { data: prodData } = await supabase.from('products').select(
        `id, name, sku, cost_price, base_selling_price,
           category:categories!left(name)`
      );

      // Orders per product from order_items
      const { data: orderItemData } = await supabase.from('order_items').select(
        `product_id, quantity, price_at_purchase,
           order:orders!inner(id, status)`
      );

      // RTO records per product
      const { data: rtoData } = await supabase
        .from('rto_records')
        .select('product_id');

      // Build product stats
      const orderCounts = new Map<
        string,
        { orders: Set<string>; qty: number; revenue: number }
      >();
      (orderItemData || []).forEach((oi: any) => {
        const pid = oi.product_id;
        if (!pid) return;
        if (!orderCounts.has(pid)) {
          orderCounts.set(pid, { orders: new Set(), qty: 0, revenue: 0 });
        }
        const entry = orderCounts.get(pid)!;
        entry.orders.add(oi.order?.id);
        entry.qty += oi.quantity || 0;
        entry.revenue += (oi.price_at_purchase || 0) * (oi.quantity || 0);
      });

      const rtoCounts = new Map<string, number>();
      (rtoData || []).forEach((r: any) => {
        rtoCounts.set(r.product_id, (rtoCounts.get(r.product_id) || 0) + 1);
      });

      const rows: ProductPerformance[] = (prodData || []).map((p: any) => {
        const stats = orderCounts.get(p.id) || {
          orders: new Set(),
          qty: 0,
          revenue: 0,
        };
        const orderCount = stats.orders.size;
        const rtoCount = rtoCounts.get(p.id) || 0;
        const costPrice = p.cost_price || 0;
        const sellPrice = p.base_selling_price || 0;
        const marginPct =
          sellPrice > 0 ? ((sellPrice - costPrice) / sellPrice) * 100 : 0;
        const rtoRate = orderCount > 0 ? (rtoCount / orderCount) * 100 : 0;
        return {
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          category_name: p.category?.name || null,
          cost_price: costPrice,
          base_selling_price: sellPrice,
          margin_pct: Math.round(marginPct * 10) / 10,
          order_count: orderCount,
          total_quantity_sold: stats.qty,
          total_revenue: stats.revenue,
          rto_count: rtoCount,
          rto_rate: Math.round(rtoRate * 10) / 10,
          combined_score: 0,
        };
      });

      // Compute combined score
      const margins = rows.map((r) => r.margin_pct);
      const orders = rows.map((r) => r.order_count);
      const rtos = rows.map((r) => r.rto_rate);
      const minMargin = Math.min(...margins);
      const maxMargin = Math.max(...margins);
      const minOrders = Math.min(...orders);
      const maxOrders = Math.max(...orders);
      const minRto = Math.min(...rtos);
      const maxRto = Math.max(...rtos);

      rows.forEach((r) => {
        const marginScore =
          maxMargin > minMargin
            ? (r.margin_pct - minMargin) / (maxMargin - minMargin)
            : 0.5;
        const volumeScore =
          maxOrders > minOrders
            ? (r.order_count - minOrders) / (maxOrders - minOrders)
            : 0.5;
        const rtoScore =
          maxRto > minRto ? 1 - (r.rto_rate - minRto) / (maxRto - minRto) : 0.5;
        r.combined_score =
          Math.round(
            (marginScore * 0.4 + volumeScore * 0.3 + rtoScore * 0.3) * 1000
          ) / 10;
      });

      setProducts(rows);
      setLoading(false);
    };

    fetchData();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...products];
    switch (sortBy) {
      case 'score':
        return copy.sort((a, b) => b.combined_score - a.combined_score);
      case 'orders':
        return copy.sort((a, b) => b.order_count - a.order_count);
      case 'margin':
        return copy.sort((a, b) => b.margin_pct - a.margin_pct);
      case 'rto':
        return copy.sort((a, b) => b.rto_rate - a.rto_rate);
      default:
        return copy;
    }
  }, [products, sortBy]);

  const hasData = products.some((p) => p.order_count > 0 || p.rto_count > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/dashboard"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Product Performance
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Margin, sales volume, and RTO-based rankings.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowRtoForm(!showRtoForm)}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
        >
          <Plus className="h-4 w-4" />
          Record RTO
        </button>
      </div>

      {/* RTO Recording Form */}
      {showRtoForm && (
        <form
          onSubmit={handleRecordRto}
          className="space-y-4 rounded-xl border border-rose-500/20 bg-[#151520] p-6 shadow-xl"
        >
          <h3 className="text-sm font-bold text-white">Record RTO Entry</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Search Product *
              </label>
              <Search className="absolute left-3 top-9 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Product name or SKU..."
                value={rtoSearch}
                onChange={(e) => setRtoSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {rtoResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
                  {rtoResults.map((p: any) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setRtoProduct(p);
                          setRtoSearch('');
                          setRtoResults([]);
                        }}
                        className={`flex w-full items-center justify-between p-3 text-left text-xs transition-colors hover:bg-white/5 ${rtoProduct?.id === p.id ? 'bg-indigo-500/10' : ''}`}
                      >
                        <span className="font-medium text-white">{p.name}</span>
                        <span className="text-slate-500">{p.sku}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {rtoProduct && (
                <p className="mt-1 text-xs text-emerald-400">
                  Selected: {rtoProduct.name}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Variant (optional)
              </label>
              <select
                value={rtoVariant}
                onChange={(e) => setRtoVariant(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Base product</option>
                {(rtoProduct?.product_variants || []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} — {v.size || 'OS'} / {v.metal_type || '—'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Order Reference
              </label>
              <input
                type="text"
                value={rtoOrderRef}
                onChange={(e) => setRtoOrderRef(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., RHV-2026-8942"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Reason
              </label>
              <input
                type="text"
                value={rtoReason}
                onChange={(e) => setRtoReason(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Customer refused delivery"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowRtoForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !rtoProduct}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Record RTO
            </button>
          </div>
        </form>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Products Tracked
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {products.length}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
            With Orders
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {products.filter((p) => p.order_count > 0).length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            With RTOs
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {products.filter((p) => p.rto_count > 0).length}
          </p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
            Avg RTO Rate
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {products.length > 0
              ? `${
                  products.filter((p) => p.order_count > 0).length > 0
                    ? Math.round(
                        (products.reduce((s, p) => s + p.rto_count, 0) /
                          products.reduce((s, p) => s + p.order_count, 0)) *
                          100 *
                          10
                      ) / 10
                    : 0
                }%`
              : '0%'}
          </p>
        </div>
      </div>

      {/* Lazy report link */}
      <div className="flex items-center gap-2">
        <Link
          href="/operations/performance/trends"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Monthly / Quarterly Trends
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" />
          Loading performance data...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
          {/* Sort controls */}
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sort by:
            </span>
            {(['score', 'orders', 'margin', 'rto'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sortBy === k
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {k === 'score' && 'Combined Score'}
                {k === 'orders' && 'Sales Volume'}
                {k === 'margin' && 'Margin'}
                {k === 'rto' && 'RTO Rate'}
              </button>
            ))}
          </div>

          {!hasData && (
            <div className="flex flex-col items-center justify-center border-b border-white/10 bg-black/20 p-8 text-center">
              <AlertTriangle className="mb-2 h-6 w-6 text-amber-400" />
              <p className="text-sm font-medium text-slate-300">
                No order or RTO data yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Full ranking with sales-volume weighting and RTO rate will
                activate once orders and RTOs are recorded.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Margin</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Units Sold
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">RTOs</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    RTO Rate
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-20" />
                      No products found.
                    </td>
                  </tr>
                ) : (
                  sorted.map((p, i) => (
                    <tr
                      key={p.product_id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && hasData && (
                            <Award className="h-4 w-4 text-amber-400" />
                          )}
                          <div>
                            <p className="font-medium text-white">
                              {p.product_name}
                            </p>
                            <p className="font-mono text-[10px] text-slate-500">
                              {p.product_sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.category_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            p.margin_pct >= 25
                              ? 'text-emerald-400'
                              : p.margin_pct >= 12
                                ? 'text-amber-400'
                                : 'text-rose-400'
                          }`}
                        >
                          {p.margin_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {p.order_count}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {p.total_quantity_sold}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        ₹{p.total_revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            p.rto_count > 0
                              ? 'font-medium text-rose-400'
                              : 'text-slate-500'
                          }
                        >
                          {p.rto_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.order_count > 0 ? (
                          <span
                            className={`font-medium ${
                              p.rto_rate >= thresholds.rto_rate_warning_pct
                                ? 'text-rose-400'
                                : p.rto_rate > 0
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {p.rto_rate}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-400">
                        {hasData ? p.combined_score.toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
