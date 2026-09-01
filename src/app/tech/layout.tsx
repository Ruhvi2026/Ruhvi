'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Activity,
  Server,
  Users,
  FileText,
  PenTool,
  Globe,
  ToggleLeft,
  Webhook,
  KeyRound,
  Wand2,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
  Bell,
  Search,
  Code2,
  Settings,
} from 'lucide-react';

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  children?: NavChild[];
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'CONTROL CENTER',
    items: [
      { label: 'Dashboard', href: '/tech/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', href: '/tech/analytics', icon: Activity },
      { label: 'Sentry Logs', href: '/tech/sentry', icon: Server },
    ],
  },
  {
    section: 'ACCESS CONTROL',
    items: [
      { label: 'Identity & Access', href: '/tech/iam', icon: Users },
      { label: 'Audit Logs', href: '/tech/audit-logs', icon: FileText },
    ],
  },
  {
    section: 'CONTENT',
    items: [
      { label: 'Website Design', href: '/tech/design', icon: PenTool },
      { label: 'SEO Control Suite', href: '/tech/seo', icon: Globe },
    ],
  },
  {
    section: 'DEVELOPER TOOLS',
    items: [
      { label: 'Feature Flags', href: '/tech/feature-flags', icon: ToggleLeft },
      { label: 'Webhooks & APIs', href: '/tech/integrations', icon: Webhook },
      { label: 'API Keys', href: '/tech/api-keys', icon: KeyRound },
      { label: 'AI Control Center', href: '/tech/ai-settings', icon: Wand2 },
    ],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const hasActiveChild =
    item.children?.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + '/')
    ) ?? false;

  const [open, setOpen] = useState(hasActiveChild);

  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + '/')
    : hasActiveChild;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
            isActive
              ? 'bg-tech-primary/10 font-semibold text-tech-primary'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-500 dark:text-tech-textSecondary dark:hover:bg-gray-50 dark:hover:text-tech-text'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {open ? (
                <ChevronDown className="h-3 w-3 opacity-60" />
              ) : (
                <ChevronRight className="h-3 w-3 opacity-60" />
              )}
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-7 mt-1 space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-200 dark:border-white/10">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={`block rounded px-2 py-1.5 text-[11px] transition-colors ${
                  pathname === child.href ||
                  pathname.startsWith(child.href + '/')
                    ? 'font-semibold text-tech-primary'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600 dark:hover:text-slate-900'
                }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
        isActive
          ? 'bg-tech-primary/10 font-semibold text-tech-primary'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-500 dark:text-tech-textSecondary dark:hover:bg-gray-50 dark:hover:text-tech-text'
      }`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="rounded-full bg-tech-primary px-1.5 py-0.5 text-[9px] font-bold text-slate-900 dark:text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function TechSidebarContent({
  collapsed,
  onToggleCollapsed,
  navGroups,
  userInitial,
  userEmail,
  signOut,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  navGroups: NavGroup[];
  userInitial: string;
  userEmail: string;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 px-4 dark:border-tech-border">
        <Link
          href="/tech/dashboard"
          className="flex flex-1 items-center gap-3 overflow-hidden"
        >
          <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-lg border border-tech-primary/20 bg-tech-primary/10 shadow-md dark:bg-tech-primary/20">
            <Code2 className="h-5 w-5 p-0.5 text-tech-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold leading-none text-slate-900 dark:text-slate-900 dark:text-white">
                Ruhvi Tech
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
                System Control Center
              </p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onToggleCollapsed}
            className="ml-auto text-slate-600 transition-colors hover:text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>

      <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {navGroups.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500 dark:text-slate-600">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.label} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 space-y-1 border-t border-gray-200 p-2 dark:border-tech-border">
        <Link
          href="https://ruhvi.in"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:text-slate-600 dark:text-white dark:hover:bg-gray-50 dark:hover:text-slate-900"
          title="View storefront"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>View Storefront</span>}
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-tech-alert/10 hover:text-tech-alert dark:text-slate-400 dark:text-slate-600 dark:hover:bg-tech-alert/10 dark:hover:text-tech-alert"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && (
          <div className="mt-1 flex items-center gap-3 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-tech-primary text-xs font-bold text-slate-900 dark:text-white">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-300">
                System Engineer
              </p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-600">
                {userEmail}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <button
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-500 dark:text-white dark:hover:bg-gray-50 dark:hover:text-slate-900"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'T';
  const userEmail = user?.email || '';

  const sidebarProps = {
    collapsed,
    onToggleCollapsed: () => setCollapsed(!collapsed),
    navGroups: NAV_GROUPS,
    userInitial,
    userEmail,
    signOut,
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-50 text-slate-900 dark:bg-tech-bg dark:text-tech-text"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-tech-border dark:bg-tech-surface lg:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <TechSidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-60 flex-col border-r border-gray-200 bg-white dark:border-tech-border dark:bg-tech-surface">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-20 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <TechSidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-tech-border dark:bg-tech-surface">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search system, logs, flags..."
                className="w-72 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-1 focus:ring-tech-primary dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5 dark:text-slate-300 dark:placeholder-slate-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-500 dark:text-white dark:hover:bg-gray-50 dark:hover:text-slate-900"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-500 dark:text-white dark:hover:bg-gray-50 dark:hover:text-slate-900">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-tech-primary" />
            </button>
            <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-white dark:bg-white/10" />
            <div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-tech-primary text-xs font-bold text-slate-900 dark:text-white">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-tech-bg">
          <div className="min-h-full p-4 sm:p-6">{children}</div>
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
