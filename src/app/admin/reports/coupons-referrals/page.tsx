'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag, Share2, Award, Percent } from 'lucide-react';

const COUPON_STATS = [
  { code: 'WELCOME10', usages: 42, totalDiscount: 18500, status: 'Active' },
  { code: 'WEDDING25', usages: 15, totalDiscount: 45000, status: 'Active' },
  { code: 'FESTIVE500', usages: 8, totalDiscount: 4000, status: 'Expired' },
];

export default function CouponsReferralsReportPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Coupons & Referral Analytics</h1>
            <p className="text-xs text-stone-500 mt-1">Track promotional campaigns, coin redemptions, and referral conversions</p>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Coupons Used</span>
            <Tag className="w-5 h-5 text-amber-900" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">65 Redemptions</p>
          <p className="text-xs text-stone-400">across all active promotions</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Referral Conversions</span>
            <Share2 className="w-5 h-5 text-indigo-700" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">28 New Customers</p>
          <p className="text-xs text-emerald-600 font-semibold">500 coins granted per successful referral</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Discount Given</span>
            <Percent className="w-5 h-5 text-rose-700" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">₹67,500</p>
          <p className="text-xs text-stone-400">Coupon + Wallet cashback combined</p>
        </div>
      </div>

      {/* Coupon Performance Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
        <h2 className="font-serif text-lg font-bold text-stone-900">Coupon Campaign Breakdown</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Total Redemptions</th>
                <th className="py-3 px-4">Total Discount Saved</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {COUPON_STATS.map((c, idx) => (
                <tr key={idx} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-stone-900">{c.code}</td>
                  <td className="py-3 px-4 text-stone-700">{c.usages} times</td>
                  <td className="py-3 px-4 font-semibold text-stone-900">₹{c.totalDiscount.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                      c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
