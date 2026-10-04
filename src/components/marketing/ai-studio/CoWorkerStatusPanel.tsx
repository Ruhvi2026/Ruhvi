'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CoWorkerConfigState } from '@/lib/ai/co-founder/workers/marketing/config';
import { MarketingCoWorkerId } from '@/lib/ai/co-founder/workers/marketing/types';

export const CoWorkerStatusPanel: React.FC = () => {
  const [coWorkers, setCoWorkers] = useState<CoWorkerConfigState[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/admin/marketing/co-workers');
      if (res.ok) {
        const data = await res.json();
        setCoWorkers(data.coWorkers || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleToggle = async (coWorkerId: MarketingCoWorkerId, currentStatus: string) => {
    const nextStatus = currentStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    setTogglingId(coWorkerId);

    try {
      const res = await fetch('/api/admin/marketing/co-workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coWorkerId, status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      setCoWorkers((prev) =>
        prev.map((c) => (c.id === coWorkerId ? { ...c, status: nextStatus } : c))
      );
      toast.success(`${coWorkerId} is now ${nextStatus}!`);
    } catch (err: any) {
      toast.error(err.message || 'Error updating co-worker status');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center gap-2 text-xs text-stone-400">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span>Loading Marketing Co-Workers Registry...</span>
      </div>
    );
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Marketing Co-Workers Registry</span>
          </div>
          <h3 className="text-base font-bold text-stone-100">
            Active & Production-Only Co-Workers
          </h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
          {coWorkers.filter((c) => c.status === 'ENABLED').length} of {coWorkers.length} Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coWorkers.map((cw) => {
          const isEnabled = cw.status === 'ENABLED';
          const isToggling = togglingId === cw.id;

          return (
            <div
              key={cw.id}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                isEnabled
                  ? 'bg-stone-950 border-amber-500/30'
                  : 'bg-stone-950/50 border-stone-800/80 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-stone-100">{cw.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {cw.status}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2 mb-3">
                  {cw.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                <span className="text-[10px] text-stone-400 font-mono">
                  {cw.isProductionOnly ? 'Production-Only' : 'Active Ecosystem'}
                </span>

                <button
                  onClick={() => handleToggle(cw.id, cw.status)}
                  disabled={isToggling}
                  className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white transition disabled:opacity-50"
                >
                  {isToggling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isEnabled ? (
                    <ToggleRight className="w-5 h-5 text-amber-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-stone-600" />
                  )}
                  <span className="text-[11px]">{isEnabled ? 'Disable' : 'Enable'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
