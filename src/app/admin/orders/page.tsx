'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ArrowRight, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { Order } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function AdminOrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          shipping_address:addresses(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load orders from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Confirmed</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Shipped</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6ED] flex flex-col pb-16">
      <header className="bg-[#1C1B1A] text-[#FAF6ED] px-6 py-4 flex items-center justify-between border-b border-[#E7D7A3]/30 shadow-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#E7D7A3]" />
          <span className="font-serif text-xl font-bold tracking-wider text-[#E7D7A3]">RUHVI ADMIN CONSOLE</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/admin/dashboard" className="flex items-center gap-1 bg-[#FAF6ED]/10 px-3 py-1.5 rounded-lg hover:bg-[#FAF6ED]/20 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 w-full">
        <div className="flex justify-between items-end border-b border-stone-200 pb-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900">Orders Manager</h1>
            <p className="text-sm text-stone-500 mt-1">View and manage all customer orders.</p>
          </div>
          <button onClick={fetchOrders} className="flex items-center space-x-2 text-stone-600 hover:text-amber-900 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-stone-200">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-stone-500 text-sm">Loading orders from Supabase...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">No orders found in database.</p>
            <p className="text-stone-400 text-xs mt-1">Make sure you are logged in when placing an order.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-semibold">
                  <th className="p-4 pl-6">Order ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors group">
                    <td className="p-4 pl-6 font-mono font-medium text-amber-950">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline flex items-center space-x-2">
                        <span>{order.order_number}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-amber-600 transition-opacity" />
                      </Link>
                    </td>
                    <td className="p-4">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="p-4">
                      {order.shipping_address?.full_name || 'Unknown'}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4 text-right pr-6 font-bold text-stone-900">
                      ₹{Number(order.total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
