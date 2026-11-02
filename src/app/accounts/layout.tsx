'use client';

import React, { useState } from 'react';
import '@/app/portal.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FileSpreadsheet,
  ShoppingBag,
  BookOpen,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Landmark,
  ShieldCheck,
  Receipt,
  Download,
  Truck,
  ScanLine,
  Hammer,
  Repeat,
  Calculator,
  Database,
  FileCheck,
} from 'lucide-react';
import { PortalThemeProvider } from '@/context/PortalThemeContext';
import { ThemeToggle } from '@/components/portal/ThemeToggle';
import { PortalSwitcherDropdown } from '@/components/portal/PortalSwitcherDropdown';
import dynamic from 'next/dynamic';

const FloatingStaffMessenger = dynamic(
  () => import('@/components/chat/FloatingStaffMessenger'),
  { ssr: false }
);

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const getAccountsNavGroups = (): NavGroup[] => [
  {
    section: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/accounts/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: 'BILLING & INVOICING',
    items: [
      {
        label: 'Sales Invoices',
        href: '/accounts/invoices',
        icon: FileText,
      },
      {
        label: 'Create GST Invoice',
        href: '/accounts/invoices/new',
        icon: PlusCircle,
        badge: 'Rule 46',
      },
      {
        label: 'Recurring Invoices',
        href: '/accounts/recurring',
        icon: Repeat,
      },
      {
        label: 'Payment Vouchers',
        href: '/accounts/vouchers',
        icon: Receipt,
      },
    ],
  },
  {
    section: 'GST & LEGAL COMPLIANCE',
    items: [
      {
        label: 'GSTR-1 & GSTR-3B',
        href: '/accounts/gstr',
        icon: FileSpreadsheet,
        badge: 'JSON Export',
      },
      {
        label: 'GSTR-2B Reconciliation',
        href: '/accounts/gstr-2b',
        icon: FileCheck,
      },
      {
        label: 'E-Way Bill & E-Invoice',
        href: '/accounts/eway-bill',
        icon: Truck,
        badge: 'NIC JSON',
      },
    ],
  },
  {
    section: 'PURCHASES & WORKSHOP',
    items: [
      {
        label: 'Vendor Bills & ITC',
        href: '/accounts/purchases',
        icon: ShoppingBag,
      },
      {
        label: 'Bill OCR Scanner',
        href: '/accounts/ocr',
        icon: ScanLine,
        badge: 'AI OCR',
      },
      {
        label: 'Jewellery Costing (BOM)',
        href: '/accounts/manufacturing',
        icon: Hammer,
      },
    ],
  },
  {
    section: 'ACCOUNTS & TAX',
    items: [
      {
        label: 'Cash Book & Ledger',
        href: '/accounts/cashbook',
        icon: BookOpen,
      },
      {
        label: 'Party Outstanding',
        href: '/accounts/ledger',
        icon: Users,
      },
      {
        label: 'Income & Advance Tax',
        href: '/accounts/income-tax',
        icon: Calculator,
      },
    ],
  },
  {
    section: 'SYSTEM & TOOLS',
    items: [
      {
        label: 'Backup & Data Export',
        href: '/accounts/backup',
        icon: Database,
      },
      {
        label: 'GST Configuration',
        href: '/accounts/settings',
        icon: Settings,
      },
    ],
  },
];

export default function AccountsPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navGroups = getAccountsNavGroups();

  return (
    <PortalThemeProvider>
      <div className="portal-shell flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100 antialiased lg:flex-row">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4 lg:hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="flex items-center space-x-2">
              <Receipt className="h-6 w-6 text-amber-400" />
              <span className="text-lg font-bold tracking-wider text-white">
                RUHVI{' '}
                <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-xs font-semibold uppercase text-amber-400">
                  Accounts
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <PortalSwitcherDropdown currentPortalId="accounts" />
          </div>
        </header>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent shadow-inner">
                <Landmark className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h1 className="flex items-center gap-2 font-bold tracking-wide text-white">
                  RUHVI JEWELS
                </h1>
                <p className="flex items-center gap-1 font-mono text-xs text-slate-400">
                  <ShieldCheck className="inline h-3 w-3 text-emerald-400" />{' '}
                  GST & Finance Portal
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Business Profile Summary Badge */}
          <div className="mx-4 my-3 rounded-xl border border-slate-700/50 bg-slate-800/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Active GSTIN
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                19 (WB)
              </span>
            </div>
            <div className="mt-1 font-mono text-xs font-semibold text-amber-300">
              19AAACR1234F1Z5
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400">
              Ruhvi Jewels Private Limited
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
            {navGroups.map((group) => (
              <div key={group.section}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.section}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon
                            className={`h-4 w-4 transition-colors ${
                              isActive
                                ? 'text-amber-400'
                                : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User profile & footer */}
          <div className="border-t border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-amber-400">
                  {profile?.full_name
                    ? profile.full_name[0].toUpperCase()
                    : 'A'}
                </div>
                <div className="truncate">
                  <p className="truncate text-sm font-medium text-white">
                    {profile?.full_name ||
                      user?.email?.split('@')[0] ||
                      'Staff Member'}
                  </p>
                  <p className="truncate text-xs capitalize text-slate-400">
                    {profile?.role?.replace('_', ' ') || 'Accounts Staff'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop Top Bar */}
          <div className="sticky top-0 z-30 hidden items-center justify-between border-b border-slate-800/80 bg-slate-900/40 px-8 py-4 backdrop-blur-md lg:flex">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                <span className="text-slate-300">RUHVI</span>
                <span>/</span>
                <span className="font-semibold uppercase text-amber-400">
                  {pathname.split('/')[2] || 'Dashboard'}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span>GST Portal Synced (FY 2026-27)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <div className="h-4 w-px bg-slate-800" />
              <PortalSwitcherDropdown currentPortalId="accounts" />
            </div>
          </div>

          {/* Main Outlet */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <FloatingStaffMessenger />
      </div>
    </PortalThemeProvider>
  );
}
