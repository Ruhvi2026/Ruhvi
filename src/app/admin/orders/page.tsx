'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  RefreshCw,
  ChevronDown,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OrdersMetricsSparklineGrid } from '@/components/portal/MetricSparklineCard';

type OrderStatus =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  total: number;
  created_at: string;
  shipping_address?: { full_name?: string; phone?: string; city?: string };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; cls: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  confirmed: {
    label: 'Confirmed',
    icon: AlertCircle,
    cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
  returned: {
    label: 'Returned',
    icon: RotateCcw,
    cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
  },
};

const ALL_STATUSES: OrderStatus[] = [
  'all',
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('all');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'phonepe' | 'cod'>(
    'all'
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeStatus, paymentFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*, shipping_address:addresses(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as any) || []);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = activeStatus === 'all' || o.status === activeStatus;
      const matchPayment =
        paymentFilter === 'all' || o.payment_method === paymentFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.order_number?.toLowerCase().includes(q) ||
        (o.shipping_address as any)?.full_name?.toLowerCase().includes(q) ||
        (o.shipping_address as any)?.phone?.includes(q);
      return matchStatus && matchPayment && matchSearch;
    });
  }, [orders, activeStatus, paymentFilter, search]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pageOrders = useMemo(
    () => filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredOrders, page]
  );

  const exportCsv = () => {
    const escapeCell = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      'Order Number',
      'Customer',
      'Phone',
      'Date',
      'Payment',
      'Status',
      'Amount (INR)',
    ];
    const rows = filteredOrders.map((o) => [
      o.order_number,
      (o.shipping_address as any)?.full_name || 'Guest',
      (o.shipping_address as any)?.phone || '',
      new Date(o.created_at).toLocaleDateString('en-IN'),
      o.payment_method || '',
      o.status,
      o.total,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map(escapeCell).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Orders Management
            </h1>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Live
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Real-time multi-channel fulfillment tracking & dispatch portal
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            className="portal-floating-glass flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            title="Refresh Orders Data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 transition-transform dark:text-slate-400 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] hover:bg-emerald-500 active:scale-[0.98]"
            title="Export Filtered Orders as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur-md dark:text-rose-400">
          {error}
        </div>
      )}

      {/* 2. In-Card Sparkline KPI Metrics Grid (Phase 2 Component) */}
      <OrdersMetricsSparklineGrid orders={orders} loading={loading} />

      {/* 3. Floating Glass Filter & Search Toolbar */}
      <div className="space-y-4">
        {/* Status Tabs Bar */}
        <div className="portal-floating-glass flex items-center gap-1.5 overflow-x-auto rounded-2xl p-1.5 shadow-sm">
          {ALL_STATUSES.map((s) => {
            const isActive = activeStatus === s;
            const label =
              s === 'all' ? 'All Orders' : (STATUS_CONFIG[s]?.label ?? s);
            const count = countByStatus[s] ?? 0;

            return (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 shadow-sm dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                    isActive
                      ? 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Payment Filter Controls */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="portal-inset-control w-full rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-1 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <Filter className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                aria-label="Filter orders by payment method"
                className="cursor-pointer bg-transparent py-1.5 text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
              >
                <option
                  value="all"
                  className="bg-white text-slate-900 dark:bg-[#1a1d2e] dark:text-white"
                >
                  All Payments
                </option>
                <option
                  value="phonepe"
                  className="bg-white text-slate-900 dark:bg-[#1a1d2e] dark:text-white"
                >
                  PhonePe
                </option>
                <option
                  value="cod"
                  className="bg-white text-slate-900 dark:bg-[#1a1d2e] dark:text-white"
                >
                  Cash on Delivery (COD)
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. High-Contrast Floating Glass Orders Table */}
      <div className="portal-floating-glass overflow-hidden rounded-2xl shadow-xl transition-all">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="mx-auto mb-3 h-7 w-7 animate-spin text-emerald-500" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Syncing live orders from Supabase...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-400 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No orders match your filters
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search query, status tab, or payment filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
                  <th className="px-5 py-3.5 text-left">Order ID</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                  <th className="px-5 py-3.5 text-left">Payment</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {pageOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-slate-500/5 dark:hover:bg-white/[0.03]"
                    >
                      {/* Order Number */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-bold text-emerald-600 transition-colors hover:text-emerald-500 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          #{order.order_number}
                        </Link>
                      </td>

                      {/* Customer Info (ph-no-capture Strictly Preserved) */}
                      <td className="ph-no-capture px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {(order.shipping_address as any)?.full_name ||
                            'Guest Customer'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {(order.shipping_address as any)?.phone || 'No phone'}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400">
                        {new Date(order.created_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </td>

                      {/* Payment Method Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            order.payment_method === 'cod'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : order.payment_method === 'phonepe'
                                ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                : 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {order.payment_method === 'cod'
                            ? 'COD'
                            : order.payment_method === 'phonepe'
                              ? 'PhonePe'
                              : order.payment_method || 'Unknown'}
                        </span>
                      </td>

                      {/* Row-Level Status Select */}
                      <td className="px-5 py-4">
                        <div className="relative inline-block">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusUpdate(order.id, e.target.value)
                            }
                            disabled={updatingId === order.id}
                            aria-label={`Update status for order #${order.order_number}`}
                            className={`cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-[11px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                              cfg?.cls ||
                              'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                            } ${updatingId === order.id ? 'opacity-50' : ''}`}
                            style={{ background: 'transparent' }}
                          >
                            {Object.keys(STATUS_CONFIG).map((s) => (
                              <option
                                key={s}
                                value={s}
                                className="bg-white text-slate-900 dark:bg-[#1a1d2e] dark:text-white"
                              >
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70" />
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-5 py-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                        ₹{Number(order.total).toLocaleString('en-IN')}
                      </td>

                      {/* View Action */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="portal-floating-glass inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-emerald-400"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Pagination Controls */}
      {filteredOrders.length > 0 && (
        <div className="portal-floating-glass flex flex-col items-center justify-between gap-3 rounded-2xl p-4 text-xs shadow-sm sm:flex-row">
          <span className="font-medium text-slate-600 dark:text-slate-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredOrders.length)} of{' '}
            <strong className="font-bold text-slate-900 dark:text-white">
              {filteredOrders.length}
            </strong>{' '}
            orders
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="portal-floating-glass rounded-xl px-3.5 py-1.5 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-semibold text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="portal-floating-glass rounded-xl px-3.5 py-1.5 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
