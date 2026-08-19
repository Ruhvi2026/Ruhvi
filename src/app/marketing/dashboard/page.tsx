import React from 'react';
import { Megaphone, Ticket, Percent, Users } from 'lucide-react';

export default function MarketingDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Marketing Hub</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Overview of marketing performance and active campaigns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-fuchsia-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Active Campaigns
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">4</p>
          <p className="mt-1 text-xs text-slate-500">
            Brevo & Meta currently running
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Coupon Usage</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">128</p>
          <p className="mt-1 text-xs text-slate-500">Redeemed this week</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Percent className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Live Promotions
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">1</p>
          <p className="mt-1 text-xs text-slate-500">Sitewide Sale</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Subscribers
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">12,492</p>
          <p className="mt-1 text-xs text-emerald-400">+14% vs last month</p>
        </div>
      </div>
    </div>
  );
}
