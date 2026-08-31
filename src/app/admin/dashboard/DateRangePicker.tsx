'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Calendar, ChevronDown } from 'lucide-react';

export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

interface DateRangePickerProps {
  from: string;
  to: string;
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: 'custom', label: 'Custom' },
];

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today': {
      return { from: toStr, to: toStr };
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split('T')[0], to: toStr };
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().split('T')[0], to: toStr };
    }
    case '90d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 89);
      return { from: d.toISOString().split('T')[0], to: toStr };
    }
    default:
      return { from: toStr, to: toStr };
  }
}

function detectPreset(from: string, to: string): DatePreset {
  const now = new Date();
  const toStr = now.toISOString().split('T')[0];
  if (to !== toStr) return 'custom';

  const fromDate = new Date(from);
  const diff = Math.round(
    (now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return 'today';
  if (diff === 6) return '7d';
  if (diff === 29) return '30d';
  if (diff === 89) return '90d';
  return 'custom';
}

export default function DateRangePicker({ from, to }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const activePreset = detectPreset(from, to);

  function navigate(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', newFrom);
    params.set('to', newTo);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handlePreset(preset: DatePreset) {
    if (preset === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const range = getPresetRange(preset);
    navigate(range.from, range.to);
  }

  function handleCustomApply() {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;
    navigate(customFrom, customTo);
    setShowCustom(false);
  }

  const displayRange = `${new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — ${new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Preset Buttons */}
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#131726] p-1">
        {PRESETS.map((preset) => {
          const isActive =
            preset.id !== 'custom'
              ? activePreset === preset.id
              : activePreset === 'custom' || showCustom;
          return (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset.id)}
              disabled={isPending}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Current Range Display */}
      <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-[#131726] px-3 py-1.5 text-[11px] text-slate-400">
        <Calendar className="h-3.5 w-3.5 text-emerald-400" />
        <span>{displayRange}</span>
        {isPending && (
          <span className="ml-1 h-3 w-3 animate-spin rounded-full border border-emerald-500 border-t-transparent" />
        )}
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#131726] p-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              From
            </label>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              To
            </label>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo || customFrom > customTo}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            Apply
          </button>
          <button
            onClick={() => setShowCustom(false)}
            className="text-[11px] text-slate-500 hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
