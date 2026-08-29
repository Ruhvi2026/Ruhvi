'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Admin SLA config page (spec §4.4).
 * Edits per-priority target resolution hours backed by support_sla_config.
 * No code deploy needed to change SLA targets.
 */

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'text-rose-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'normal', label: 'Normal', color: 'text-blue-400' },
  { value: 'low', label: 'Low', color: 'text-slate-400' },
];

export default function SupportSlaConfigPage() {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/support/sla-config');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const map: Record<string, number> = {};
      (json.config || []).forEach((c: any) => {
        map[c.priority] = c.target_hours;
      });
      setConfig(map);
    } catch {
      toast.error('Failed to load SLA config');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/support/sla-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: PRIORITIES.map((p) => ({
            priority: p.value,
            target_hours: config[p.value] ?? 24,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      toast.success('SLA configuration saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">
          Resolution SLA Settings
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Target resolution times per priority. These values drive the SLA
          deadline shown in the support panel — editing them here takes effect
          immediately without a deploy.
        </p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#131726] p-6 shadow-lg">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            SLA Target Hours
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {PRIORITIES.map((p) => (
            <div
              key={p.value}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div>
                <p className={`text-sm font-semibold ${p.color}`}>{p.label}</p>
                <p className="text-[10px] text-slate-500">
                  {config[p.value] ?? '—'} hour(s) to resolve
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={config[p.value] ?? ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      [p.value]: Number(e.target.value),
                    }))
                  }
                  className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">hrs</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
          <p className="flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin-only · changes are recorded on the config rows
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
