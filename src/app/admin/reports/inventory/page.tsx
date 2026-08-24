'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  CheckCircle,
  Search,
  RefreshCw,
  IndianRupee,
  Boxes,
  XCircle,
  Download,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEMO_PRODUCTS } from '@/lib/products';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  threshold: number;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export default function InventoryReportPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const fetchInventory = async () => {
    try {
      setRefreshing(true);
      const supabase = createClient();
      const { data: products, error } = await supabase
        .from('products')
        .select(
          'id, sku, name, price, stock_quantity, low_stock_threshold, status, category:categories(name)'
        )
        .order('stock_quantity', { ascending: true });

      if (error || !products || products.length === 0) {
        console.warn('Using fallback demo inventory data:', error);
        loadFallback();
        return;
      }

      const formatted: InventoryItem[] = products.map((p: any) => {
        const stock = Number(p.stock_quantity) || 0;
        const threshold = Number(p.low_stock_threshold) || 5;
        let derivedStatus: 'in_stock' | 'low_stock' | 'out_of_stock' =
          'in_stock';

        if (stock === 0 || p.status === 'out_of_stock') {
          derivedStatus = 'out_of_stock';
        } else if (stock <= threshold) {
          derivedStatus = 'low_stock';
        }

        return {
          id: p.id,
          sku: p.sku || 'SKU-GEN',
          name: p.name,
          category: p.category?.name || 'Jewellery',
          stock,
          threshold,
          price: Number(p.price) || 0,
          status: derivedStatus,
        };
      });

      setItems(formatted);
    } catch (err) {
      console.error('Error fetching inventory report:', err);
      loadFallback();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFallback = () => {
    const fallback: InventoryItem[] = DEMO_PRODUCTS.map((p) => {
      let st: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (p.stock_quantity === 0) st = 'out_of_stock';
      else if (p.stock_quantity <= p.low_stock_threshold) st = 'low_stock';
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category?.name || 'Fine Jewellery',
        stock: p.stock_quantity,
        threshold: p.low_stock_threshold,
        price: p.price,
        status: st,
      };
    });
    setItems(fallback);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredInventory = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter = filter === 'all' || item.status === filter;
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [items, filter, search]);

  const lowStockCount = useMemo(
    () => items.filter((i) => i.status === 'low_stock').length,
    [items]
  );
  const outOfStockCount = useMemo(
    () => items.filter((i) => i.status === 'out_of_stock').length,
    [items]
  );
  const totalValuation = useMemo(
    () => items.reduce((acc, curr) => acc + curr.stock * curr.price, 0),
    [items]
  );
  const totalUnits = useMemo(
    () => items.reduce((acc, curr) => acc + curr.stock, 0),
    [items]
  );

  const exportCSV = () => {
    if (items.length === 0) return;
    const headers =
      'SKU,Product Name,Category,Stock Quantity,Threshold,Unit Price,Total Valuation,Status\n';
    const rows = items
      .map(
        (i) =>
          `"${i.sku}","${i.name.replace(/"/g, '""')}","${i.category}",${i.stock},${i.threshold},${i.price},${
            i.stock * i.price
          },"${i.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-valuation-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-end">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="mb-1 inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
              <Boxes className="h-3 w-3" />
              <span>Stock Management</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Inventory & Valuation Report
            </h1>
            <p className="text-xs text-slate-400">
              Real-time stock alerts, warehouse valuation, and low threshold
              notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInventory}
            disabled={refreshing}
            className="flex h-8 items-center space-x-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex h-8 items-center space-x-1.5 rounded-xl bg-amber-500 px-3 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Valuation
            </span>
            <IndianRupee className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-emerald-400">
            Cumulative stock holding value
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Units in Stock
            </span>
            <Package className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {totalUnits.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Across {items.length} SKUs
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Low Stock Warnings
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">
            {lowStockCount} Items
          </p>
          <p className="mt-1 text-[11px] text-amber-400/80">
            At or below reorder threshold
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Out of Stock
            </span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-400">
            {outOfStockCount} Items
          </p>
          <p className="mt-1 text-[11px] text-rose-400/80">
            Require replenishment
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#131726] p-4 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex w-full items-center space-x-1 rounded-xl bg-white/5 p-1 text-xs font-semibold sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === 'all'
                ? 'bg-amber-500 font-bold text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter('low_stock')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === 'low_stock'
                ? 'bg-amber-500 font-bold text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilter('out_of_stock')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === 'out_of_stock'
                ? 'bg-amber-500 font-bold text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-[#131726] py-20 text-center text-xs text-slate-500">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-amber-500/50" />
          <span>Loading inventory valuation records...</span>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#131726] py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-700" />
          <p className="font-semibold text-slate-300">
            No inventory records found
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Try changing your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#131726]">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6">Product / SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-right">In Stock</th>
                <th className="p-4 text-right">Threshold</th>
                <th className="p-4 text-right">Total Valuation</th>
                <th className="p-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-white/5"
                >
                  <td className="p-4 pl-6">
                    <div className="font-semibold text-slate-200">
                      {item.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {item.sku}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{item.category}</td>
                  <td className="p-4 text-right font-medium text-white">
                    ₹{item.price.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-right font-bold text-white">
                    {item.stock}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500">
                    {item.threshold}
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-400">
                    ₹{(item.stock * item.price).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'in_stock'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : item.status === 'low_stock'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
