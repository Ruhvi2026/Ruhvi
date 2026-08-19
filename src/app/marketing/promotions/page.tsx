'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  X,
  Loader2,
  Check,
  Power,
  Trash2,
  CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Promotion {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  applicable_to: string;
  created_at: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: '',
    end_date: '',
    applicable_to: 'all',
  });

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/admin/marketing/promotions');
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      } else {
        toast.error('Failed to load promotions');
      }
    } catch (e) {
      toast.error('Network error loading promotions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        applicable_to: formData.applicable_to,
        start_date: formData.start_date
          ? new Date(formData.start_date).toISOString()
          : null,
        end_date: formData.end_date
          ? new Date(formData.end_date).toISOString()
          : null,
      };

      const res = await fetch('/api/admin/marketing/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Promotion created successfully!');
        setShowModal(false);
        fetchPromotions();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (e) {
      toast.error('Failed to create promotion');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/marketing/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (res.ok) {
        toast.success(
          `Promotion ${!currentStatus ? 'activated' : 'deactivated'}`
        );
        setPromotions(
          promotions.map((p) =>
            p.id === id ? { ...p, active: !currentStatus } : p
          )
        );
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      const res = await fetch(`/api/admin/marketing/promotions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Promotion deleted');
        setPromotions(promotions.filter((p) => p.id !== id));
      }
    } catch (e) {
      toast.error('Failed to delete promotion');
    }
  };

  const isActiveDate = (start: string | null, end: string | null) => {
    if (!start && !end) return true;
    const now = new Date();
    if (start && new Date(start) > now) return false;
    if (end && new Date(end) < now) return false;
    return true;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Promotions & Offers</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage automatic sitewide discounts.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700"
        >
          <Plus className="h-4 w-4" />
          Create Promotion
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Tag className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="mb-2 text-sm font-medium text-white">
            No active promotions
          </h3>
          <p className="mx-auto max-w-md text-xs text-slate-500">
            Create automatic discounts that apply to all orders during a
            specific date range.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Discount</th>
                <th className="hidden p-4 font-medium md:table-cell">
                  Duration
                </th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {promotions.map((promo) => {
                const isCurrentlyRunning = isActiveDate(
                  promo.start_date,
                  promo.end_date
                );

                return (
                  <tr
                    key={promo.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="p-4">
                      <span className="font-semibold tracking-wide text-white">
                        {promo.name}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-amber-400">
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value}% OFF`
                        : `₹${promo.discount_value} OFF`}
                    </td>
                    <td className="hidden p-4 md:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                        {promo.start_date
                          ? new Date(promo.start_date).toLocaleDateString()
                          : 'Forever'}
                        {' - '}
                        {promo.end_date
                          ? new Date(promo.end_date).toLocaleDateString()
                          : 'Forever'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${promo.active && isCurrentlyRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}
                      >
                        {promo.active
                          ? isCurrentlyRunning
                            ? 'Running'
                            : 'Scheduled/Expired'
                          : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(promo.id, promo.active)}
                          className="rounded bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10"
                          title={promo.active ? 'Disable' : 'Enable'}
                        >
                          <Power
                            className={`h-3.5 w-3.5 ${promo.active ? 'text-emerald-400' : 'text-slate-500'}`}
                          />
                        </button>
                        <button
                          onClick={() => deletePromotion(promo.id)}
                          className="rounded bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <div className="relative my-8 w-full max-w-md rounded-xl border border-white/10 bg-[#131726] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">
                Create Promotion
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Promotion Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  placeholder="e.g. Diwali Sitewide Sale"
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
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
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
                  Save Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
