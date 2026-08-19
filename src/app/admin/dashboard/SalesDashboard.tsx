import React from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardCharts from './DashboardCharts';
import { ShoppingBag, TrendingUp, CreditCard, Star } from 'lucide-react';

export default async function SalesDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const today = new Date();
  const startOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  ).toISOString();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).toISOString();

  // Parallel fetches for Sales Data
  const [
    { data: allOrdersMonth },
    { data: todayOrders },
    { data: orderItems },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, created_at')
      .gte('created_at', startOfMonth),
    supabase.from('orders').select('id, total').gte('created_at', startOfToday),
    supabase
      .from('order_items')
      .select(
        'quantity, price_at_purchase, product:products(name, category_id)'
      )
      .gte('created_at', startOfMonth),
  ]);

  const totalRevenue = (allOrdersMonth || []).reduce(
    (s, o) => s + Number(o.total),
    0
  );
  const totalOrders = (allOrdersMonth || []).length;
  const todayRevenue = (todayOrders || []).reduce(
    (s, o) => s + Number(o.total),
    0
  );
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Sales chart data
  const salesDataMap: Record<
    string,
    { date: string; Revenue: number; Orders: number }
  > = {};
  (allOrdersMonth || []).forEach((order) => {
    const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!salesDataMap[dateStr])
      salesDataMap[dateStr] = { date: dateStr, Revenue: 0, Orders: 0 };
    salesDataMap[dateStr].Revenue += Number(order.total);
    salesDataMap[dateStr].Orders += 1;
  });
  const salesChartData = Object.values(salesDataMap);

  // Top products + category earnings
  const productCounts: Record<string, { name: string; value: number }> = {};
  const categoryEarnings: Record<string, { name: string; value: number }> = {};
  (orderItems || []).forEach((item: any) => {
    const productObj = Array.isArray(item.product)
      ? item.product[0]
      : item.product;
    const productName = productObj?.name || 'Unknown';
    if (!productCounts[productName])
      productCounts[productName] = { name: productName, value: 0 };
    productCounts[productName].value += item.quantity;

    const catId = productObj?.category_id || 'other';
    if (!categoryEarnings[catId])
      categoryEarnings[catId] = { name: `Cat ${catId.slice(0, 6)}`, value: 0 };
    categoryEarnings[catId].value += item.price_at_purchase * item.quantity;
  });

  const topProductsData = Object.values(productCounts)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const earningsByCategoryData = Object.values(categoryEarnings)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Today's Revenue
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            ₹{todayRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Monthly Revenue
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalOrders} orders this month
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Average Order Value
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            ₹{Math.round(aov).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <DashboardCharts
        salesChartData={salesChartData}
        totalRevenue={totalRevenue}
        totalOrders={totalOrders}
        topProductsData={topProductsData}
        earningsByCategoryData={earningsByCategoryData}
        recentReviews={[]}
      />
    </div>
  );
}
