'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createQcLog, deleteQcLog } from './actions';

const ISSUE_TYPES: Record<string, { label: string; badge: string }> = {
  plating_uneven: {
    label: 'Plating Uneven',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  stone_loose: {
    label: 'Stone Loose',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  size_mismatch: {
    label: 'Size Mismatch',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  packaging_damage: {
    label: 'Packaging Damage',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  other: {
    label: 'Other',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
};

export default function QualityControlPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    variant_id: '',
    batch_reference: '',
    issue_type: 'other',
    notes: '',
  });

  const fetchData = async () => {
    const supabase = createClient();
    const { data: logData } = await supabase
      .from('quality_control_logs')
      .select(
        `id, batch_reference, issue_type, notes, checked_at,
         product:products!left(id, name, sku),
         variant:product_variants!left(id, sku, size, metal_type)`
      )
      .order('checked_at', { ascending: false });
    setLogs(logData || []);

    const { data: prodData } = await supabase
      .from('products')
      .select(`id, name, sku, product_variants(id, sku, size, metal_type)`)
      .order('name');
    setProducts(prodData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = logs.filter((l) => {
    if (productFilter && l.product?.id !== productFilter) return false;
    if (
      batchFilter &&
      !(l.batch_reference || '')
        .toLowerCase()
        .includes(batchFilter.toLowerCase())
    )
      return false;
    return true;
  });

  const selectedProduct = products.find((p) => p.id === form.product_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await createQcLog(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success('QC log added');
        setShowForm(false);
        setForm({
          product_id: '',
          variant_id: '',
          batch_reference: '',
          issue_type: 'other',
          notes: '',
        });
        fetchData();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this QC entry?')) return;
    startTransition(async () => {
      const result = await deleteQcLog(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('QC entry deleted');
        fetchData();
      }
    });
  };

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
            <h1 className="text-2xl font-bold text-white">Quality Control</h1>
            <p className="mt-1 text-sm text-slate-400">
              Log and filter quality issues per product or batch.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Log Issue
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by batch..."
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-indigo-400" /> New QC Entry
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Product *
              </label>
              <select
                required
                value={form.product_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    product_id: e.target.value,
                    variant_id: '',
                  })
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
                Variant
              </label>
              <select
                value={form.variant_id}
                onChange={(e) =>
                  setForm({ ...form, variant_id: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Base product</option>
                {(selectedProduct?.product_variants || []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} — {v.size || 'OS'} / {v.metal_type || '—'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Batch Reference
              </label>
              <input
                type="text"
                value={form.batch_reference}
                onChange={(e) =>
                  setForm({ ...form, batch_reference: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., BATCH-001"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Issue Type
              </label>
              <select
                value={form.issue_type}
                onChange={(e) =>
                  setForm({ ...form, issue_type: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {Object.entries(ISSUE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Notes
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save QC Entry
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
                <th className="px-4 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold">Issue</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Checked At</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading QC logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No QC entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const issue = ISSUE_TYPES[l.issue_type] || ISSUE_TYPES.other;
                  return (
                    <tr
                      key={l.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {l.product?.name || '—'}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {l.variant?.sku || l.product?.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {l.batch_reference || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${issue.badge}`}
                        >
                          {issue.label}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-400">
                        {l.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(l.checked_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
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
