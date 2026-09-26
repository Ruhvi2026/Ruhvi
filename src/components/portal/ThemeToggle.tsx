'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { usePortalTheme, ThemeMode } from '@/context/PortalThemeContext';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = usePortalTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current =
    THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[1];
  const Icon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        title="Change theme"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 dark:border-white/10 dark:bg-[#1a1d2e] dark:shadow-black/40">
          {THEME_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <OptIcon
                  className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                />
                {opt.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
