'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, Wallet,
  BarChart2, Settings, Bell, Search, Menu, X, Globe,
  ChevronDown, ChevronRight, CreditCard,
  Layers, FileText, LogOut, Home, Star, AlertCircle
} from 'lucide-react';

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
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
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      {
        label: 'Orders',
        icon: ShoppingBag,
        children: [
          { label: 'All Orders', href: '/admin/orders' },
          { label: 'Refunds & Returns', href: '/admin/refunds' },
        ],
      },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    section: 'CATALOG',
    items: [
      {
        label: 'Products',
        icon: Package,
        children: [
          { label: 'All Products', href: '/admin/products' },
          { label: 'Add New Product', href: '/admin/products/new' },
          { label: 'Bulk Management', href: '/admin/tools/bulk-management' },
        ],
      },
      { label: 'Categories', href: '/admin/categories', icon: Layers },
      { label: 'Collections', href: '/admin/collections', icon: Star },
      { label: 'Inventory', href: '/admin/reports/inventory', icon: AlertCircle },
    ],
  },
  {
    section: 'CUSTOMERS',
    items: [
      { label: 'Customers', href: '/admin/users', icon: Users },
      { label: 'Wallet & Coins', href: '/admin/wallet', icon: Wallet },
    ],
  },
  {
    section: 'MARKETING & SEO',
    items: [
      { label: 'Coupons & Offers', href: '/admin/coupons', icon: Tag },
      { label: 'SEO Control Suite', href: '/admin/seo', icon: Globe },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
    ],
  },
  {
    section: 'ANALYTICS',
    items: [
      {
        label: 'Reports',
        icon: BarChart2,
        children: [
          { label: 'Sales Report', href: '/admin/reports/sales' },
          { label: 'Inventory Report', href: '/admin/reports/inventory' },
          { label: 'Coupons & Referrals', href: '/admin/reports/coupons-referrals' },
          { label: 'Abandoned Carts', href: '/admin/reports/abandoned-carts' },
        ],
      },
    ],
  },
  {
    section: 'ADMIN',
    items: [
      { label: 'Audit Logs', href: '/admin/security/audit-logs', icon: FileText },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const hasActiveChild = item.children?.some(
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
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-xs font-medium ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {open ? (
                <ChevronDown className="w-3 h-3 opacity-60" />
              ) : (
                <ChevronRight className="w-3 h-3 opacity-60" />
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
                className={`block py-1.5 px-2 text-[11px] rounded transition-colors ${
                  pathname === child.href || pathname.startsWith(child.href + '/')
                    ? 'text-emerald-400 font-semibold'
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
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span
          className={`text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            item.badgeColor || 'bg-emerald-500'
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'A';
  const userEmail = user?.email || '';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-white/5 flex-shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow-lg shadow-emerald-500/20">
            R
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-none truncate">Ruhvi Admin</p>
              <p className="text-slate-500 text-[10px] mt-0.5 truncate">Fine Jewellery</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-600 hover:text-slate-400 transition-colors ml-auto"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 text-[9px] font-bold tracking-widest text-slate-600 mb-2 uppercase">
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

      <div className="border-t border-white/5 p-2 space-y-1 flex-shrink-0">
        <Link
          href="https://ruhvi.in"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white text-xs rounded-lg hover:bg-white/5 transition-colors"
          title="View storefront"
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>View Store</span>}
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-rose-400 text-xs rounded-lg hover:bg-rose-500/5 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-300 text-xs font-medium truncate">Administrator</p>
              <p className="text-slate-600 text-[10px] truncate">{userEmail}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2 text-slate-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0f1a]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-[#131726] border-r border-white/5 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-60 bg-[#131726] border-r border-white/5 flex flex-col h-full z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white z-20"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-[#131726] border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search orders, products, customers..."
                className="w-72 pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs cursor-pointer">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#0d0f1a]">
          <div className="p-4 sm:p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
