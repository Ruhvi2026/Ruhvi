import Link from 'next/link';
import { Search, Home, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { headers } from 'next/headers';

export default async function NotFound() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isAdminHost =
    host === 'admin.ruhvi.in' || host.startsWith('admin.localhost');
  const isSupportHost =
    host === 'support.ruhvi.in' || host.startsWith('support.localhost');
  const isAuthHost =
    host === 'auth.ruhvi.in' || host.startsWith('auth.localhost');
  const isOperationsHost =
    host === 'operation.ruhvi.in' || host.startsWith('operation.localhost');
  const isMarketingHost =
    host === 'marketing.ruhvi.in' || host.startsWith('marketing.localhost');
  const isOrdersHost =
    host === 'orders.ruhvi.in' || host.startsWith('orders.localhost');

  const isSystemSubdomain =
    isAdminHost ||
    isSupportHost ||
    isAuthHost ||
    isOperationsHost ||
    isMarketingHost ||
    isOrdersHost;

  if (isSystemSubdomain) {
    let dashboardHref = '/';
    if (isAdminHost) dashboardHref = '/admin/dashboard';
    else if (isSupportHost) dashboardHref = '/support/dashboard';
    else if (isOperationsHost) dashboardHref = '/operations/dashboard';
    else if (isMarketingHost) dashboardHref = '/marketing/dashboard';
    else if (isOrdersHost) dashboardHref = '/portal-orders/dashboard';

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#131726] p-8 text-center shadow-2xl">
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 p-4 text-slate-400">
            <Search className="h-8 w-8" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-white">Page Not Found</h1>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-emerald-500">
            Error 404
          </h2>

          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-slate-400">
            The page you are looking for does not exist on this portal, or you
            do not have permission to access it.
          </p>

          <Link
            href={dashboardHref}
            className="inline-flex w-full items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-500"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        <Search className="h-8 w-8" />
      </div>

      <h1 className="mb-2 font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
        Page Not Found
      </h1>
      <h2 className="mb-4 font-serif text-xl text-stone-500">Error 404</h2>

      <p className="mx-auto mb-8 max-w-md text-sm text-stone-500">
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>

      <div className="flex w-full max-w-sm flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-amber-950 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-amber-900 sm:w-auto"
        >
          <Home className="h-4 w-4" />
          <span>Return Home</span>
        </Link>

        <Link
          href="/collections/all"
          className="flex w-full items-center justify-center space-x-2 rounded-lg border border-stone-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wider text-stone-900 transition-colors hover:bg-stone-50 sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Shop Collections</span>
        </Link>
      </div>
    </div>
  );
}
