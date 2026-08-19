'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adjustStock } from '../actions';
import { Search, Package, Save, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function StockAdjustmentPage() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('restock');
  const [notes, setNotes] = useState('');

  // Debounced search
  useEffect(() => {
    const fetchProducts = async () => {
      if (!search || search.length < 2) {
        setProducts([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity')
        .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        .limit(5);

      setProducts(data || []);
    };

    const delay = setTimeout(fetchProducts, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearch('');
    setProducts([]);
    setAdjustment('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const formData = new FormData();
    formData.append('product_id', selectedProduct.id);
    formData.append('adjustment', adjustment);
    formData.append('reason', reason);
    formData.append('notes', notes);

    startTransition(async () => {
      try {
        const result = await adjustStock(formData);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Stock adjusted successfully!');
          setSelectedProduct(null);
          setAdjustment('');
          setNotes('');
        }
      } catch (err) {
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/inventory"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Adjustment</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manually adjust stock quantities and log the reason.
          </p>
        </div>
      </div>

      {!selectedProduct ? (
        <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Search Product
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {products.length > 0 && (
            <ul className="mt-2 divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-black/20">
              {products.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelectProduct(p)}
                    className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-white/5"
                  >
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-500">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Current Stock</p>
                      <p className="font-bold text-white">{p.stock_quantity}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedProduct.name}
                </h2>
                <p className="text-sm text-slate-400">
                  SKU: {selectedProduct.sku}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Change Product
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Current Stock
                </p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {selectedProduct.stock_quantity}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">
                  New Stock (Preview)
                </p>
                <p
                  className={`mt-1 text-3xl font-bold ${
                    adjustment
                      ? parseInt(adjustment) > 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : 'text-white'
                  }`}
                >
                  {selectedProduct.stock_quantity + (parseInt(adjustment) || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Adjustment Amount *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 5 or -2"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use negative numbers to reduce stock.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="restock">Restock (+)</option>
                  <option value="damage">Damage/Loss (-)</option>
                  <option value="return">Customer Return (+)</option>
                  <option value="audit">
                    Inventory Audit (Count Correction)
                  </option>
                  <option value="transfer">Warehouse Transfer</option>
                  <option value="manual">Manual Adjustment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., PO #12345 received, or Found damaged in transit..."
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-white/10 bg-black/20 p-6">
            <button
              type="submit"
              disabled={isPending || !adjustment || parseInt(adjustment) === 0}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Apply Adjustment
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
