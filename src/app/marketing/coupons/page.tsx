'use client';

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  X,
  Loader2,
  Check,
  Power,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  usage_limit_total: number | null;
  usage_limit_per_user: number;
  applicable_to: string;
  target_users: string[] | null;
  is_public: boolean;
  expiry_date: string | null;
  cod_charge_waiver: boolean;
  active: boolean;
  created_at: string;
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (All Customers)' },
  { value: 'newsletter_subscribers', label: 'Newsletter Subscribers' },
  { value: 'pre_launch', label: 'Pre-launch Campaign Subscribers' },
  { value: 'vip_customers', label: 'VIP Customers (High Value)' },
  { value: 'women_only', label: "Women Only (e.g. Women's Day)" },
  { value: 'men_only', label: 'Men Only' },
  { value: 'specific_users', label: 'Specific Users (Email list)' },
];

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_value: '0',
    usage_limit_total: '',
    expiry_date: '',
    applicable_to: 'all',
    target_users_input: '',
    is_public: true,
  });

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/marketing/coupons');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      } else {
        toast.error('Failed to load coupons');
      }
    } catch (e) {
      toast.error('Network error loading coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let targetUsersArray = null;
      if (
        formData.applicable_to === 'specific_users' &&
        formData.target_users_input.trim()
      ) {
        targetUsersArray = formData.target_users_input
          .split(',')
          .map((email) => email.trim())
          .filter((e) => e);
      }

      const payload = {
        code: formData.code,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value || '0'),
        usage_limit_total: formData.usage_limit_total
          ? parseInt(formData.usage_limit_total)
          : null,
        applicable_to: formData.applicable_to,
        target_users: targetUsersArray,
        is_public: formData.is_public,
        expiry_date: formData.expiry_date
          ? new Date(formData.expiry_date).toISOString()
          : null,
      };

      const res = await fetch('/api/admin/marketing/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Coupon created successfully!');
        setShowModal(false);
        fetchCoupons();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (e) {
      toast.error('Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/marketing/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (res.ok) {
        toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
        setCoupons(
          coupons.map((c) =>
            c.id === id ? { ...c, active: !currentStatus } : c
          )
        );
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/marketing/coupons/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Coupon deleted');
        setCoupons(coupons.filter((c) => c.id !== id));
      }
    } catch (e) {
      toast.error('Failed to delete coupon');
    }
  };

  const formatAudience = (coupon: Coupon) => {
    const opt = AUDIENCE_OPTIONS.find((o) => o.value === coupon.applicable_to);
    if (coupon.applicable_to === 'specific_users') {
      return `Specific Users (${coupon.target_users?.length || 0})`;
    }
    return opt?.label || 'All Customers';
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Discount Coupons</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Create targeted discount codes for segments.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700"
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Ticket className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="mb-2 text-sm font-medium text-white">
            No active coupons
          </h3>
          <p className="mx-auto max-w-md text-xs text-slate-500">
            Create discount codes to share with your customers during sales or
            special events.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Discount</th>
                <th className="p-4 font-medium">Audience</th>
                <th className="hidden p-4 font-medium md:table-cell">
                  Min. Order
                </th>
                <th className="p-4 font-medium">Visibility</th>
                <th className="hidden p-4 font-medium lg:table-cell">Expiry</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <span className="font-mono font-bold tracking-wide text-white">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-emerald-400">
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}% OFF`
                      : `₹${coupon.discount_value} OFF`}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      {coupon.applicable_to !== 'all' && (
                        <Users className="h-3.5 w-3.5 text-fuchsia-400" />
                      )}
                      {formatAudience(coupon)}
                    </div>
                  </td>
                  <td className="hidden p-4 md:table-cell">
                    {coupon.min_order_value > 0
                      ? `₹${coupon.min_order_value}`
                      : 'None'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${coupon.is_public ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}
                    >
                      {coupon.is_public ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="hidden p-4 lg:table-cell">
                    {coupon.expiry_date
                      ? new Date(coupon.expiry_date).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${coupon.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}
                    >
                      {coupon.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleStatus(coupon.id, coupon.active)}
                        className="rounded bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10"
                        title={coupon.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power
                          className={`h-3.5 w-3.5 ${coupon.active ? 'text-emerald-400' : 'text-slate-500'}`}
                        />
                      </button>
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="rounded bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative my-8 w-full max-w-lg rounded-xl border border-white/10 bg-[#131726] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">
                Create Targeted Coupon
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-4">
              <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-fuchsia-400">
                    Audience Targeting
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_public: e.target.checked,
                        })
                      }
                      className="cursor-pointer rounded border-white/10 bg-black/50 text-fuchsia-500 focus:ring-fuchsia-500/50"
                    />
                    <span className="text-[10px] font-medium text-slate-300">
                      Public (Visible on site)
                    </span>
                  </label>
                </div>
                <select
                  className="mb-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  value={formData.applicable_to}
                  onChange={(e) =>
                    setFormData({ ...formData, applicable_to: e.target.value })
                  }
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {formData.applicable_to === 'specific_users' && (
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-400">
                      Enter Customer Emails (Comma separated)
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={formData.target_users_input}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_users_input: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                      placeholder="john@example.com, sara@example.com"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm uppercase text-white focus:border-fuchsia-500 focus:outline-none"
                  placeholder="e.g. SUMMER50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Discount Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value,
                      })
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_value: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Min. Order Value (₹) - Optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_order_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_order_value: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Expiry Date - Optional
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save Targeted Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
