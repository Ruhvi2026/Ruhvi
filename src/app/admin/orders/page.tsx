'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package, Search, RefreshCw, ChevronDown, ExternalLink,
  Filter, Download, Eye, CheckCircle, Truck, XCircle, Clock, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OrderStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  total: number;
  created_at: string;
  shipping_address?: { full_name?: string; phone?: string; city?: string };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending:    { label: 'Pending',    icon: Clock,        cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  processing: { label: 'Processing', icon: AlertCircle,  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  shipped:    { label: 'Shipped',    icon: Truck,        cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  delivered:  { label: 'Delivered',  icon: CheckCircle,  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,      cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const ALL_STATUSES: OrderStatus[] = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('all');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'phonepe' | 'cod'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

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
      const matchPayment = paymentFilter === 'all' || o.payment_method === paymentFilter;
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Orders</h1>
          <p className="text-slate-500 text-xs mt-0.5">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeStatus === s
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {s === 'all' ? 'All Orders' : STATUS_CONFIG[s]?.label ?? s}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeStatus === s ? 'bg-emerald-500/20' : 'bg-white/5'
            }`}>
              {countByStatus[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Payments</option>
            <option value="phonepe">PhonePe</option>
            <option value="cod">Cash on Delivery</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No orders match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-white/2 transition-colors group">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200 font-medium">
                          {(order.shipping_address as any)?.full_name || 'Guest'}
                        </div>
                        <div className="text-slate-600 font-mono text-[10px]">
                          {(order.shipping_address as any)?.phone || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          order.payment_method === 'cod'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {order.payment_method === 'cod' ? 'COD' : 'PhonePe'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            disabled={updatingId === order.id}
                            className={`appearance-none pr-6 pl-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer focus:outline-none ${
                              cfg?.cls || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            } ${updatingId === order.id ? 'opacity-50' : ''}`}
                            style={{ background: 'transparent' }}
                          >
                            {Object.keys(STATUS_CONFIG).map((s) => (
                              <option key={s} value={s} className="bg-[#1e2235] text-white">
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        ₹{Number(order.total).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors border border-white/10"
                        >
                          <Eye className="w-3 h-3" />
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
        <p className="text-center text-slate-600 text-xs">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      )}
    </div>
  );
}
