'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Search, RefreshCw, Wallet, ArrowLeftRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RefundableOrder {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  prepaid_amount?: number;
  cod_balance?: number;
  created_at: string;
  user_id: string;
  users?: { email?: string; full_name?: string };
}

export default function RefundsManagementPage() {
  const [orders, setOrders] = useState<RefundableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refundMethod, setRefundMethod] = useState<Record<string, 'original_payment' | 'wallet'>>({});

  useEffect(() => { fetchRefundableOrders(); }, []);

  const fetchRefundableOrders = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select('*, users!orders_user_id_fkey(email, full_name)')
        .in('status', ['rto_received', 'returned', 'refunded'])
        .in('payment_status', ['paid', 'refunded'])
        .order('updated_at', { ascending: false });
      setOrders((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (orderId: string) => {
    const method = refundMethod[orderId] || 'original_payment';
    setActionId(orderId);
    try {
      const res = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, method, reason: 'RTO/Return refund' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRefundableOrders();
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; cls: string }> = {
      rto_received: { label: 'RTO Received', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
      returned: { label: 'Returned', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
      refunded: { label: 'Refunded', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    };
    const c = config[status] || { label: status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Refunds Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">Process refunds for RTO/returned orders</p>
        </div>
        <button onClick={fetchRefundableOrders} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center text-slate-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
          <CreditCard className="mx-auto mb-4 h-12 w-12 text-slate-700" />
          <h2 className="text-lg font-semibold text-white">No Pending Refunds</h2>
          <p className="mt-1 text-sm text-slate-400">All refunds have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isRefunded = order.payment_status === 'refunded' || order.status === 'refunded';
            const method = refundMethod[order.id] || 'original_payment';

            return (
              <div key={order.id} className="rounded-xl border border-white/5 bg-[#131726] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-white">Order #{order.order_number}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-slate-400">
                      {order.users?.full_name || 'Unknown'} • {order.users?.email || ''}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Total: ₹{order.total.toLocaleString('en-IN')}</span>
                      <span>Paid: {order.payment_method === 'cod' ? `₹${Number(order.prepaid_amount || 0).toLocaleString('en-IN')} deposit` : 'Full prepaid'}</span>
                      <span>Method: {order.payment_method}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isRefunded ? (
                      <>
                        <select
                          value={method}
                          onChange={(e) => setRefundMethod({ ...refundMethod, [order.id]: e.target.value as any })}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300"
                        >
                          <option value="original_payment">Original Payment</option>
                          <option value="wallet">Ruhvi Wallet</option>
                        </select>
                        <button
                          onClick={() => handleRefund(order.id)}
                          disabled={actionId === order.id}
                          className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          Process Refund
                        </button>
                      </>
                    ) : (
                      <span className="rounded bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                        Refunded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}