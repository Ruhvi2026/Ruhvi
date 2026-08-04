'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Tag, Plus, Search, RefreshCw, X, Check, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_value: number;
  max_discount?: number;
  max_uses?: number;
  uses_count: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  min_order_value: '',
  max_discount: '',
  max_uses: '',
  valid_until: '',
  is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchCoupons(); }, []);

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
        type: form.type,
        value: parseFloat(form.value),
        min_order_value: parseFloat(form.min_order_value) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
        uses_count: 0,
      };
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) throw error;
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon. Make sure the coupons table exists in Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const supabase = createClient();
      await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
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

  const filtered = useMemo(() =>
    coupons.filter((c) => c.code.toLowerCase().includes(search.toLowerCase())),
    [coupons, search]
  );

  const totalDiscount = coupons.reduce((s, c) => {
    if (c.type === 'fixed') return s + c.value * c.uses_count;
    return s;
  }, 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Coupons & Offers</h1>
          <p className="text-slate-500 text-xs mt-0.5">{coupons.length} coupon codes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Coupon
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Coupons', value: coupons.length.toString(), color: 'text-white' },
          { label: 'Active Coupons', value: coupons.filter((c) => c.is_active).length.toString(), color: 'text-emerald-400' },
          { label: 'Total Times Used', value: coupons.reduce((s, c) => s + c.uses_count, 0).toString(), color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#131726] border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search coupon code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Coupons Table */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading coupons...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No coupons found</p>
            <p className="text-slate-600 text-xs mt-1">Create your first coupon using the button above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Code</th>
                  <th className="px-5 py-3 text-left font-semibold">Discount</th>
                  <th className="px-5 py-3 text-left font-semibold">Min Order</th>
                  <th className="px-5 py-3 text-left font-semibold">Uses</th>
                  <th className="px-5 py-3 text-left font-semibold">Expires</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-emerald-400 tracking-wider text-sm">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-200 font-semibold">
                      {coupon.type === 'percentage'
                        ? `${coupon.value}% OFF`
                        : `₹${coupon.value.toLocaleString('en-IN')} OFF`}
                      {coupon.max_discount && (
                        <span className="text-slate-500 ml-1 font-normal">
                          (max ₹{coupon.max_discount.toLocaleString('en-IN')})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {coupon.min_order_value > 0 ? `₹${coupon.min_order_value.toLocaleString('en-IN')}` : 'No minimum'}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {coupon.uses_count}
                      {coupon.max_uses && <span className="text-slate-600"> / {coupon.max_uses}</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {coupon.valid_until
                        ? new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleActive(coupon)} className="flex items-center gap-1.5">
                        {coupon.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-500">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1f35] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Create New Coupon</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Coupon Code *
                  </label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WELCOME10"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="percentage" className="bg-[#1a1f35]">Percentage (%)</option>
                    <option value="fixed" className="bg-[#1a1f35]">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Value *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percentage' ? '10' : '500'}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_order_value}
                    onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    placeholder="No limit"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <label htmlFor="is_active" className="text-xs text-slate-300 font-medium">
                    Activate coupon immediately
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
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
