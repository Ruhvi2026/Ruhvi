'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  count: number;
  revenue: number;
}

export default function SalesReportPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [codOrders, setCodOrders] = useState(0);
  const [prepaidOrders, setPrepaidOrders] = useState(0);

  const fetchSalesReport = async () => {
    try {
      setRefreshing(true);
      setLoadError(null);
      const supabase = createClient();

      let query = supabase
        .from('orders')
        .select(
          'id, order_number, total, payment_method, payment_status, status, created_at, order_items(quantity, price_at_purchase, product:products(name))'
        )
        .neq('status', 'cancelled');

      if (timeRange === '7d') {
        const since = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        query = query.gte('created_at', since);
      } else if (timeRange === '30d') {
        const since = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        query = query.gte('created_at', since);
      }

      const { data: orders, error } = await query.order('created_at', {
        ascending: true,
      });

      if (error) {
        console.error('Failed to fetch orders:', error);
        setLoadError(error.message || 'Failed to load sales data.');
        setSalesData([]);
        setTopProducts([]);
        setTotalRevenue(0);
        setTotalOrders(0);
        setCodOrders(0);
        setPrepaidOrders(0);
        return;
      }

      if (!orders || orders.length === 0) {
        setTotalRevenue(0);
        setTotalOrders(0);
        setCodOrders(0);
        setPrepaidOrders(0);
        setSalesData([]);
        setTopProducts([]);
        return;
      }

      let revSum = 0;
      let codCount = 0;
      let prepaidCount = 0;
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      const productMap: Record<string, { count: number; revenue: number }> = {};

      orders.forEach((o: any) => {
        const orderRev = Number(o.total) || 0;
        revSum += orderRev;

        if (o.payment_method === 'cod') {
          codCount++;
        } else {
          prepaidCount++;
        }

        const dateStr = new Date(o.created_at).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        });
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { revenue: 0, orders: 0 };
        }
        dailyMap[dateStr].revenue += orderRev;
        dailyMap[dateStr].orders += 1;

        if (Array.isArray(o.order_items)) {
          o.order_items.forEach((item: any) => {
            const pName = item.product?.name || 'Handcrafted Fine Jewellery';
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price_at_purchase) || 0;
            if (!productMap[pName]) {
              productMap[pName] = { count: 0, revenue: 0 };
            }
            productMap[pName].count += qty;
            productMap[pName].revenue += qty * price;
          });
        }
      });

      setTotalRevenue(revSum);
      setTotalOrders(orders.length);
      setCodOrders(codCount);
      setPrepaidOrders(prepaidCount);

      const timeline: DailySales[] = Object.entries(dailyMap).map(
        ([date, val]) => ({
          date,
          revenue: val.revenue,
          orders: val.orders,
        })
      );
      setSalesData(timeline);

      const topList = Object.entries(productMap)
        .map(([name, val]) => ({
          name,
          count: val.count,
          revenue: val.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topList);
    } catch (err: any) {
      console.error('Error computing sales report:', err);
      setLoadError(err?.message || 'Failed to load sales data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, [timeRange]);

  const avgOrderValue = Math.round(totalRevenue / (totalOrders || 1));

  const exportCSV = () => {
    if (salesData.length === 0) {
      alert('No sales data available to export.');
      return;
    }
    const headers = 'Date,Revenue (INR),Orders\n';
    const rows = salesData
      .map((d) => `"${d.date}",${d.revenue},${d.orders}`)
      .join('\n');
    const blob = new Blob([headers + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-end">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="mb-1 inline-flex items-center space-x-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>Financial Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Sales & Revenue Analytics
            </h1>
            <p className="text-xs text-slate-400">
              Audited gross merchandise value, daily revenue trends, and product
              performance.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time Filter */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1 text-xs font-semibold text-slate-300">
            <button
              onClick={() => setTimeRange('7d')}
              className={`rounded-lg px-3 py-1 transition-colors ${
                timeRange === '7d'
                  ? 'bg-amber-500 font-bold text-slate-950'
                  : 'hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`rounded-lg px-3 py-1 transition-colors ${
                timeRange === '30d'
                  ? 'bg-amber-500 font-bold text-slate-950'
                  : 'hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`rounded-lg px-3 py-1 transition-colors ${
                timeRange === 'all'
                  ? 'bg-amber-500 font-bold text-slate-950'
                  : 'hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={fetchSalesReport}
            disabled={refreshing}
            className="flex h-8 items-center space-x-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            onClick={exportCSV}
            className="flex h-8 items-center space-x-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Load Error Alert */}
      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 flex-shrink-0" />
            Failed to load sales data from the database: {loadError}
          </span>
          <button
            onClick={fetchSalesReport}
            className="ml-4 flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Gross Revenue
            </span>
            <IndianRupee className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-emerald-400">
            Active non-cancelled orders
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Orders
            </span>
            <ShoppingBag className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{totalOrders}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Completed & in-transit checkouts
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Average Order Value
            </span>
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            ₹{avgOrderValue.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Basket size per buyer
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Payment Breakdown
            </span>
            <CreditCard className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {prepaidOrders} Prepaid
            </span>
            <span className="text-xs text-slate-500">/ {codOrders} COD</span>
          </div>
          <p className="mt-1 text-[11px] text-purple-400">
            {totalOrders > 0
              ? Math.round((prepaidOrders / totalOrders) * 100)
              : 0}
            % prepaid ratio
          </p>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Revenue Table */}
        <div className="space-y-4 rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              Daily Revenue Timeline
            </h2>
            <span className="text-[10px] font-semibold text-slate-500">
              {salesData.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {salesData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No order records found in this timeframe.
                    </td>
                  </tr>
                ) : (
                  salesData.map((d, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="py-2.5 font-medium text-slate-200">
                        {d.date}
                      </td>
                      <td className="py-2.5 text-right text-slate-400">
                        {d.orders}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        ₹{d.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="space-y-4 rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              Top Performing Products
            </h2>
            <span className="text-[10px] font-semibold text-slate-500">
              By Revenue
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-2">Product Name</th>
                  <th className="pb-2 text-right">Units Sold</th>
                  <th className="pb-2 text-right">Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No item line sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="py-2.5 font-medium text-slate-200">
                        {p.name}
                      </td>
                      <td className="py-2.5 text-right text-slate-400">
                        {p.count}
                      </td>
                      <td className="py-2.5 text-right font-bold text-amber-400">
                        ₹{p.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
