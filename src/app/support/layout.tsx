'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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
  Inbox,
  UserCheck,
  AlertTriangle,
  BarChart2,
  MessageSquare,
  PlusCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NavChild {
  label: string;
  href: string;
}

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

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const userInitial =
    profile?.full_name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'S';
  const userName =
    profile?.full_name || user?.email?.split('@')[0] || 'Support Agent';
  const userEmail = profile?.email || user?.email || '';
  const userRole = profile?.role || 'staff';

  const roleDisplayLabel =
    userRole === 'admin'
      ? 'Administrator'
      : userRole === 'manager'
        ? 'Support Manager'
        : 'Support Executive';

  // Fetch unassigned count for sidebar badge
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/support/team');
        if (res.ok) {
          const data = await res.json();
          setUnassignedCount(data.unassigned_count ?? 0);
        }
      } catch {
        // silent
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(
      `/support/tickets?search=${encodeURIComponent(searchQuery.trim())}`
    );
  };

  const handleQuickAutoAssign = async () => {
    if (isAutoAssigning) return;
    setIsAutoAssigning(true);
    try {
      const res = await fetch('/api/support/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_unassigned: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.assigned_count > 0) {
          toast.success(
            `✨ ${data.assigned_count} tickets auto-assigned by workload!`
          );
        } else {
          toast.success('No unassigned tickets found to distribute');
        }
        setUnassignedCount(0);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to auto-assign');
      }
    } catch {
      toast.error('Auto-assign failed');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const NAV_GROUPS: NavGroup[] = [
    {
      section: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          href: '/support/dashboard',
          icon: LayoutDashboard,
        },
        { label: 'Ticket Queue', href: '/support/tickets', icon: Ticket },
      ],
    },
    {
      section: 'QUEUES & DISPATCH',
      items: [
        {
          label: 'Unassigned',
          href: '/support/tickets?assignee=unassigned',
          icon: Inbox,
          badge:
            unassignedCount && unassignedCount > 0
              ? String(unassignedCount)
              : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          label: 'My Tickets',
          href: '/support/tickets?assignee=me',
          icon: UserCheck,
        },
        {
          label: 'Urgent & SLA',
          href: '/support/tickets?priority=urgent',
          icon: AlertTriangle,
          badge: 'SLA',
          badgeColor: 'bg-rose-500 text-white',
        },
      ],
    },
    {
      section: 'TEAM & OPERATIONS',
      items: [
        { label: 'Team & Workload', href: '/support/team', icon: Users },
        {
          label: 'Analytics & SLA',
          href: '/support/analytics',
          icon: BarChart2,
        },
        {
          label: 'Canned Responses',
          href: '/support/canned-responses',
          icon: MessageSquare,
        },
      ],
    },
    {
      section: 'ACTIONS',
      items: [
        {
          label: 'Create Ticket',
          href: '/support/tickets/new',
          icon: PlusCircle,
        },
      ],
    },
  ];

  function NavLinkItem({ item }: { item: NavItem }) {
    const isExact = pathname === item.href;
    const isChild =
      !item.href.includes('?') && pathname.startsWith(item.href + '/');
    const isActive = isExact || isChild;

    return (
      <Link
        href={item.href}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
        title={collapsed ? item.label : undefined}
      >
        <item.icon
          className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
            isActive
              ? 'text-emerald-400'
              : 'text-slate-500 group-hover:text-slate-300'
          }`}
        />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              item.badgeColor || 'bg-emerald-500 text-white'
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 px-4">
        <Link
          href="/support/dashboard"
          className="flex flex-1 items-center gap-3 overflow-hidden"
        >
          <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-lg border border-emerald-500/30 bg-charcoal-800 shadow-md">
            <Image src="/logo.png" alt="Ruhvi" fill className="object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold leading-none text-white">
                  Ruhvi Support
                </p>
                <span className="py-0.2 rounded border border-emerald-500/20 bg-emerald-500/10 px-1 text-[8px] font-semibold text-emerald-400">
                  CARE
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                Jewellery Concierge Console
              </p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto text-slate-600 transition-colors hover:text-slate-400"
            title="Collapse sidebar"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>

      {/* Auto-Assign Quick Action for Managers in Sidebar */}
      {!collapsed && unassignedCount !== null && unassignedCount > 0 && (
        <div className="mx-3 mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs">
          <div className="flex items-center justify-between text-amber-400">
            <span className="flex items-center gap-1 text-[11px] font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              {unassignedCount} Unassigned
            </span>
          </div>
          <button
            onClick={handleQuickAutoAssign}
            disabled={isAutoAssigning}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            <Zap className="h-3 w-3" />
            {isAutoAssigning ? 'Distributing...' : 'Auto-Distribute Load'}
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLinkItem key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="flex-shrink-0 space-y-1 border-t border-white/5 p-2">
        <Link
          href="https://ruhvi.in"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
          title="View storefront"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>View Store</span>}
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-rose-500/5 hover:text-rose-400"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {!collapsed && (
          <div className="mt-1 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-inner">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-slate-200">
                  {userName}
                </p>
              </div>
              <p className="truncate text-[10px] font-medium text-emerald-400/90">
                {roleDisplayLabel}
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-white/5 hover:text-white"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#0d0f1a] text-slate-200"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-white/5 bg-[#131726] transition-all duration-300 lg:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-64 flex-col border-r border-white/5 bg-[#131726] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 bg-[#131726] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs font-semibold text-slate-400">
              Support Console Workstation
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-md">
                {userInitial}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold leading-tight text-white">
                  {userName}
                </p>
                <p className="text-[10px] leading-none text-emerald-400/90">
                  {roleDisplayLabel}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto bg-[#0d0f1a]">
          <div className="min-h-full p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
