import React, { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardCharts from './DashboardCharts';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  CreditCard,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { getServerUser } from '@/lib/auth/server';
import { computeSalesMetrics } from '@/lib/sales-metrics';
import SalesDashboard from './SalesDashboard';
import OperationsDashboard from './OperationsDashboard';
import OrdersDashboard from './OrdersDashboard';
import SupportDashboard from './SupportDashboard';
import MarketingDashboard from './MarketingDashboard';
import {
  getDailyTraffic,
  getPurchaseFunnel,
  getTopPages,
  getEventCounts,
} from '@/services/posthog-analytics.service';
import TrafficOverview from '@/components/dashboard/posthog/TrafficOverview';
import FunnelStrip from '@/components/dashboard/posthog/FunnelStrip';
import TopPagesTable from '@/components/dashboard/posthog/TopPagesTable';
import EventCountsBar from '@/components/dashboard/posthog/EventCountsBar';
import PostHogHealthBadge from '@/components/dashboard/posthog/PostHogHealthBadge';
import DateRangePicker from './DateRangePicker';

// ─── Helper: default date range (last 30 days) ───────────────────────────────
function getDefaultRange() {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { from, to };
}

function validateDate(d: string | undefined): string | null {
  if (!d) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return d;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  trendLabel,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  href?: string;
}) {
  const card = (
    <div className="group flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#131726] p-5 transition-colors hover:border-white/10">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {trendLabel && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-400'
                : trend === 'down'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {trendLabel}
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function AlertCard({
  count,
  label,
  href,
  color,
}: {
  count: number;
  label: string;
  href: string;
  color: 'red' | 'amber';
}) {
  const styles =
    color === 'red'
      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
      : 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl border p-3 ${styles} transition-opacity hover:opacity-90`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-2xl font-bold">{count}</span>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams.tab || 'overview';

  // Parse and validate date range from URL (falls back to last 30 days)
  const defaults = getDefaultRange();
  const from = validateDate(resolvedSearchParams.from) ?? defaults.from;
  const to = validateDate(resolvedSearchParams.to) ?? defaults.to;

  // Enforce from <= to
  const safeFrom = from <= to ? from : to;
  const safeTo = to;

  const fromISO = `${safeFrom}T00:00:00.000Z`;
  const toISO = `${safeTo}T23:59:59.999Z`;

  // Compute days for PostHog
  const days = Math.max(
    1,
    Math.round(
      (new Date(safeTo).getTime() - new Date(safeFrom).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  // Use service role client — bypasses RLS so admin can see all data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get current admin user from our signed session cookie
  const { user: adminUser } = await getServerUser();

  // ── Overview tab: parallel data fetches ──────────────────────────────────
  const [
    { data: allOrdersInRange },
    { data: todayOrders },
    { data: pendingOrders },
    { count: productCount },
    { count: usersCount },
    { data: orderItems },
    { data: recentOrders },
    { data: recentReviews },
    { data: stockProducts },
    { count: openRefundsCount },
    // New KPI sources
    { data: walletData },
    { data: rtoOrders },
    { data: returnOrders },
    { data: refundOrders },
    // PostHog
    posthogTrafficData,
    posthogFunnelData,
    posthogTopPagesData,
    posthogEventCountsData,
  ] = await Promise.all([
    // Orders in selected date range
    supabase
      .from('orders')
      .select('id, total, status, created_at')
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    // Today's orders (always "today" regardless of range, for the "today revenue" KPI)
    supabase
      .from('orders')
      .select('id, total')
      .gte(
        'created_at',
        `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`
      ),
    // Pending orders (real-time count, not date filtered)
    supabase
      .from('orders')
      .select('id, status')
      .in('status', ['pending', 'confirmed', 'processing']),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('order_items')
      .select(
        'quantity, price_at_purchase, product:products(name, category_id)'
      )
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    supabase
      .from('orders')
      .select(
        'id, order_number, total, status, created_at, shipping_address:addresses(full_name)'
      )
      .order('created_at', { ascending: false })
      .limit(7),
    supabase
      .from('testimonials')
      .select('customer_name, rating, review_text, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('products').select('stock_quantity, low_stock_threshold'),
    supabase
      .from('returns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'requested'),
    // Wallet liability (sum of all positive wallet balances — total outstanding liability)
    supabase.from('users').select('wallet_balance').gt('wallet_balance', 0),
    // RTO orders in range
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['rto_initiated', 'rto_received'])
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    // Return orders in range
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['return_requested', 'return_approved', 'returned'])
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    // Refunded orders in range
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'refunded')
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    // PostHog (days-based)
    getDailyTraffic(days),
    getPurchaseFunnel(days),
    getTopPages(8, days),
    getEventCounts(days),
  ]);

  // ── Computed metrics ──────────────────────────────────────────────────────
  const pendingCount = (pendingOrders || []).length;
  const {
    totalRevenue,
    totalOrders,
    todayRevenue,
    aov,
    cancelledOrders,
    cancelledRevenue,
    salesChartData,
    topProductsData,
    earningsByCategoryData,
  } = computeSalesMetrics({
    allOrdersMonth: allOrdersInRange,
    todayOrders,
    orderItems,
  });

  const lowStockCount = (stockProducts || []).filter(
    (p) =>
      (p.stock_quantity || 0) <= (p.low_stock_threshold || 5) &&
      (p.stock_quantity || 0) > 0
  ).length;

  // New: Wallet liability
  const walletLiability = (walletData || []).reduce(
    (sum, u) => sum + Number(u.wallet_balance || 0),
    0
  );

  // New: Rate calculations in selected range
  const totalRangeOrders = (allOrdersInRange || []).length;
  const rtoCount = rtoOrders?.length ?? 0;
  const returnCount = returnOrders?.length ?? 0;
  const refundCount = refundOrders?.length ?? 0;
  const rtoRate =
    totalRangeOrders > 0
      ? ((rtoCount / totalRangeOrders) * 100).toFixed(1)
      : '0.0';
  const returnRate =
    totalRangeOrders > 0
      ? ((returnCount / totalRangeOrders) * 100).toFixed(1)
      : '0.0';
  const refundRate =
    totalRangeOrders > 0
      ? ((refundCount / totalRangeOrders) * 100).toFixed(1)
      : '0.0';

  const statusBadgeClass: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    confirmed: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    returned: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'operations', label: 'Operations' },
    { id: 'orders', label: 'Orders' },
    { id: 'support', label: 'Support' },
    { id: 'marketing', label: 'Marketing' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-0.5 text-xs font-semibold text-emerald-400">
            Welcome back, {adminUser?.email?.split('@')[0] ?? 'Admin'} 👋
          </p>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        {/* Date Range Picker — Suspense so it doesn't block server render */}
        <Suspense
          fallback={
            <div className="h-9 w-64 animate-pulse rounded-xl bg-white/5" />
          }
        >
          <DateRangePicker from={safeFrom} to={safeTo} />
        </Suspense>
      </div>

      {/* Tabs Selector */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/5 pb-1">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <Link
              key={t.id}
              href={`/admin/dashboard?tab=${t.id}&from=${safeFrom}&to=${safeTo}`}
              className={`whitespace-nowrap rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Conditional Dashboards Rendering */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Action Alerts */}
          {pendingCount > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AlertCard
                count={pendingCount}
                label="Orders awaiting action"
                href="/admin/orders"
                color="amber"
              />
              <AlertCard
                count={openRefundsCount ?? 0}
                label="Open refund requests"
                href="/admin/refunds"
                color="red"
              />
            </div>
          )}

          {/* Revenue KPI Cards */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Revenue &amp; Orders
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Today's Revenue"
                value={`₹${todayRevenue.toLocaleString('en-IN')}`}
                icon={TrendingUp}
                iconColor="text-emerald-400"
                iconBg="bg-emerald-500/10"
                href="/admin/reports/sales"
              />
              <KpiCard
                label="Period Revenue"
                value={`₹${totalRevenue.toLocaleString('en-IN')}`}
                sub={`${totalOrders} orders`}
                icon={CreditCard}
                iconColor="text-blue-400"
                iconBg="bg-blue-500/10"
                href="/admin/reports/sales"
              />
              <KpiCard
                label="Avg Order Value"
                value={`₹${Math.round(aov).toLocaleString('en-IN')}`}
                sub="In selected period"
                icon={ShoppingBag}
                iconColor="text-purple-400"
                iconBg="bg-purple-500/10"
              />
              <KpiCard
                label="Total Customers"
                value={(usersCount ?? 0).toLocaleString('en-IN')}
                icon={Users}
                iconColor="text-amber-400"
                iconBg="bg-amber-500/10"
                href="/admin/users"
              />
            </div>
          </div>

          {/* Operations KPI Cards */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Operations &amp; Inventory
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Pending Orders"
                value={pendingCount.toString()}
                icon={Package}
                iconColor="text-amber-400"
                iconBg="bg-amber-500/10"
                href="/admin/orders"
              />
              <KpiCard
                label="Total Products"
                value={(productCount ?? 0).toLocaleString('en-IN')}
                icon={Package}
                iconColor="text-indigo-400"
                iconBg="bg-indigo-500/10"
                href="/admin/products"
              />
              <KpiCard
                label="Open Refunds"
                value={(openRefundsCount ?? 0).toString()}
                icon={RotateCcw}
                iconColor="text-rose-400"
                iconBg="bg-rose-500/10"
                href="/admin/refunds"
              />
              <KpiCard
                label="Low Stock Alerts"
                value={lowStockCount.toString()}
                icon={AlertCircle}
                iconColor="text-orange-400"
                iconBg="bg-orange-500/10"
                href="/admin/reports/inventory"
              />
            </div>
          </div>

          {/* Financial Health KPI Cards (new) */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Financial Health &amp; Fulfilment Risk
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Wallet Liability"
                value={`₹${walletLiability.toLocaleString('en-IN')}`}
                sub="Outstanding balance (non-withdrawable)"
                icon={Wallet}
                iconColor="text-cyan-400"
                iconBg="bg-cyan-500/10"
                href="/admin/wallet"
              />
              <KpiCard
                label="RTO Rate"
                value={`${rtoRate}%`}
                sub={`${rtoCount} orders in period`}
                icon={RotateCcw}
                iconColor={Number(rtoRate) > 10 ? 'text-rose-400' : 'text-amber-400'}
                iconBg={Number(rtoRate) > 10 ? 'bg-rose-500/10' : 'bg-amber-500/10'}
                trend={Number(rtoRate) > 10 ? 'down' : 'neutral'}
                trendLabel={Number(rtoRate) > 10 ? 'High' : 'Normal'}
              />
              <KpiCard
                label="Return Rate"
                value={`${returnRate}%`}
                sub={`${returnCount} returns in period`}
                icon={ArrowDownRight}
                iconColor="text-orange-400"
                iconBg="bg-orange-500/10"
                href="/admin/refunds"
              />
              <KpiCard
                label="Refund Rate"
                value={`${refundRate}%`}
                sub={`${refundCount} refunds in period`}
                icon={BarChart3}
                iconColor={Number(refundRate) > 5 ? 'text-rose-400' : 'text-slate-400'}
                iconBg={Number(refundRate) > 5 ? 'bg-rose-500/10' : 'bg-slate-500/10'}
              />
            </div>
          </div>

          {/* PostHog Analytics */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400">
              PostHog Behavioral Analytics
            </h2>
            <PostHogHealthBadge
              configured={!!process.env.POSTHOG_PERSONAL_API_KEY}
              hasData={
                (posthogTrafficData?.length ?? 0) > 0 ||
                (posthogEventCountsData?.length ?? 0) > 0
              }
            />
          </div>

          {/* PostHog Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TrafficOverview
                data={posthogTrafficData ?? []}
                totalPageviews={(posthogTrafficData ?? []).reduce(
                  (sum, p) => sum + p.views,
                  0
                )}
                totalUniqueVisitors={(posthogTrafficData ?? []).reduce(
                  (sum, p) => sum + p.visitors,
                  0
                )}
              />
            </div>
            <FunnelStrip funnel={posthogFunnelData ?? []} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopPagesTable pages={posthogTopPagesData ?? []} />
            <EventCountsBar events={posthogEventCountsData ?? []} />
          </div>

          {/* Charts */}
          <DashboardCharts
            salesChartData={salesChartData}
            totalRevenue={totalRevenue}
            totalOrders={totalOrders}
            topProductsData={topProductsData}
            earningsByCategoryData={earningsByCategoryData}
            recentReviews={recentReviews || []}
            todayRevenue={todayRevenue}
            cancelledOrders={cancelledOrders}
            cancelledRevenue={cancelledRevenue}
          />

          {/* Recent Orders */}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">
                Recent Orders
              </h2>
              <Link
                href="/admin/orders"
                className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
              >
                View all →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left font-semibold">Order</th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left font-semibold">Date</th>
                    <th className="px-5 py-3 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(recentOrders || []).map((order: any) => (
                    <tr
                      key={order.id}
                      className="hover:bg-white/3 group transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {(order.shipping_address as any)?.full_name || 'Guest'}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(order.created_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            statusBadgeClass[order.status] ||
                            'border-slate-500/20 bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-white">
                        ₹{Number(order.total).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {(!recentOrders || recentOrders.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-slate-600"
                      >
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sales' && <SalesDashboard from={safeFrom} to={safeTo} />}
      {activeTab === 'operations' && (
        <OperationsDashboard from={safeFrom} to={safeTo} />
      )}
      {activeTab === 'orders' && <OrdersDashboard from={safeFrom} to={safeTo} />}
      {activeTab === 'support' && (
        <SupportDashboard from={safeFrom} to={safeTo} />
      )}
      {activeTab === 'marketing' && (
        <MarketingDashboard from={safeFrom} to={safeTo} />
      )}
    </div>
  );
}
