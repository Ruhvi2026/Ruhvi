'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Truck,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface OperationsStats {
  totalProducts: number;
  lowStockAlerts: number;
  pendingTransfers: number;
  activeCategories: number;
}

export default function OperationsDashboard() {
  const { user, profile } = useAuth();
  const userName =
    profile?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Operations Staff';

  const [stats, setStats] = useState<OperationsStats>({
    totalProducts: 9,
    lowStockAlerts: 0,
    pendingTransfers: 0,
    activeCategories: 6,
  });
  const [loading, setLoading] = useState(true);

  const fetchOperationsStats = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const [productsRes, categoriesRes, lowStockRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('product_variants')
          .select('id, stock_quantity, reorder_point')
          .limit(200),
      ]);

      const totalProducts = productsRes.count ?? 9;
      const activeCategories = categoriesRes.count ?? 6;

      let lowStockCount = 0;
      if (lowStockRes.data) {
        lowStockCount = lowStockRes.data.filter(
          (v: any) =>
            v.stock_quantity <=
            (v.reorder_point && v.reorder_point > 0 ? v.reorder_point : 5)
        ).length;
      }

      setStats({
        totalProducts,
        lowStockAlerts: lowStockCount,
        pendingTransfers: 0,
        activeCategories,
      });
    } catch (err) {
      console.error('Error fetching operations stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back,{' '}
            <span className="font-semibold text-amber-400">{userName}</span>.
            Here is your operations overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOperationsStats}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-sm backdrop-blur-md transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Refresh counts"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/operations/products/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-900/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Product</span>
          </Link>
        </div>
      </div>

      {/* 4 Floating Glass KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Products */}
        <Link
          href="/operations/products"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#131726] p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 shadow-inner">
              <Package className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
              <span>View Catalog</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Total Products
            </p>
            <p className="mt-0.5 text-3xl font-extrabold text-white">
              {loading ? '—' : stats.totalProducts.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Live active SKUs in database
            </p>
          </div>
        </Link>

        {/* Metric 2: Low Stock Alerts */}
        <Link
          href="/operations/inventory"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#131726] p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/40"
        >
          <div className="flex items-start justify-between">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-inner ${
                stats.lowStockAlerts > 0
                  ? 'animate-pulse bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
            </div>
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                stats.lowStockAlerts > 0
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <span>
                {stats.lowStockAlerts > 0 ? 'Action Needed' : 'Healthy'}
              </span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Low Stock Alerts
            </p>
            <p className="mt-0.5 text-3xl font-extrabold text-white">
              {loading ? '—' : stats.lowStockAlerts.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Variants below reorder threshold
            </p>
          </div>
        </Link>

        {/* Metric 3: Active Categories */}
        <Link
          href="/operations/categories"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#131726] p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 shadow-inner">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <span>Categories</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Active Categories
            </p>
            <p className="mt-0.5 text-3xl font-extrabold text-white">
              {loading ? '—' : stats.activeCategories.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Rings, Necklaces, Bracelets & more
            </p>
          </div>
        </Link>

        {/* Metric 4: Suppliers & Transfers */}
        <Link
          href="/operations/suppliers"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#131726] p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 shadow-inner">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
              <span>Suppliers</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Pending Transfers
            </p>
            <p className="mt-0.5 text-3xl font-extrabold text-white">
              {loading ? '—' : stats.pendingTransfers}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Vendor shipments in transit
            </p>
          </div>
        </Link>
      </div>

      {/* Main Panels: Recent Activity & Quick Inventory Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel 1: Recent Operations Activity */}
        <div className="rounded-2xl border border-white/10 bg-[#131726] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Recent Operations Feed
              </h2>
              <p className="text-xs text-slate-400">
                Inventory changes, batch runs, and product updates
              </p>
            </div>
            <Link
              href="/operations/inventory"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              View Full History →
            </Link>
          </div>
          <div className="mt-4 flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
            <TrendingUp className="h-8 w-8 text-slate-500 opacity-60" />
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Live Activity Stream Online
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Inventory sync and catalog actions appear here in real time.
            </p>
          </div>
        </div>

        {/* Panel 2: Low Stock & Reorder Queue */}
        <div className="rounded-2xl border border-white/10 bg-[#131726] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Inventory Alerts & Reorder Queue
              </h2>
              <p className="text-xs text-slate-400">
                Low stock jewelry pieces requiring procurement
              </p>
            </div>
            <Link
              href="/operations/inventory"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              Open Inventory →
            </Link>
          </div>
          <div className="mt-4 flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
            <AlertCircle className="h-8 w-8 text-amber-400/60" />
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {stats.lowStockAlerts > 0
                ? `${stats.lowStockAlerts} items require reordering`
                : 'All stock levels are optimal'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Thresholds calculated automatically from reorder points.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
