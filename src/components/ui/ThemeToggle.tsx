'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'system' | 'light' | 'dark';

interface ThemeToggleProps {
  /** 'icon' shows a cycling sun/moon button; 'full' shows all 3 options */
  variant?: 'icon' | 'full';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('theme') as Theme) || 'system';
      setTheme(saved);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    let active = newTheme;
    if (newTheme === 'system') {
      active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.add(active);
  };

  const cycle = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    applyTheme(next);
  };

  if (variant === 'icon') {
    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
    const label =
      theme === 'dark' ? 'Switch to System theme' : theme === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode';

    return (
      <button
        onClick={cycle}
        aria-label={label}
        title={label}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-all duration-300 hover:bg-cream-deep hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${className}`}
      >
        <Sun
          className={`absolute h-4 w-4 transition-all duration-300 ${theme === 'light' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          strokeWidth={1.5}
        />
        <Moon
          className={`absolute h-4 w-4 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          strokeWidth={1.5}
        />
        <Monitor
          className={`absolute h-4 w-4 transition-all duration-300 ${theme === 'system' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          strokeWidth={1.5}
        />
      </button>
    );
  }

  // Full 3-option variant
  return (
    <div className={`flex items-center gap-1 rounded-full border border-gold-200/60 bg-cream-deep/60 p-1 ${className}`}>
      {([
        { value: 'light' as Theme, Icon: Sun, label: 'Light' },
        { value: 'system' as Theme, Icon: Monitor, label: 'System' },
        { value: 'dark' as Theme, Icon: Moon, label: 'Dark' },
      ]).map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => applyTheme(value)}
          aria-label={`${label} mode`}
          aria-pressed={theme === value}
          title={`${label} mode`}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
            theme === value
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-ink-soft hover:text-gold-600'
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
