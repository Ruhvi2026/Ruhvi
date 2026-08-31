'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Search,
  Star,
  Clock,
  ArrowLeft,
  Edit2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createSupplier, updateSupplier, deleteSupplier } from './actions';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    lead_time_days: '',
    quality_rating: '',
    notes: '',
  });

  const fetchSuppliers = async () => {
    const supabase = createClient();
    const q = supabase.from('suppliers').select('*').order('name');
    const { data } = await q;
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filtered = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_person || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      lead_time_days: '',
      quality_rating: '',
      notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      lead_time_days: s.lead_time_days ?? '',
      quality_rating: s.quality_rating ?? '',
      notes: s.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    startTransition(async () => {
      const result = editing
        ? await updateSupplier(editing.id, fd)
        : await createSupplier(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success(editing ? 'Supplier updated' : 'Supplier created');
        setShowForm(false);
        setEditing(null);
        fetchSuppliers();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    startTransition(async () => {
      const result = await deleteSupplier(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Supplier deleted');
        fetchSuppliers();
      }
    });
  };

  const ratingColor = (r: number) => {
    if (r >= 4.5) return 'text-emerald-400';
    if (r >= 3.5) return 'text-amber-400';
    return 'text-rose-400';
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
            <h1 className="text-2xl font-bold text-white">Suppliers</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage vendor relationships and quality.
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-indigo-500/20 bg-[#151520] p-6 shadow-xl"
        >
          <h3 className="text-sm font-bold text-white">
            {editing ? 'Edit Supplier' : 'New Supplier'}
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
                Contact Person
              </label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) =>
                  setForm({ ...form, contact_person: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Lead Time (days)
              </label>
              <input
                type="number"
                min="0"
                value={form.lead_time_days}
                onChange={(e) =>
                  setForm({ ...form, lead_time_days: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Quality Rating (1–5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.quality_rating}
                onChange={(e) =>
                  setForm({ ...form, quality_rating: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
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
              {editing ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Lead Time</th>
                <th className="px-4 py-3 font-semibold">Rating</th>
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
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.name}</p>
                      {s.email && (
                        <p className="text-[10px] text-slate-500">{s.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {s.contact_person || '-'}
                      {s.phone && (
                        <span className="block text-[10px] text-slate-500">
                          {s.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {s.lead_time_days ?? '—'}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.quality_rating ? (
                        <span
                          className={`flex items-center gap-1 font-medium ${ratingColor(s.quality_rating)}`}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          {s.quality_rating}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-400">
                      {s.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="ml-1 rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
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
