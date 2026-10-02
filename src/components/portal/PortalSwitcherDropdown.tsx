'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Boxes,
  PackageCheck,
  Headphones,
  Megaphone,
  Globe,
  ChevronDown,
  ExternalLink,
  Check,
} from 'lucide-react';

export interface PortalOption {
  id: string;
  name: string;
  subdomain: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export const PORTAL_OPTIONS: PortalOption[] = [
  {
    id: 'co-founder',
    name: 'AI Co-Founder',
    subdomain: 'co-founder.ruhvi.in',
    href: 'https://co-founder.ruhvi.in/co-founder',
    badge: 'AI Executive',
    badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    icon: Sparkles,
    iconColor: 'text-amber-400',
  },
  {
    id: 'admin',
    name: 'Admin Portal',
    subdomain: 'admin.ruhvi.in',
    href: 'https://admin.ruhvi.in/admin/dashboard',
    badge: 'Core Admin',
    badgeColor:
      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    icon: LayoutDashboard,
    iconColor: 'text-emerald-400',
  },
  {
    id: 'operations',
    name: 'Operations',
    subdomain: 'operation.ruhvi.in',
    href: 'https://operation.ruhvi.in/operations/dashboard',
    icon: Boxes,
    iconColor: 'text-blue-400',
  },
  {
    id: 'orders',
    name: 'Orders Portal',
    subdomain: 'orders.ruhvi.in',
    href: 'https://orders.ruhvi.in/portal-orders/dashboard',
    icon: PackageCheck,
    iconColor: 'text-emerald-400',
  },
  {
    id: 'support',
    name: 'Customer Support',
    subdomain: 'support.ruhvi.in',
    href: 'https://support.ruhvi.in/support/tickets',
    icon: Headphones,
    iconColor: 'text-purple-400',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    subdomain: 'marketing.ruhvi.in',
    href: 'https://marketing.ruhvi.in/marketing/dashboard',
    icon: Megaphone,
    iconColor: 'text-pink-400',
  },
  {
    id: 'tech',
    name: 'Tech Portal',
    subdomain: 'tech.ruhvi.in',
    href: 'https://tech.ruhvi.in/tech/dashboard',
    icon: Globe,
    iconColor: 'text-cyan-400',
  },
];

interface PortalSwitcherDropdownProps {
  currentPortalId?: string;
}

export function PortalSwitcherDropdown({
  currentPortalId = 'admin',
}: PortalSwitcherDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/10"
        title="Switch Subdomain Portal (Ruhvi Portals)"
      >
        <LayoutDashboard className="h-3.5 w-3.5 text-amber-500" />
        <span className="hidden sm:inline">Switch Portal</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl duration-150 dark:border-white/10 dark:bg-[#131726]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Ruhvi Portals & Subdomains
            </span>
          </div>

          <div className="mt-1 space-y-0.5">
            {PORTAL_OPTIONS.map((portal) => {
              const Icon = portal.icon;
              const isCurrent = portal.id === currentPortalId;

              return (
                <a
                  key={portal.id}
                  href={portal.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-amber-500/10 font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${portal.iconColor}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{portal.name}</span>
                        {portal.badge && (
                          <span
                            className={`py-0.2 rounded px-1.5 text-[9px] font-bold ${
                              portal.badgeColor ||
                              'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                            }`}
                          >
                            {portal.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {portal.subdomain}
                      </p>
                    </div>
                  </div>
                  {isCurrent ? (
                    <Check className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <ExternalLink className="h-3 w-3 opacity-30" />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
