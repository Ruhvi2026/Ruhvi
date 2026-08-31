'use client';

import React, { useState } from 'react';
import { ToggleLeft, Zap, Users, Filter, Plus, Save } from 'lucide-react';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState([
    {
      id: '1',
      name: 'enable_ai_chatbot',
      description: 'Enable the new generative AI chatbot for customer support.',
      enabled: true,
      rollout: '100%',
      env: 'production',
    },
    {
      id: '2',
      name: 'new_checkout_flow',
      description: 'Test the optimized one-page checkout.',
      enabled: true,
      rollout: '25%',
      env: 'production',
    },
    {
      id: '3',
      name: 'loyalty_program',
      description: 'Show loyalty points and rewards in customer dashboard.',
      enabled: false,
      rollout: '0%',
      env: 'staging',
    },
  ]);

  const toggleFlag = (id: string) => {
    setFlags(
      flags.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-2xl font-bold text-slate-100">
            <ToggleLeft className="h-6 w-6 text-emerald-400" />
            Feature Flags
          </h1>
          <p className="mt-1 text-slate-400">
            Safely roll out new features and manage A/B tests.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20">
          <Plus className="h-4 w-4" /> Create Flag
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 p-4">
          <div className="flex gap-2">
            <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
              All Flags
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300">
              Production
            </button>
            <button className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300">
              Staging
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-slate-800/30 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="font-mono font-medium text-slate-200">
                    {flag.name}
                  </h3>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${
                      flag.env === 'production'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {flag.env}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{flag.description}</p>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="mb-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                    <Users className="h-3 w-3" /> Rollout
                  </p>
                  <p className="text-sm font-medium text-slate-300">
                    {flag.rollout}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <button
                    onClick={() => toggleFlag(flag.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${flag.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                  <span
                    className={`mt-1 text-xs font-medium ${flag.enabled ? 'text-emerald-400' : 'text-slate-500'}`}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
