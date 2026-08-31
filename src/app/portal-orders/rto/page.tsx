'use client';

import React, { useEffect, useState } from 'react';
import { ArchiveX, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RtoOrder {
  id: string;
  order_number: string;
  status: string;
  awb_code?: string;
  courier_name?: string;
  total: number;
  created_at: string;
  shipping_address?: { full_name?: string; phone?: string; city?: string };
}

export default function RTOMangementPage() {
  const [orders, setOrders] = useState<RtoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => { fetchRtos(); }, []);

  const fetchRtos = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select('*, shipping_address:addresses(*)')
        .in('status', ['delivery_failed', 'rto_initiated', 'rto_received'])
        .order('updated_at', { ascending: false });
      setOrders((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (orderId: string) => {
    setActionId(orderId);
    try {
      const res = await fetch('/api/admin/orders/rto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'receive' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRtos();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; cls: string }> = {
      delivery_failed: { label: 'Delivery Failed', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      rto_initiated: { label: 'RTO Initiated', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
      rto_received: { label: 'RTO Received', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    };
    const c = config[status] || { label: status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">RTO Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">Track and reconcile Return to Origin shipments</p>
        </div>
        <button onClick={fetchRtos} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center text-slate-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
          <ArchiveX className="mx-auto mb-4 h-12 w-12 text-slate-700" />
          <h2 className="text-lg font-semibold text-white">No Active RTOs</h2>
          <p className="mt-1 text-sm text-slate-400">No packages currently returning to the warehouse.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-white/5 bg-[#131726] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white">Order #{order.order_number}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    {order.shipping_address?.full_name} • {order.shipping_address?.phone} • {order.shipping_address?.city}
                  </p>
                  {order.awb_code && (
                    <p className="font-mono text-xs text-slate-500">
                      AWB: {order.awb_code} {order.courier_name ? `• ${order.courier_name}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Total: ₹{order.total.toLocaleString('en-IN')}</span>
                    <span>Placed: {new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {order.status === 'rto_initiated' && (
                  <button
                    onClick={() => handleReceive(order.id)}
                    disabled={actionId === order.id}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark Received at Warehouse
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}