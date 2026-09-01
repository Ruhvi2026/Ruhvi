'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Settings,
  Bell,
  Menu,
  X,
  Globe,
  ChevronDown,
  ChevronRight,
  FileText,
  LogOut,
  AlertCircle,
  Wand2,
  Activity,
  Server,
  Code,
  Users,
  PenTool,
  ToggleLeft,
  Webhook,
  KeyRound,
} from 'lucide-react';

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<any>;
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
      {
        label: 'Analytics (Vercel/Posthog)',
        href: '/tech/analytics',
        icon: Activity,
      },
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

export default function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleItem = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (item: NavItem) => {
    if (item.href && pathname.startsWith(item.href)) return true;
    if (item.children?.some((child) => pathname.startsWith(child.href)))
      return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-slate-950 font-mono text-slate-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-cyan-900/50 bg-slate-950 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-cyan-900/50 px-6">
          <Link
            href="/tech/dashboard"
            className="flex items-center gap-2 text-xl font-bold tracking-wider text-cyan-400"
          >
            <Code className="h-6 w-6" />
            TECH.RUHVI
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-400 hover:text-cyan-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar h-[calc(100vh-4rem)] overflow-y-auto p-4">
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-8">
              <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                {group.section}
              </h3>
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const active = isItemActive(item);
                  const expanded = expandedItems[item.label] || active;

                  return (
                    <div key={itemIdx}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                            active
                              ? 'border border-cyan-900/50 bg-cyan-950/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-cyan-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon
                              className={`h-5 w-5 ${
                                active
                                  ? 'text-cyan-400'
                                  : 'text-slate-500 group-hover:text-cyan-400'
                              }`}
                            />
                            {item.label}
                          </div>
                          {item.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs bg-${item.badgeColor}-900/50 text-${item.badgeColor}-400 border border-${item.badgeColor}-800/50`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <button
                          onClick={() => toggleItem(item.label)}
                          className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            active
                              ? 'border border-cyan-900/50 bg-cyan-950/50 text-cyan-400'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-cyan-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon
                              className={`h-5 w-5 ${
                                active
                                  ? 'text-cyan-400'
                                  : 'text-slate-500 group-hover:text-cyan-400'
                              }`}
                            />
                            {item.label}
                          </div>
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                        </button>
                      )}

                      {item.children && expanded && (
                        <div className="mt-1 space-y-1 pl-11 pr-3">
                          {item.children.map((child, childIdx) => {
                            const childActive = pathname === child.href;
                            return (
                              <Link
                                key={childIdx}
                                href={child.href}
                                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                                  childActive
                                    ? 'font-semibold text-cyan-400'
                                    : 'text-slate-500 hover:text-cyan-300'
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="z-30 flex h-16 items-center justify-between border-b border-cyan-900/50 bg-slate-950/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-cyan-400 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center rounded-full border border-cyan-900/30 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 sm:flex">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
              System Normal
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/admin/dashboard"
              className="hidden items-center gap-2 text-sm text-slate-400 transition-colors hover:text-cyan-400 sm:flex"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin Portal
            </Link>

            <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-900 hover:text-cyan-400">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500"></span>
            </button>

            <div className="mx-1 h-8 w-px bg-cyan-900/50"></div>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-400 transition-colors hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
