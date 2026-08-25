'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Edit2,
  Trash2,
  ExternalLink,
  Package,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Product } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchProducts = async () => {
    try {
      setRefreshing(true);
      setLoadError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not query Supabase products:', error);
        setLoadError(error.message || 'Failed to load products.');
        setProducts([]);
        return;
      }

      setProducts(data ?? []);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setLoadError(err?.message || 'Failed to load products.');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.name) set.add(p.category.name);
    });
    return Array.from(set);
  }, [products]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'hidden' : 'active';
    setActionLoadingId(id);
    setFeedback(null);

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: nextStatus as any } : p))
    );

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('products')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setFeedback({
        type: 'success',
        text: `Product visibility set to ${nextStatus}.`,
      });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      // Rollback
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: currentStatus as any } : p
        )
      );
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update visibility.',
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const toggleStock = async (id: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === 'out_of_stock' ? 'active' : 'out_of_stock';
    setActionLoadingId(id);
    setFeedback(null);

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: nextStatus as any } : p))
    );

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('products')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setFeedback({
        type: 'success',
        text: `Product marked as ${nextStatus.replace('_', ' ')}.`,
      });
    } catch (err: any) {
      console.error('Failed to update stock status:', err);
      // Rollback
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: currentStatus as any } : p
        )
      );
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update stock status.',
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === 'all' || p.category?.name === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            <Package className="h-3.5 w-3.5" />
            <span>Catalog Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Product Management</h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage catalog items, pricing, inventory stock, and direct
            visibility.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProducts}
            disabled={refreshing}
            className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center space-x-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Load Error Alert */}
      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Failed to load products from the database: {loadError}
          </span>
          <button
            onClick={fetchProducts}
            className="ml-4 flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#131726] p-4 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or SKU..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all" className="bg-[#131726] text-white">
                All Categories
              </option>
              {categories.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  className="bg-[#131726] text-white"
                >
                  {cat}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all" className="bg-[#131726] text-white">
              All Statuses
            </option>
            <option value="active" className="bg-[#131726] text-white">
              Active
            </option>
            <option value="hidden" className="bg-[#131726] text-white">
              Hidden
            </option>
            <option value="out_of_stock" className="bg-[#131726] text-white">
              Out of Stock
            </option>
          </select>

          <div className="px-2 text-xs text-slate-500">
            Total:{' '}
            <span className="font-bold text-white">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-[#131726] py-20 text-center text-xs text-slate-500">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-amber-500/50" />
          <span>Loading catalog items from Supabase...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#131726] py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-700" />
          <p className="font-semibold text-slate-300">
            No products match the filter
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Try changing your search keywords or category filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#131726]">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price / MRP</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filtered.map((product) => {
                const isWorking = actionLoadingId === product.id;
                const firstImg = product.images?.[0]?.url;

                return (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center space-x-3">
                        {firstImg ? (
                          <img
                            src={firstImg}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-600">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-200">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            {product.is_new_arrival && (
                              <span className="text-amber-400">● New</span>
                            )}
                            {product.is_best_seller && (
                              <span className="text-emerald-400">
                                ● Best Seller
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] font-medium text-slate-400">
                      {product.sku}
                    </td>
                    <td className="p-4 text-slate-400">
                      {product.category?.name || '—'}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-white">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>{' '}
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-[10px] text-slate-500 line-through">
                          ₹{product.mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {product.stock_quantity <=
                      (product.low_stock_threshold || 5) ? (
                        <span className="inline-flex items-center space-x-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{product.stock_quantity} left</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {product.stock_quantity} pcs
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          product.status === 'active'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : product.status === 'out_of_stock'
                              ? 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                              : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {product.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="space-x-2 whitespace-nowrap p-4 pr-6 text-right">
                      <button
                        onClick={() => toggleStatus(product.id, product.status)}
                        disabled={isWorking}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold transition-colors disabled:opacity-50 ${
                          product.status === 'hidden'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title="Toggle Visibility (Active / Hidden)"
                      >
                        {product.status === 'hidden' ? (
                          <>
                            <EyeOff className="h-3 w-3" /> Hidden
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" /> Visible
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => toggleStock(product.id, product.status)}
                        disabled={isWorking}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
                        title="Toggle Out of Stock status"
                      >
                        Stock
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
