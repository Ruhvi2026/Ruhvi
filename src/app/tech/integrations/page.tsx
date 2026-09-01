'use client';

import React from 'react';
import {
  Webhook,
  Key,
  ArrowRightLeft,
  Activity,
  ShieldAlert,
  Plus,
  ExternalLink,
} from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-2xl font-bold text-slate-100">
            <Webhook className="h-6 w-6 text-purple-400" />
            Webhooks & APIs
          </h1>
          <p className="mt-1 text-slate-400">
            Manage API keys, webhooks, and third-party integrations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* API Keys */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Key className="h-5 w-5 text-amber-400" />
              API Credentials
            </h2>
            <button className="flex items-center gap-1 text-sm text-purple-400 transition-colors hover:text-purple-300">
              <Plus className="h-4 w-4" /> Generate Key
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Shiprocket Sync Key
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  pk_live_*******************8f92
                </p>
              </div>
              <div className="text-right">
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  Active
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Last used: 2 mins ago
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  EspoCRM Integration
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  sk_live_*******************4a1c
                </p>
              </div>
              <div className="text-right">
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  Active
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Last used: 1 hr ago
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950 p-4 opacity-60">
              <div>
                <p className="text-sm font-medium text-slate-200 line-through">
                  Legacy Payment Webhook
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  sk_live_*******************99x2
                </p>
              </div>
              <div className="text-right">
                <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
                  Revoked
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Endpoints */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <ArrowRightLeft className="h-5 w-5 text-blue-400" />
              Configured Webhooks
            </h2>
            <button className="flex items-center gap-1 text-sm text-purple-400 transition-colors hover:text-purple-300">
              <Plus className="h-4 w-4" /> Add Endpoint
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Shiprocket Order Tracking
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    https://api.ruhvi.in/webhooks/shiprocket
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  order.shipped
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  order.delivered
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/50 bg-slate-950 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Razorpay Payments
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    https://api.ruhvi.in/webhooks/razorpay
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  payment.captured
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  payment.failed
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-amber-500/30 border-slate-800/50 bg-slate-950 p-4">
              <div className="absolute left-0 top-0 h-full w-1 bg-amber-500"></div>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Supabase Auth Sync
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    https://api.ruhvi.in/webhooks/auth
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <p className="mt-2 text-xs text-amber-500">
                Warning: 12 failed deliveries in the last hour.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
