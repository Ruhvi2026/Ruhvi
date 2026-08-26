'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  Star,
  AlertCircle,
  Globe,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
  Monitor,
} from 'lucide-react';

interface NavChild {
  label: string;
  href: string;
  requiredPermission?: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<any>;
  badge?: string;
  children?: NavChild[];
  requiredPermission?: string;
  requiredRole?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const getOperationsNavGroups = (): NavGroup[] => [
  {
    section: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/operations/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: 'CATALOG',
    items: [
      {
        label: 'Products',
        icon: Package,
        requiredPermission: 'products.view',
        children: [
          { label: 'All Products', href: '/operations/products' },
          {
            label: 'Add New Product',
            href: '/operations/products/new',
            requiredPermission: 'products.create',
          },
        ],
      },
      {
        label: 'Categories',
        href: '/operations/categories',
        icon: Layers,
        requiredPermission: 'products.view',
      },
      {
        label: 'Collections',
        href: '/operations/collections',
        icon: Star,
        requiredPermission: 'products.view',
      },
    ],
  },
  {
    section: 'INVENTORY',
    items: [
      {
        label: 'Stock Overview',
        href: '/operations/inventory',
        icon: AlertCircle,
        requiredPermission: 'inventory.view',
      },
      {
        label: 'Stock Adjustment',
        href: '/operations/inventory/adjustment',
        icon: AlertCircle,
        requiredPermission: 'inventory.adjust',
      },
    ],
  },
  {
    section: 'WEBSITE CMS',
    items: [
      {
        label: 'Homepage Structure',
        href: '/operations/cms/homepage',
        icon: Monitor,
        requiredPermission: 'cms.view',
      },
      {
        label: 'Banners & Hero',
        href: '/operations/cms/banners',
        icon: Globe,
        requiredPermission: 'banner.view',
      },
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
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
          <div className="ml-7 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={`block rounded px-2 py-1.5 text-[11px] transition-colors ${
                  pathname === child.href ||
                  pathname.startsWith(child.href + '/')
                    ? 'font-semibold text-indigo-400'
                    : 'text-slate-500 hover:text-slate-200'
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
          ? 'bg-indigo-500/10 text-indigo-400'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </Link>
  );
}

function OperationsSidebarContent({
  collapsed,
  onToggleCollapsed,
  navGroups,
  userInitial,
  userRoleDisplay,
  userEmail,
  signOut,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  navGroups: NavGroup[];
  userInitial: string;
  userRoleDisplay: string;
  userEmail: string;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-white/5 px-4">
        <Link
          href="/operations/dashboard"
          className="flex flex-1 items-center gap-3 overflow-hidden"
        >
          <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-lg border border-indigo-500/20 bg-[#1e1b4b] shadow-md">
            <Globe className="h-full w-full p-1 text-indigo-400" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold leading-none text-indigo-400">
                Ruhvi Operations
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                Internal Portal
              </p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onToggleCollapsed}
            className="ml-auto text-slate-600 transition-colors hover:text-slate-400"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {navGroups.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">
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

      <div className="flex-shrink-0 space-y-1 border-t border-white/5 p-2">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-rose-500/5 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && (
          <div className="mt-1 flex items-center gap-3 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-medium text-slate-300">
                {userRoleDisplay}
              </p>
              <p className="truncate text-[10px] text-slate-600">{userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  const permissions = profile?.permissions || [];
  const userRole = profile?.role || 'customer';
  const displayRole =
    userRole === 'admin'
      ? 'Administrator'
      : userRole === 'manager'
        ? 'Operations Manager'
        : 'Operations Staff';

  const hasPermission = (requiredPerm?: string) => {
    if (!requiredPerm) return true;
    if (permissions.includes('*')) return true;
    if (permissions.includes(requiredPerm)) return true;
    const [module] = requiredPerm.split('.');
    if (permissions.includes(`${module}.*`)) return true;
    return false;
  };

  const filteredNavGroups = getOperationsNavGroups()
    .map((group) => {
      const filteredItems = group.items
        .filter((item) => hasPermission(item.requiredPermission))
        .map((item) => {
          if (item.children) {
            return {
              ...item,
              children: item.children.filter((child) =>
                hasPermission(child.requiredPermission)
              ),
            };
          }
          return item;
        });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  const userInitial =
    profile?.full_name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'O';
  const userRoleDisplay = profile?.role
    ? profile.role.replace('_', ' ').toUpperCase()
    : 'USER';

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#0a0a0f]"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-white/5 bg-[#0f0f17] transition-all duration-300 lg:flex ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <OperationsSidebarContent
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          navGroups={filteredNavGroups}
          userInitial={userInitial}
          userRoleDisplay={userRoleDisplay}
          userEmail={profile?.email || ''}
          signOut={signOut}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-60 flex-col border-r border-white/5 bg-[#0f0f17]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-20 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <OperationsSidebarContent
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed(!collapsed)}
              navGroups={filteredNavGroups}
              userInitial={userInitial}
              userRoleDisplay={userRoleDisplay}
              userEmail={profile?.email || ''}
              signOut={signOut}
            />
          </aside>
        </div>
      )}

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 bg-[#0f0f17] px-4">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-400 transition-colors hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
          <div className="min-h-full p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
