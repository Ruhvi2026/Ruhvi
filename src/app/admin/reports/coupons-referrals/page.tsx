'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Tag,
  Share2,
  Percent,
  RefreshCw,
  Coins,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Coupon, Referral } from '@/types/database';

export default function CouponsReferralsReportPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setLoadError(null);

      const supabase = createClient();

      const [couponsRes, referralsRes] = await Promise.all([
        supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (couponsRes.error) {
        console.error('Failed to fetch coupons:', couponsRes.error);
        setLoadError(couponsRes.error.message || 'Failed to load coupons.');
        setCoupons([]);
      } else {
        setCoupons(couponsRes.data ?? []);
      }

      if (referralsRes.error) {
        console.error('Failed to fetch referrals:', referralsRes.error);
        setLoadError(
          (prev) =>
            prev || referralsRes.error?.message || 'Failed to load referrals.'
        );
        setReferrals([]);
      } else {
        setReferrals(referralsRes.data ?? []);
      }
    } catch (err: any) {
      console.error('Error fetching coupons/referrals report:', err);
      setLoadError(err?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.active).length;
  const completedReferrals = referrals.filter(
    (r) => r.status === 'completed'
  ).length;
  const totalCoinsAwarded = referrals.reduce(
    (acc, r) => acc + (Number(r.coins_awarded) || 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-end">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="mb-1 inline-flex items-center space-x-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">
              <Tag className="h-3 w-3" />
              <span>Promotions & Loyalty</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Coupons & Referral Analytics
            </h1>
            <p className="text-xs text-slate-400">
              Track promotional campaigns, discount coupon rules, and referral
              conversion ledgers.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex h-8 items-center space-x-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Load Error Alert */}
      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            Failed to load data from the database: {loadError}
          </span>
          <button
            onClick={fetchData}
            className="ml-4 flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Active Promo Codes
            </span>
            <Tag className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{activeCoupons}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            out of {totalCoupons} configured coupons
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Referral Conversions
            </span>
            <Share2 className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {completedReferrals}
          </p>
          <p className="mt-1 text-[11px] text-indigo-400">
            Successfully verified buyers
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Reward Coins Granted
            </span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">
            🪙 {totalCoinsAwarded.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Awarded for member referrals
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Referral Program Status
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-400">
            Active (500 Coins/Ref)
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Automatic wallet credit enabled
          </p>
        </div>
      </div>

      {/* Coupon Rules Table */}
      <div className="space-y-4 rounded-2xl border border-white/5 bg-[#131726] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            Configured Coupons & Discounts
          </h2>
          <span className="text-[10px] font-semibold text-slate-500">
            {coupons.length} codes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6">Coupon Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Min. Order</th>
                <th className="p-4">Usage Limit</th>
                <th className="p-4">Expiry</th>
                <th className="p-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {coupons.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-xs text-slate-500"
                  >
                    No coupons configured yet.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-white/5">
                    <td className="p-4 pl-6">
                      <span className="font-mono text-xs font-bold text-purple-400">
                        {c.code}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-white">
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}% OFF`
                        : `₹${c.discount_value} FLAT`}
                    </td>
                    <td className="p-4 text-slate-400">
                      ₹{c.min_order_value?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="p-4 text-slate-400">
                      {c.usage_limit_total || 'Unlimited'}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">
                      {c.expiry_date
                        ? new Date(c.expiry_date).toLocaleDateString('en-IN')
                        : 'No Expiry'}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          c.active
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
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
