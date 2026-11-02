'use client';

import Link from 'next/link';
import { Search, Home, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';

function isPortalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'admin.ruhvi.in' ||
    h.startsWith('admin.localhost') ||
    h === 'accounts.ruhvi.in' ||
    h.startsWith('accounts.localhost') ||
    h === 'support.ruhvi.in' ||
    h.startsWith('support.localhost') ||
    h === 'auth.ruhvi.in' ||
    h.startsWith('auth.localhost') ||
    h === 'operation.ruhvi.in' ||
    h.startsWith('operation.localhost') ||
    h === 'marketing.ruhvi.in' ||
    h.startsWith('marketing.localhost') ||
    h === 'orders.ruhvi.in' ||
    h.startsWith('orders.localhost') ||
    h === 'tech.ruhvi.in' ||
    h.startsWith('tech.localhost') ||
    h === 'co-founder.ruhvi.in' ||
    h.startsWith('co-founder.localhost')
  );
}

function portalDashboardHref(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h === 'accounts.ruhvi.in' || h.startsWith('accounts.localhost')) {
    return '/accounts/dashboard';
  }
  if (h === 'admin.ruhvi.in' || h.startsWith('admin.localhost')) {
    return '/admin/dashboard';
  }
  if (h === 'support.ruhvi.in' || h.startsWith('support.localhost')) {
    return '/support/dashboard';
  }
  if (h === 'operation.ruhvi.in' || h.startsWith('operation.localhost')) {
    return '/operations/dashboard';
  }
  if (h === 'marketing.ruhvi.in' || h.startsWith('marketing.localhost')) {
    return '/marketing/dashboard';
  }
  if (h === 'orders.ruhvi.in' || h.startsWith('orders.localhost')) {
    return '/portal-orders/dashboard';
  }
  if (h === 'tech.ruhvi.in' || h.startsWith('tech.localhost')) {
    return '/tech/dashboard';
  }
  if (h === 'co-founder.ruhvi.in' || h.startsWith('co-founder.localhost')) {
    return '/co-founder';
  }
  return '/';
}

export function NotFoundClient() {
  const [isPortal, setIsPortal] = useState(false);
  const [dashboardHref, setDashboardHref] = useState('/');

  useLayoutEffect(() => {
    const hostname = window.location.hostname;
    setIsPortal(isPortalHostname(hostname));
    setDashboardHref(portalDashboardHref(hostname));
  }, []);

  if (isPortal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#131726] p-8 text-center shadow-2xl">
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 p-4 text-slate-400">
            <Search className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="mb-8 text-sm text-slate-400">
            The page you are looking for does not exist on this portal or you do
            not have permission to view it.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={dashboardHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500"
            >
              <LayoutDashboard className="h-4 w-4" />
              Return to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
        <Search className="h-12 w-12 text-slate-400" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        <Home className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}
