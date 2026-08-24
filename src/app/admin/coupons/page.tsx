'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  usage_limit_total: number | null;
  usage_limit_per_user: number;
  applicable_to?: string;
  target_users?: string[] | null;
  is_public?: boolean;
  expiry_date?: string | null;
  active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_value: '',
  usage_limit_total: '',
  expiry_date: '',
  active: true,
  target_users_raw: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      setCoupons((data as Coupon[]) || []);
    } catch {
      // Show empty state
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_value: parseFloat(form.min_order_value) || 0,
        usage_limit_total: form.usage_limit_total
          ? parseInt(form.usage_limit_total)
          : null,
        usage_limit_per_user: 1,
        expiry_date: form.expiry_date
          ? new Date(form.expiry_date).toISOString()
          : null,
        active: form.active,
        target_users: form.target_users_raw.trim()
          ? form.target_users_raw
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          : null,
      };
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) throw error;
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchCoupons();
    } catch (err: any) {
      alert(
        err.message ||
          'Failed to create coupon. Make sure the coupons table exists in Supabase.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const supabase = createClient();
      await supabase
        .from('coupons')
        .update({ active: !coupon.active })
        .eq('id', coupon.id);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, active: !c.active } : c))
      );
    } catch {
      alert('Failed to update coupon status.');
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return;
    try {
      const supabase = createClient();
      await supabase.from('coupons').delete().eq('id', id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete coupon.');
    }
  };

  const filtered = useMemo(
    () =>
      coupons.filter((c) =>
        c.code.toLowerCase().includes(search.toLowerCase())
      ),
    [coupons, search]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Coupons & Offers</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {coupons.length} coupon codes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New Coupon
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Coupons',
            value: coupons.length.toString(),
            color: 'text-white',
          },
          {
            label: 'Active Coupons',
            value: coupons.filter((c) => c.active).length.toString(),
            color: 'text-emerald-400',
          },
          {
            label: 'Public Coupons',
            value: coupons
              .filter((c) => c.is_public !== false)
              .length.toString(),
            color: 'text-blue-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/5 bg-[#131726] p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search coupon code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading coupons...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              No coupons found
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Create your first coupon using the button above
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left font-semibold">Code</th>
                  <th className="px-5 py-3 text-left font-semibold">
                    Discount
                  </th>
                  <th className="px-5 py-3 text-left font-semibold">
                    Min Order
                  </th>
                  <th className="px-5 py-3 text-left font-semibold">
                    Max Uses
                  </th>
                  <th className="px-5 py-3 text-left font-semibold">Expires</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-bold tracking-wider text-emerald-400">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-200">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% OFF`
                        : `₹${coupon.discount_value.toLocaleString('en-IN')} OFF`}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {coupon.min_order_value > 0
                        ? `₹${coupon.min_order_value.toLocaleString('en-IN')}`
                        : 'No minimum'}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {coupon.usage_limit_total ?? 'Unlimited'}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {coupon.expiry_date
                        ? new Date(coupon.expiry_date).toLocaleDateString(
                            'en-IN',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className="flex items-center gap-1.5"
                      >
                        {coupon.active ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-emerald-400" />
                            <span className="font-semibold text-emerald-400">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        title="Delete coupon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f35] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h2 className="text-sm font-bold text-white">
                Create New Coupon
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Coupon Code *
                  </label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. WELCOME10"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Discount Type *
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({ ...form, discount_type: e.target.value as any })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="percentage" className="bg-[#1a1f35]">
                      Percentage (%)
                    </option>
                    <option value="fixed" className="bg-[#1a1f35]">
                      Fixed Amount (₹)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Discount Value *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm({ ...form, discount_value: e.target.value })
                    }
                    placeholder={
                      form.discount_type === 'percentage' ? '10' : '500'
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_order_value}
                    onChange={(e) =>
                      setForm({ ...form, min_order_value: e.target.value })
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Max Total Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.usage_limit_total}
                    onChange={(e) =>
                      setForm({ ...form, usage_limit_total: e.target.value })
                    }
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Target Users (Optional)
                  </label>
                  <input
                    value={form.target_users_raw}
                    onChange={(e) =>
                      setForm({ ...form, target_users_raw: e.target.value })
                    }
                    placeholder="Enter emails or phones separated by commas (e.g. user@gmail.com, 9876543210)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-[9px] text-slate-500">
                    Leave blank to allow all users. If specified, only these
                    users can apply the coupon.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) =>
                      setForm({ ...form, expiry_date: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <label
                    htmlFor="active"
                    className="text-xs font-medium text-slate-300"
                  >
                    Activate coupon immediately
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
