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
  Package,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createPackaging, updatePackaging, deletePackaging } from './actions';

export default function PackagingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', cost: '', description: '' });

  const fetch = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('packaging_variants')
      .select('*')
      .order('name');
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', cost: '', description: '' });
    setShowForm(true);
  };
  const openEdit = (i: any) => {
    setEditing(i);
    setForm({
      name: i.name,
      cost: String(i.cost),
      description: i.description || '',
    });
    setShowForm(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('cost', form.cost);
    fd.append('description', form.description);
    startTransition(async () => {
      const result = editing
        ? await updatePackaging(editing.id, fd)
        : await createPackaging(fd);
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
    if (!confirm('Delete this packaging variant?')) return;
    startTransition(async () => {
      const result = await deletePackaging(id);
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
            <h1 className="text-2xl font-bold text-white">
              Packaging Variants
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage packaging options selectable in the profit calculator.
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Packaging
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl"
        >
          <h3 className="text-sm font-bold text-white">
            {editing ? 'Edit' : 'New'} Packaging
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Cost (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
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
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 text-right font-semibold">Cost (₹)</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <Package className="mx-auto mb-2 h-8 w-8 opacity-20" />
                    No packaging variants.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">
                      {i.name}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      ₹{Number(i.cost).toLocaleString('en-IN')}
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-3 text-slate-400">
                      {i.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(i)}
                        className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(i.id)}
                        className="ml-1 rounded p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
