'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Search,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Home,
  Bell,
  Settings,
  Inbox,
  UserCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/support/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'TICKETS',
    items: [
      { label: 'All Tickets', href: '/support/tickets', icon: Ticket },
      {
        label: 'My Tickets',
        href: '/support/tickets?assignee=me',
        icon: UserCheck,
      },
      {
        label: 'Unassigned',
        href: '/support/tickets?assignee=unassigned',
        icon: Inbox,
      },
    ],
  },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href ||
    pathname.startsWith(item.href.split('?')[0] + '/');

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
        isActive
          ? 'bg-amber-500/10 text-amber-400'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${
            item.badgeColor || 'bg-amber-500'
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'S';
  const userEmail = user?.email || '';

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-white/5 px-4">
        <Link
          href="/support/dashboard"
          className="flex flex-1 items-center gap-3 overflow-hidden"
        >
          <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-lg border border-white/20 bg-charcoal-800 shadow-md">
            <Image src="/logo.png" alt="Ruhvi" fill className="object-cover" />
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold leading-none text-white">
              Ruhvi Support
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              Customer Care Console
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 space-y-1 border-t border-white/5 p-2">
        <Link
          href="https://ruhvi.in"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          <span>View Store</span>
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-rose-500/5 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
        <div className="mt-1 flex items-center gap-3 px-3 py-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
            {userInitial}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-medium text-slate-300">
              Support Executive
            </p>
            <p className="truncate text-[10px] text-slate-600">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#0d0f1a]"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-white/5 bg-[#131726] lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-60 flex-col border-r border-white/5 bg-[#131726]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-20 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 bg-[#131726] px-4">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-400 transition-colors hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search tickets, customers..."
                className="w-72 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 transition-all focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#0d0f1a]">
          <div className="min-h-full p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
