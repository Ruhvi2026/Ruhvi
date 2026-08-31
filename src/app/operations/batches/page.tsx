'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Edit2,
  ArrowLeft,
  Calendar,
  Factory,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createBatch, updateBatch, deleteBatch } from './actions';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  planned: {
    label: 'Planned',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  in_production: {
    label: 'In Production',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  delayed: {
    label: 'Delayed',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    target_completion_date: '',
    status: 'planned',
    notes: '',
  });

  const fetch = async () => {
    const supabase = createClient();
    const { data: batchData } = await supabase
      .from('production_batches')
      .select(
        'id, quantity, target_completion_date, status, notes, created_at, product:products!inner(id, name, sku)'
      )
      .order('created_at', { ascending: false });
    setBatches(batchData || []);

    const { data: prodData } = await supabase
      .from('products')
      .select('id, name, sku')
      .order('name');
    setProducts(prodData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      product_id: '',
      quantity: '',
      target_completion_date: '',
      status: 'planned',
      notes: '',
    });
    setShowForm(true);
  };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      product_id: b.product?.id || '',
      quantity: String(b.quantity),
      target_completion_date: b.target_completion_date || '',
      status: b.status,
      notes: b.notes || '',
    });
    setShowForm(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = editing
        ? await updateBatch(editing.id, fd)
        : await createBatch(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success(editing ? 'Updated' : 'Created');
        setShowForm(false);
        setEditing(null);
        fetch();
      }
    });
  };
  const handleDelete = (id: string) => {
    if (!confirm('Delete this batch?')) return;
    startTransition(async () => {
      const result = await deleteBatch(id);
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
            <h1 className="text-2xl font-bold text-white">Batch Production</h1>
            <p className="mt-1 text-sm text-slate-400">
              Plan, track, and manage production batches.
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> New Batch
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl"
        >
          <h3 className="text-sm font-bold text-white">
            {editing ? 'Edit' : 'New'} Production Batch
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
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Target Completion Date
              </label>
              <input
                type="date"
                value={form.target_completion_date}
                onChange={(e) =>
                  setForm({ ...form, target_completion_date: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {Object.entries(STATUS_META).map(([k, v]) => (
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {editing ? 'Update Batch' : 'Create Batch'}
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
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
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
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <Factory className="mx-auto mb-2 h-8 w-8 opacity-20" />
                    No production batches yet.
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const sm = STATUS_META[b.status] || STATUS_META.planned;
                  return (
                    <tr
                      key={b.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {b.product?.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {b.product?.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {b.quantity}
                      </td>
                      <td className="px-4 py-3">
                        {b.target_completion_date ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            {new Date(
                              b.target_completion_date
                            ).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.badge}`}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-400">
                        {b.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(b)}
                          className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="ml-1 rounded p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
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
