'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  Package,
  ArrowRight,
  Activity,
  Search,
  Filter,
  TrendingDown,
  DollarSign,
  Clock,
  Archive,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import {
  getInventoryThresholds,
  computeStockStatus,
  STOCK_STATUS_META,
  MOVEMENT_TYPE_META,
  StockStatus,
  InventoryThresholds,
  DEFAULT_INVENTORY_THRESHOLDS,
} from '@/lib/inventory';

interface VariantRow {
  id: string;
  sku: string;
  size: string | null;
  metal_type: string | null;
  stock_quantity: number;
  reorder_point: number;
  cost_price_override: number | null;
  selling_price_override: number | null;
  product: {
    id: string;
    name: string;
    slug: string;
    sku_prefix: string | null;
    category_id: string | null;
    category?: { name: string } | null;
  };
  status: StockStatus;
  valuation: number;
}

interface MovementRow {
  id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  created_by?: string | null;
  variant: { sku: string } | null;
  product_name: string;
}

export default function InventoryDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [todayMovements, setTodayMovements] = useState<MovementRow[]>([]);
  const [thresholds, setThresholds] = useState<InventoryThresholds>(
    DEFAULT_INVENTORY_THRESHOLDS
  );

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const config = await getInventoryThresholds(supabase);
      setThresholds(config);

      // Fetch categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      setCategories(cats || []);

      // Fetch all variants with product + category
      const { data: vData } = await supabase
        .from('product_variants')
        .select(
          `id, sku, size, metal_type, stock_quantity, reorder_point, cost_price_override, selling_price_override,
           product:products!inner(id, name, slug, sku_prefix, category_id, cost_price, base_selling_price,
             category:categories!left(name)
           )`
        )
        .order('stock_quantity', { ascending: true });

      // Fetch stock_out movements in the dead_stock window for dead-stock detection
      const deadDate = new Date(
        Date.now() - config.dead_stock_days * 86400000
      ).toISOString();
      const { data: outData } = await supabase
        .from('inventory_movements')
        .select('variant_id')
        .gte('created_at', deadDate)
        .eq('movement_type', 'stock_out');

      const recentOutVariantIds = new Set(
        (outData || []).map((r: any) => r.variant_id)
      );

      // Fetch today's movements
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayData } = await supabase
        .from('inventory_movements')
        .select(
          `id, movement_type, quantity, reason, created_at,
           variant:product_variants!inner(sku),
           created_by`
        )
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Build variant rows
      const rows: VariantRow[] = (vData || []).map((v: any) => {
        const product = v.product;
        const costPrice = v.cost_price_override ?? product?.cost_price ?? 0;
        return {
          id: v.id,
          sku: v.sku,
          size: v.size,
          metal_type: v.metal_type,
          stock_quantity: v.stock_quantity ?? 0,
          reorder_point: v.reorder_point ?? 5,
          cost_price_override: v.cost_price_override,
          selling_price_override: v.selling_price_override,
          product: {
            id: product?.id ?? '',
            name: product?.name ?? '',
            slug: product?.slug ?? '',
            sku_prefix: product?.sku_prefix ?? null,
            category_id: product?.category_id ?? null,
            category: product?.category ?? null,
          },
          status: computeStockStatus(
            {
              stock_quantity: v.stock_quantity ?? 0,
              reorder_point: v.reorder_point ?? 5,
              recent_stock_out: recentOutVariantIds.has(v.id),
            },
            config
          ),
          valuation: (v.stock_quantity ?? 0) * (costPrice || 0),
        };
      });

      setVariants(rows);
      setTodayMovements(
        (todayData || []).map((m: any) => ({
          ...m,
          product_name: m.variant?.sku ?? '',
        }))
      );
      setLoading(false);
    };

    fetchData();
  }, []);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (categoryFilter && v.product.category_id !== categoryFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = v.product.name.toLowerCase().includes(q);
        const matchSku = v.sku.toLowerCase().includes(q);
        const matchSize = (v.size || '').toLowerCase().includes(q);
        const matchMetal = (v.metal_type || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchSize && !matchMetal) return false;
      }
      return true;
    });
  }, [variants, statusFilter, categoryFilter, search]);

  const lowStockVariants = useMemo(
    () => variants.filter((v) => v.status === 'low_stock'),
    [variants]
  );
  const deadStockVariants = useMemo(
    () => variants.filter((v) => v.status === 'dead_stock'),
    [variants]
  );
  const outOfStockVariants = useMemo(
    () => variants.filter((v) => v.status === 'out_of_stock'),
    [variants]
  );

  const totalValuation = useMemo(
    () => variants.reduce((s, v) => s + v.valuation, 0),
    [variants]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Variant-level stock monitoring, alerts, and reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/operations/inventory/adjustment"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Activity className="h-4 w-4" />
            Adjust Stock
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total Variants
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {variants.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Low Stock
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {lowStockVariants.length}
          </p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
            Out of Stock
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {outOfStockVariants.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Dead Stock
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {deadStockVariants.length}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Valuation
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
            Today Movements
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {todayMovements.length}
          </p>
        </div>
      </div>

      {/* Lazy Report Links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/operations/inventory/valuation"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          <DollarSign className="h-3.5 w-3.5" /> Valuation Report
        </Link>
        <Link
          href="/operations/inventory/aging"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          <Clock className="h-3.5 w-3.5" /> Aging Report
        </Link>
        <Link
          href="/operations/inventory/movements"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          <Archive className="h-3.5 w-3.5" /> Movement History
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Table */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl lg:col-span-2">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, SKU, size, metal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StockStatus | 'all')
              }
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="dead_stock">Dead Stock</option>
              <option value="high_stock">High Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product / Variant</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Metal</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valuation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredVariants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-20" />
                      No variants found.
                    </td>
                  </tr>
                ) : (
                  filteredVariants.map((v) => {
                    const meta = STOCK_STATUS_META[v.status];
                    return (
                      <tr
                        key={v.id}
                        className="transition-colors hover:bg-white/5"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">
                            {v.product.name}
                          </p>
                          {v.product.category && (
                            <p className="text-[10px] text-slate-500">
                              {v.product.category.name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {v.sku}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {v.size || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {v.metal_type || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${meta.dot}`}
                            />
                            <span className="font-medium text-white">
                              {v.stock_quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${meta.badge}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white">
                          ₹{v.valuation.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Alerts & Today */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-[#151520] shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 bg-amber-500/5 p-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-white">
                Low Stock Alerts
              </h2>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : lowStockVariants.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No low stock items!
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {lowStockVariants.slice(0, 10).map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-800 text-slate-400">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {v.product.name}
                          </p>
                          <p className="text-xs text-slate-500">{v.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-500">
                          {v.stock_quantity}
                        </p>
                        <Link
                          href="/operations/inventory/adjustment"
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Restock <ArrowRight className="inline h-3 w-3" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Today's Movements */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 p-4">
              <TrendingDown className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Today</h2>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : todayMovements.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No movements today.
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {todayMovements.slice(0, 8).map((m) => {
                    const mm = MOVEMENT_TYPE_META[m.movement_type] || {
                      label: m.movement_type,
                      badge: 'bg-slate-500/10 text-slate-400',
                      signed: 0,
                    };
                    const prefix =
                      mm.signed > 0 ? '+' : mm.signed < 0 ? '-' : '';
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between p-3 transition-colors hover:bg-white/5"
                      >
                        <div>
                          <p className="text-xs font-medium text-white">
                            {m.variant?.sku || 'Unknown'}
                          </p>
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${mm.badge}`}
                          >
                            {mm.label}
                          </span>
                          {m.reason && (
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {m.reason}
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-sm font-bold ${
                            mm.signed > 0
                              ? 'text-emerald-400'
                              : mm.signed < 0
                                ? 'text-rose-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {prefix}
                          {m.quantity}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
