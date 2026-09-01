'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone, Ticket, Percent, Users } from 'lucide-react';

interface Stat {
  value: string;
  subtitle: string;
}

const emptyStat: Stat = { value: '\u2014', subtitle: 'No data available' };

async function fetchCount(url: string): Promise<number | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data.campaigns)) return data.campaigns.length;
    if (Array.isArray(data.subscribers)) return data.subscribers.length;
    return null;
  } catch {
    return null;
  }
}

export default function MarketingDashboardPage() {
  const [stats, setStats] = useState<Record<string, Stat>>({
    campaigns: emptyStat,
    coupons: emptyStat,
    promotions: emptyStat,
    subscribers: emptyStat,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [campaigns, coupons, promotions, subscribers] = await Promise.all([
        fetchCount('/api/admin/marketing/campaigns'),
        fetchCount('/api/admin/marketing/coupons'),
        fetchCount('/api/admin/marketing/promotions'),
        fetchCount('/api/admin/marketing/subscribers'),
      ]);

      if (cancelled) return;

      setStats({
        campaigns:
          campaigns === null
            ? emptyStat
            : {
                value: campaigns.toLocaleString('en-IN'),
                subtitle: 'Live Brevo campaigns',
              },
        coupons:
          coupons === null
            ? emptyStat
            : {
                value: coupons.toLocaleString('en-IN'),
                subtitle: 'Coupons in store',
              },
        promotions:
          promotions === null
            ? emptyStat
            : {
                value: promotions.toLocaleString('en-IN'),
                subtitle: 'Promotions in store',
              },
        subscribers:
          subscribers === null
            ? emptyStat
            : {
                value: subscribers.toLocaleString('en-IN'),
                subtitle: 'Newsletter & WhatsApp subscribers',
              },
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

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
          <p className="mt-2 text-2xl font-bold text-white">
            {stats.campaigns.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.campaigns.subtitle}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Coupons</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {stats.coupons.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.coupons.subtitle}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Percent className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Live Promotions
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {stats.promotions.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.promotions.subtitle}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Subscribers
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {stats.subscribers.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.subscribers.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
