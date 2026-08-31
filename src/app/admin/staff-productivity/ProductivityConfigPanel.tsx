'use client';

import React, { useState, useEffect } from 'react';
import { Settings2, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface DesignationKpi {
  min_orders: number;
  min_tickets: number;
  max_response_hours: number;
  min_activity_actions: number;
  min_inventory_movements: number;
}

interface ProductivityConfig {
  negligence_threshold_days: number;
  designation_kpis: Record<string, DesignationKpi>;
}

const DESIGNATION_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  operations_manager: 'Operations Manager',
  orders_manager: 'Orders Manager',
  support_manager: 'Support Manager',
  operations_staff: 'Operations Staff',
  orders_staff: 'Orders Staff',
  support_staff: 'Support Staff',
};

const KPI_FIELDS: { key: keyof DesignationKpi; label: string; unit: string; hint: string }[] = [
  { key: 'min_orders', label: 'Min Orders Handled', unit: 'orders', hint: 'Minimum orders processed in the period' },
  { key: 'min_tickets', label: 'Min Tickets Closed', unit: 'tickets', hint: 'Minimum support tickets resolved/closed' },
  { key: 'max_response_hours', label: 'Max Response Time', unit: 'hrs', hint: 'Maximum acceptable avg first response time (0 = not applicable)' },
  { key: 'min_activity_actions', label: 'Min Activity Actions', unit: 'actions', hint: 'Minimum audit log entries in the period' },
  { key: 'min_inventory_movements', label: 'Min Inventory Movements', unit: 'moves', hint: 'Operations roles: minimum inventory actions (0 = not applicable)' },
];

export default function ProductivityConfigPanel() {
  const [config, setConfig] = useState<ProductivityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/admin/productivity-config');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setConfig(json.config);
    } catch {
      toast.error('Failed to load productivity config');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/productivity-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      toast.success('Productivity config saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  }

  function updateNegligence(val: number) {
    if (!config) return;
    setConfig({ ...config, negligence_threshold_days: val });
  }

  function updateKpi(
    role: string,
    field: keyof DesignationKpi,
    val: number
  ) {
    if (!config) return;
    setConfig({
      ...config,
      designation_kpis: {
        ...config.designation_kpis,
        [role]: {
          ...config.designation_kpis[role],
          [field]: val,
        },
      },
    });
  }

  if (loading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#131726] p-4 text-xs text-slate-500">
        Config not loaded. Run migration 0075 first.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-[#131726]">
      {/* Header — click to expand/collapse */}
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            Productivity Thresholds &amp; Config
          </h3>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            Super Admin Only
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-5 pb-5">
          {/* Global: Negligence threshold */}
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Global Settings
            </p>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  Negligence Threshold
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Flag staff as ⚠ Negligent if no activity for this many days
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={config.negligence_threshold_days}
                  onChange={(e) =>
                    updateNegligence(Math.max(1, Number(e.target.value)))
                  }
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">days</span>
              </div>
            </div>
          </div>

          {/* Per-designation KPIs */}
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              KPI Thresholds by Designation
            </p>
            <p className="mb-3 text-[11px] text-slate-600">
              These thresholds determine 🟢 / 🟡 / 🔴 status for each staff
              member based on their role. Thresholds are per the selected date
              range period.
            </p>
            <div className="space-y-2">
              {Object.entries(config.designation_kpis).map(([role, kpis]) => (
                <div
                  key={role}
                  className="overflow-hidden rounded-xl border border-white/5"
                >
                  <button
                    className="flex w-full items-center justify-between bg-white/[0.02] px-4 py-3 text-left"
                    onClick={() =>
                      setExpandedRole(expandedRole === role ? null : role)
                    }
                  >
                    <span className="text-xs font-semibold text-slate-300">
                      {DESIGNATION_LABELS[role] || role}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-600">
                        {kpis.min_orders}+ orders · {kpis.min_tickets}+ tickets ·{' '}
                        {kpis.max_response_hours === 0
                          ? 'N/A'
                          : `≤${kpis.max_response_hours}hr`}{' '}
                        response
                      </span>
                      {expandedRole === role ? (
                        <ChevronUp className="h-3 w-3 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                      )}
                    </div>
                  </button>
                  {expandedRole === role && (
                    <div className="grid grid-cols-1 gap-3 bg-[#131726] px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                      {KPI_FIELDS.map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                            {field.label}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={kpis[field.key]}
                              onChange={(e) =>
                                updateKpi(
                                  role,
                                  field.key,
                                  Math.max(0, Number(e.target.value))
                                )
                              }
                              className="w-24 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-[10px] text-slate-600">
                              {field.unit}
                            </span>
                          </div>
                          <p className="mt-1 text-[9px] text-slate-700">
                            {field.hint}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
            <button
              onClick={fetchConfig}
              disabled={loading || saving}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
