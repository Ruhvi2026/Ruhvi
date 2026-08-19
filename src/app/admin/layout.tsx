'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Tag,
  Wallet,
  BarChart2,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Globe,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Layers,
  FileText,
  LogOut,
  Home,
  Star,
  AlertCircle,
  Wand2,
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
  badgeColor?: string;
  children?: NavChild[];
  requiredPermission?: string;
  requiredRole?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const getNavGroups = (): NavGroup[] => [
  {
    section: 'OVERVIEW',
    items: [
      {
        label: 'Analytics Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      {
        label: 'Orders',
        href: '/admin/orders',
        icon: ShoppingBag,
        requiredPermission: 'orders.view',
      },
      {
        label: 'Operations',
        href: '/admin/operations',
        icon: Package,
        requiredPermission: 'inventory.view',
      },
      {
        label: 'Marketing',
        href: '/admin/marketing',
        icon: Tag,
        requiredPermission: 'marketing_analytics.view',
      },
      {
        label: 'Support',
        href: '/admin/support',
        icon: AlertCircle,
        requiredPermission: 'support.view',
      },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      {
        label: 'Master Data',
        href: '/admin/master-data',
        icon: BarChart2,
        requiredRole: 'admin',
      },
      {
        label: 'Team & Access',
        href: '/admin/team',
        icon: Users,
        requiredRole: 'admin',
      },
      {
        label: 'Audit Logs',
        href: '/admin/security/audit-logs',
        icon: FileText,
        requiredRole: 'admin',
      },
      {
        label: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        requiredRole: 'admin',
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
              ? 'bg-emerald-500/10 text-emerald-400'
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
                    ? 'font-semibold text-emerald-400'
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
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${
            item.badgeColor || 'bg-emerald-500'
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  // RBAC Helpers
  const permissions = profile?.permissions || [];
  const role = profile?.role || 'customer';
  const isAdmin = (role as string).toLowerCase() === 'admin';

  const hasPermission = (requiredPerm?: string) => {
    if (!requiredPerm) return true;
    if (permissions.includes('*')) return true;
    if (permissions.includes(requiredPerm)) return true;
    const [module] = requiredPerm.split('.');
    if (permissions.includes(`${module}.*`)) return true;
    return false;
  };

  const hasRole = (requiredRole?: string) => {
    if (!requiredRole) return true;
    if (requiredRole.toLowerCase() === 'admin' && isAdmin) return true;
    return (role as string).toLowerCase() === requiredRole.toLowerCase();
  };

  // Filter navigation groups based on permissions
  const filteredNavGroups = getNavGroups()
    .map((group) => {
      const filteredItems = group.items
        .filter((item) => {
          // Check role/permission for the main item
          if (!hasRole(item.requiredRole)) return false;
          if (!hasPermission(item.requiredPermission)) return false;

          return true;
        })
        .map((item) => {
          // Filter children if they exist
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
    'A';
  const userEmail = profile?.email || user?.email || '';
  const userRoleDisplay = profile?.role
    ? profile.role.replace('_', ' ').toUpperCase()
    : 'USER';

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-white/5 px-4">
        <Link
          href="/admin/dashboard"
          className="flex flex-1 items-center gap-3 overflow-hidden"
        >
          <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-lg border border-white/20 bg-charcoal-800 shadow-md">
            <Image src="/logo.png" alt="Ruhvi" fill className="object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold leading-none text-white">
                Ruhvi Admin
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                Fine Jewellery
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

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {filteredNavGroups.map((group) => (
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
          <div className="mt-1 flex items-center gap-3 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
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
      className="flex h-screen overflow-hidden bg-[#0d0f1a]"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-white/5 bg-[#131726] transition-all duration-300 lg:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
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
                placeholder="Search orders, products, customers..."
                className="w-72 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
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
