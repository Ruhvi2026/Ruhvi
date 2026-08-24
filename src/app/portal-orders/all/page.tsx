'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OrderStatus =
  'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  processing: {
    label: 'Processing',
    icon: AlertCircle,
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
};

const ALL_STATUSES: OrderStatus[] = [
  'all',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
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
    } catch (err: any) {
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

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white">All Orders</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {orders.length} total orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeStatus === s
                ? 'border border-amber-500/20 bg-amber-500/10 text-amber-400'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            {s === 'all' ? 'All Orders' : (STATUS_CONFIG[s]?.label ?? s)}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeStatus === s ? 'bg-amber-500/20' : 'bg-white/5'
              }`}
            >
              {countByStatus[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Payments</option>
            <option value="phonepe">PhonePe</option>
            <option value="cod">Cash on Delivery</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              No orders match your filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/2 group transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/portal-orders/${order.id}`}
                          className="font-mono font-semibold text-amber-400 hover:text-amber-300"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {(order.shipping_address as any)?.full_name ||
                            'Guest'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-600">
                          {(order.shipping_address as any)?.phone || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(order.created_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            order.payment_method === 'cod'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                              : order.payment_method === 'phonepe'
                              ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                              : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {order.payment_method === 'cod'
                            ? 'COD'
                            : order.payment_method === 'phonepe'
                            ? 'PhonePe'
                            : order.payment_method || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusUpdate(order.id, e.target.value)
                            }
                            disabled={updatingId === order.id}
                            className={`cursor-pointer appearance-none rounded-full border py-0.5 pl-2 pr-6 text-[10px] font-semibold focus:outline-none ${
                              cfg?.cls ||
                              'border-slate-500/20 bg-slate-500/10 text-slate-400'
                            } ${updatingId === order.id ? 'opacity-50' : ''}`}
                            style={{ background: 'transparent' }}
                          >
                            {Object.keys(STATUS_CONFIG).map((s) => (
                              <option
                                key={s}
                                value={s}
                                className="bg-[#1e2235] text-white"
                              >
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        ₹{Number(order.total).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/portal-orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition-colors hover:bg-white/10"
                        >
                          <Eye className="h-3 w-3" />
                          View
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

      {filteredOrders.length > 0 && (
        <p className="text-center text-xs text-slate-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      )}
    </div>
  );
}
