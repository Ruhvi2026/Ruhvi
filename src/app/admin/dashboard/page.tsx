import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DashboardCharts from './DashboardCharts';
import {
  ShoppingBag, TrendingUp, Users, Package,
  AlertCircle, CreditCard, RotateCcw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';

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
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  href?: string;
}) {
  const card = (
    <div className="bg-[#131726] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-colors group">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trendLabel && (
          <div
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              trend === 'up'
                ? 'text-emerald-400 bg-emerald-500/10'
                : trend === 'down'
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-slate-400 bg-slate-500/10'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="w-3 h-3" />
            ) : null}
            {trendLabel}
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
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
      className={`flex items-center justify-between p-3 rounded-xl border ${styles} hover:opacity-90 transition-opacity`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-2xl font-bold">{count}</span>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  // Parallel fetches
  const [
    { data: allOrdersMonth },
    { data: todayOrders },
    { data: pendingOrders },
    { data: productCount },
    { data: usersCount },
    { data: orderItems },
    { data: recentOrders },
    { data: recentReviews },
  ] = await Promise.all([
    supabase.from('orders').select('id, total, status, created_at').gte('created_at', startOfMonth),
    supabase.from('orders').select('id, total').gte('created_at', startOfToday),
    supabase.from('orders').select('id, status').in('status', ['pending', 'processing']),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('order_items').select('quantity, price_at_purchase, product:products(name, category_id)').gte('created_at', startOfMonth),
    supabase.from('orders').select('id, order_number, total, status, created_at, shipping_address:addresses(full_name)').order('created_at', { ascending: false }).limit(7),
    supabase.from('testimonials').select('customer_name, rating, review_text, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  // Process KPIs
  const totalRevenue = (allOrdersMonth || []).reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = (allOrdersMonth || []).length;
  const todayRevenue = (todayOrders || []).reduce((s, o) => s + Number(o.total), 0);
  const pendingCount = (pendingOrders || []).length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Sales chart data
  const salesDataMap: Record<string, { date: string; Revenue: number; Orders: number }> = {};
  (allOrdersMonth || []).forEach((order) => {
    const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!salesDataMap[dateStr]) salesDataMap[dateStr] = { date: dateStr, Revenue: 0, Orders: 0 };
    salesDataMap[dateStr].Revenue += Number(order.total);
    salesDataMap[dateStr].Orders += 1;
  });
  const salesChartData = Object.values(salesDataMap);

  // Top products + category earnings
  const productCounts: Record<string, { name: string; value: number }> = {};
  const categoryEarnings: Record<string, { name: string; value: number }> = {};
  (orderItems || []).forEach((item: any) => {
    const productObj = Array.isArray(item.product) ? item.product[0] : item.product;
    const productName = productObj?.name || 'Unknown';
    if (!productCounts[productName]) productCounts[productName] = { name: productName, value: 0 };
    productCounts[productName].value += item.quantity;
    const catId = productObj?.category_id || 'other';
    if (!categoryEarnings[catId]) categoryEarnings[catId] = { name: `Cat ${catId.slice(0, 6)}`, value: 0 };
    categoryEarnings[catId].value += item.price_at_purchase * item.quantity;
  });

  const topProductsData = Object.values(productCounts).sort((a, b) => b.value - a.value).slice(0, 5);
  const earningsByCategoryData = Object.values(categoryEarnings).sort((a, b) => b.value - a.value).slice(0, 5);

  const statusBadgeClass: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          View All Orders
        </Link>
      </div>

      {/* Action Alerts */}
      {(pendingCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AlertCard
            count={pendingCount}
            label="Orders awaiting action"
            href="/admin/orders"
            color="amber"
          />
          <AlertCard
            count={0}
            label="Open refund requests"
            href="/admin/refunds"
            color="red"
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          href="/admin/reports/sales"
        />
        <KpiCard
          label="This Month Revenue"
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
          sub="This month"
          icon={ShoppingBag}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <KpiCard
          label="Total Customers"
          value={(usersCount?.length ?? 0).toLocaleString('en-IN')}
          icon={Users}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          href="/admin/users"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          value={(productCount as any)?.length?.toString() ?? '—'}
          icon={Package}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
          href="/admin/products"
        />
        <KpiCard
          label="Open Refunds"
          value="0"
          icon={RotateCcw}
          iconColor="text-rose-400"
          iconBg="bg-rose-500/10"
          href="/admin/refunds"
        />
        <KpiCard
          label="Low Stock Alerts"
          value="—"
          icon={AlertCircle}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          href="/admin/reports/inventory"
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        salesChartData={salesChartData}
        totalRevenue={totalRevenue}
        totalOrders={totalOrders}
        topProductsData={topProductsData}
        earningsByCategoryData={earningsByCategoryData}
        recentReviews={recentReviews || []}
      />

      {/* Recent Orders */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Order</th>
                <th className="px-5 py-3 text-left font-semibold">Customer</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(recentOrders || []).map((order: any) => (
                <tr key={order.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {(order.shipping_address as any)?.full_name || 'Guest'}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                        statusBadgeClass[order.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
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
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-600">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
