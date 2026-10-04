'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Boxes,
  PackageCheck,
  Headphones,
  Megaphone,
  Globe,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import FloatingStaffMessenger from '@/components/chat/FloatingStaffMessenger';
import { PortalSwitcherDropdown } from '@/components/portal/PortalSwitcherDropdown';
import { PortalThemeProvider } from '@/context/PortalThemeContext';
import { ThemeToggle } from '@/components/portal/ThemeToggle';

export default function CoFounderPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();

  return (
    <PortalThemeProvider>
      <div className="flex min-h-screen flex-col bg-neutral-950 font-sans text-neutral-100 selection:bg-amber-500 selection:text-neutral-950 dark:bg-neutral-950">
        {/* Top Executive Navigation Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-neutral-800/80 bg-neutral-900/60 px-4 backdrop-blur-xl md:px-8">
          {/* Left: Brand & Portal Badge */}
          <div className="flex items-center gap-4">
            <Link href="/co-founder" className="group flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 transition-transform duration-200 group-hover:scale-105">
                <Sparkles className="h-5 w-5 text-neutral-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-wide text-white">
                    RUHVI
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                    Co-Founder
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  co-founder.ruhvi.in
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Quick Portals Dropdown, Theme Toggle, User & Actions */}
          <div className="flex items-center gap-3">
            {/* Portal Switcher Dropdown */}
            <PortalSwitcherDropdown currentPortalId="co-founder" />

            {/* Theme Toggle (Light / Dark / System) */}
            <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900/80 px-1 py-0.5">
              <ThemeToggle />
            </div>

            {/* User Email & Sign Out */}
            {user && (
              <div className="flex items-center gap-3 border-l border-neutral-800 pl-3">
                <span className="hidden text-xs font-medium text-neutral-400 sm:inline-block">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="rounded-lg border border-transparent p-1.5 text-neutral-400 transition-colors hover:border-neutral-800 hover:bg-neutral-900 hover:text-rose-400"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-x-hidden">{children}</main>

        {/* Floating Staff Messenger */}
        <FloatingStaffMessenger />
      </div>
    </PortalThemeProvider>
  );
}
