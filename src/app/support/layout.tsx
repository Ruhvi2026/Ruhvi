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
  Headphones,
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
          badgeColor:
            'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]',
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
          badgeColor:
            'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]',
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
        className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-300 ${
          isActive ? 'text-white' : 'text-slate-400 hover:text-white'
        }`}
        title={collapsed ? item.label : undefined}
      >
        {isActive && (
          <div className="absolute inset-0 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/20 to-cyan-500/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
        )}
        {!isActive && (
          <div className="absolute inset-0 rounded-xl bg-white/0 transition-colors group-hover:bg-white/5" />
        )}
        <item.icon
          className={`relative z-10 h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
            isActive
              ? 'text-indigo-400'
              : 'text-slate-500 group-hover:text-slate-300'
          }`}
        />
        {!collapsed && (
          <span className="relative z-10 flex-1 truncate tracking-wide">
            {item.label}
          </span>
        )}
        {!collapsed && item.badge && (
          <span
            className={`relative z-10 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
              item.badgeColor || 'bg-indigo-500 text-white'
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#080B14]">
      {/* Brand Header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/5 bg-white/[0.01] px-4 backdrop-blur-md">
        <Link
          href="/support/dashboard"
          className="flex flex-1 items-center gap-3 overflow-hidden"
        >
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Headphones className="h-4 w-4 text-indigo-400" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold tracking-wide text-white">
                  Ruhvi Support
                </p>
              </div>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-widest text-indigo-400/80">
                Helpdesk Console
              </p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Collapse sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          </button>
        )}
      </div>

      {/* Auto-Assign Quick Action for Managers in Sidebar */}
      {!collapsed && unassignedCount !== null && unassignedCount > 0 && (
        <div className="relative mx-4 mt-5 overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="absolute right-0 top-0 p-2 opacity-20">
            <Sparkles className="h-12 w-12 text-indigo-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between text-indigo-300">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                {unassignedCount} Unassigned
              </span>
            </div>
            <button
              onClick={handleQuickAutoAssign}
              disabled={isAutoAssigning}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-2 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              {isAutoAssigning ? 'Distributing...' : 'Auto-Distribute Load'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500/80">
                {group.section}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLinkItem key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="flex-shrink-0 border-t border-white/5 bg-white/[0.02] p-3 backdrop-blur-md">
        <Link
          href="https://ruhvi.in"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          title="View storefront"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>View Storefront</span>}
        </Link>

        {!collapsed && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0d0f1a] p-2 shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-cyan-600 text-xs font-bold text-white shadow-md">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-slate-200">
                  {userName}
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wider text-indigo-400/80">
                  {roleDisplayLabel}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-2 flex w-full items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
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
      className="flex h-screen overflow-hidden bg-[#0A0D16] text-slate-200 selection:bg-indigo-500/30"
      style={{
        fontFamily: 'Outfit, Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-white/5 bg-[#080B14] shadow-2xl transition-all duration-300 lg:flex ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-72 flex-col border-r border-white/10 bg-[#080B14] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0A0D16] to-[#0A0D16]">
        {/* Mobile menu trigger */}
        <button
          className="absolute left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#080B14]/80 text-slate-400 shadow-xl backdrop-blur-md transition-all hover:text-white lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Top Header (Desktop) - Optional Global Search */}
        <header className="hidden h-16 w-full items-center justify-end px-8 lg:flex">
          <form onSubmit={handleGlobalSearch} className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search tickets (ID, email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/5 py-1.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 backdrop-blur-sm transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </form>
        </header>

        {/* Page Body */}
        <main className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="min-h-full p-4 pt-16 sm:p-6 lg:p-8 lg:pt-4">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
