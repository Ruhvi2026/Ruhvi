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

export default function CoFounderPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const [portalMenuOpen, setPortalMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 font-sans text-neutral-100 selection:bg-amber-500 selection:text-neutral-950">
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

        {/* Right: Quick Portals Dropdown, User & Actions */}
        <div className="flex items-center gap-3">
          {/* Portal Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPortalMenuOpen(!portalMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
            >
              <LayoutDashboard size={14} className="text-amber-400" />
              <span>Switch Portal</span>
              <ChevronDown size={13} className="opacity-60" />
            </button>

            {portalMenuOpen && (
              <div
                className="animate-in fade-in slide-in-from-top-2 absolute right-0 z-50 mt-2 w-56 rounded-xl border border-neutral-800 bg-neutral-900 p-1 shadow-2xl duration-150"
                onClick={() => setPortalMenuOpen(false)}
              >
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Ruhvi Subdomains
                </div>
                <a
                  href="https://admin.ruhvi.in/admin/dashboard"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  <LayoutDashboard size={14} className="text-amber-400" />
                  <span>Admin Portal</span>
                </a>
                <a
                  href="https://operation.ruhvi.in/operations/dashboard"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  <Boxes size={14} className="text-blue-400" />
                  <span>Operations</span>
                </a>
                <a
                  href="https://orders.ruhvi.in/portal-orders/dashboard"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  <PackageCheck size={14} className="text-emerald-400" />
                  <span>Orders</span>
                </a>
                <a
                  href="https://support.ruhvi.in/support/tickets"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  <Headphones size={14} className="text-purple-400" />
                  <span>Customer Support</span>
                </a>
                <a
                  href="https://marketing.ruhvi.in/marketing/dashboard"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  <Megaphone size={14} className="text-pink-400" />
                  <span>Marketing</span>
                </a>
                <a
                  href="https://tech.ruhvi.in/tech/dashboard"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  <Globe size={14} className="text-cyan-400" />
                  <span>Tech Portal</span>
                </a>
              </div>
            )}
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
  );
}
