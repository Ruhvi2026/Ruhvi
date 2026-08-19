import React from 'react';
import {
  Target,
  TrendingDown,
  Megaphone,
  Mail,
  MousePointerClick,
} from 'lucide-react';

export default function MarketingDashboard() {
  // Mock data for the sprint placeholder
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-pink-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Ad Spend
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">₹45,200</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
            <TrendingDown className="h-3 w-3" /> 12% vs last month
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Overall ROI</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">3.4x</p>
          <p className="mt-1 text-xs text-emerald-400">Excellent performance</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <MousePointerClick className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Cost Per Acquisition
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">₹850</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Email Open Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">24.5%</p>
          <p className="mt-1 text-xs text-slate-500">Brevo Integration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Active Campaigns Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  Diwali Festive Collection (Meta)
                </p>
                <p className="text-xs text-slate-400">
                  ROI: 4.2x | Spend: ₹12k
                </p>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
                Performing Well
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <div>
                <p className="text-sm font-medium text-amber-400">
                  Bridal Retargeting (Google)
                </p>
                <p className="text-xs text-slate-400">ROI: 1.8x | Spend: ₹8k</p>
              </div>
              <span className="rounded bg-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">
                Average
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
              <div>
                <p className="text-sm font-medium text-rose-400">
                  Cold Audience Lookalike (Meta)
                </p>
                <p className="text-xs text-slate-400">ROI: 0.6x | Spend: ₹5k</p>
              </div>
              <span className="rounded bg-rose-500/20 px-2 py-1 text-[10px] font-bold uppercase text-rose-300">
                Stop Suggested
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Integrations Status
          </h3>
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>{' '}
                Meta Ads API
              </span>
              <span className="text-xs text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>{' '}
                Google Ads API
              </span>
              <span className="text-xs text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>{' '}
                Brevo Webhook
              </span>
              <span className="text-xs text-emerald-400">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
