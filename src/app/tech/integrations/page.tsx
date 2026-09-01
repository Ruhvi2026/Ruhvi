'use client';

import React from 'react';
import { Webhook, Key, ArrowRightLeft, Plus } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
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
        <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Key className="h-5 w-5 text-amber-400" />
              API Credentials
            </h2>
            <button className="flex items-center gap-1 text-sm text-purple-400 transition-colors hover:text-purple-300">
              <Plus className="h-4 w-4" /> Generate Key
            </button>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 py-12 text-center">
            <Key className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm font-medium text-slate-400">
              No API credentials configured.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Generate a key to connect external services.
            </p>
          </div>
        </div>

        {/* Webhook Endpoints */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <ArrowRightLeft className="h-5 w-5 text-blue-400" />
              Configured Webhooks
            </h2>
            <button className="flex items-center gap-1 text-sm text-purple-400 transition-colors hover:text-purple-300">
              <Plus className="h-4 w-4" /> Add Endpoint
            </button>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 py-12 text-center">
            <ArrowRightLeft className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm font-medium text-slate-400">
              No webhook endpoints configured.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add an endpoint to receive event notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
