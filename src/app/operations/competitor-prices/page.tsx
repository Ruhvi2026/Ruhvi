'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createCompetitorPrice, deleteCompetitorPrice } from './actions';

export default function CompetitorPricesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    competitor_name: '',
    competitor_price: '',
    url: '',
  });

  const fetch = async () => {
    const supabase = createClient();
    const { data: priceData } = await supabase
      .from('competitor_prices')
      .select(
        'id, competitor_name, competitor_price, url, checked_at, product:products!inner(id, name, sku, price)'
      )
      .order('checked_at', { ascending: false });
    setRows(priceData || []);

    const { data: prodData } = await supabase
      .from('products')
      .select('id, name, sku, price')
      .order('name');
    setProducts(prodData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('product_id', form.product_id);
    fd.append('competitor_name', form.competitor_name);
    fd.append('competitor_price', form.competitor_price);
    fd.append('url', form.url);
    startTransition(async () => {
      const result = await createCompetitorPrice(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Price recorded');
        setShowForm(false);
        setForm({
          product_id: '',
          competitor_name: '',
          competitor_price: '',
          url: '',
        });
        fetch();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this entry?')) return;
    startTransition(async () => {
      const result = await deleteCompetitorPrice(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Deleted');
        fetch();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/dashboard"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Competitor Prices</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manual monitoring — no automated scraping.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Price
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl"
        >
          <h3 className="text-sm font-bold text-white">New Competitor Price</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Product *
              </label>
              <select
                required
                value={form.product_id}
                onChange={(e) =>
                  setForm({ ...form, product_id: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Competitor Name *
              </label>
              <input
                type="text"
                required
                value={form.competitor_name}
                onChange={(e) =>
                  setForm({ ...form, competitor_name: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Malabar Gold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Competitor Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.competitor_price}
                onChange={(e) =>
                  setForm({ ...form, competitor_price: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                URL
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}{' '}
              Save Price
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Competitor</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Our Price (₹)
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Their Price (₹)
                </th>
                <th className="px-4 py-3 text-right font-semibold">Diff</th>
                <th className="px-4 py-3 font-semibold">Checked</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No competitor prices recorded.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const diff =
                    (r.competitor_price ?? 0) - (r.product?.price ?? 0);
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {r.product?.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {r.product?.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-slate-300">
                          {r.competitor_name}
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-indigo-400"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        ₹{Number(r.product?.price ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        ₹
                        {Number(r.competitor_price ?? 0).toLocaleString(
                          'en-IN'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-rose-400' : 'text-slate-400'}`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff > 0
                            ? '₹' + diff.toLocaleString('en-IN')
                            : diff === 0
                              ? '—'
                              : '₹' +
                                Math.abs(diff).toLocaleString('en-IN') +
                                ' lower'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(r.checked_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
