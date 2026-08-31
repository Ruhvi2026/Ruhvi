'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Truck, ArchiveX, RotateCcw, CreditCard, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardCounts {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  delivery_failed: number;
  rto: number;
  returns: number;
  total: number;
  today: number;
  pending_refunds: number;
}

export default function OrdersDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0,
    delivery_failed: 0, rto: 0, returns: 0, total: 0, today: 0, pending_refunds: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const supabase = createClient();
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, payment_status, created_at') as { data: { id: string; status: string; payment_status: string; created_at: string }[] | null };

      if (!orders) { setLoading(false); return; }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setCounts({
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
        processing: orders.filter((o) => o.status === 'processing').length,
        shipped: orders.filter((o) => o.status === 'shipped' || o.status === 'out_for_delivery').length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        cancelled: orders.filter((o) => o.status === 'cancelled').length,
        delivery_failed: orders.filter((o) => o.status === 'delivery_failed').length,
        rto: orders.filter((o) => o.status === 'rto_initiated' || o.status === 'rto_received').length,
        returns: orders.filter((o) => ['return_requested', 'return_approved', 'returned'].includes(o.status)).length,
        today: orders.filter((o) => new Date(o.created_at) >= today).length,
        pending_refunds: orders.filter((o) => o.payment_status === 'refunded' || o.status === 'refunded').length,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Today\'s Orders', value: counts.today, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/portal-orders/all' },
    { label: 'Awaiting Fulfillment', value: counts.pending + counts.processing, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/portal-orders/all?status=pending' },
    { label: 'Ready to Ship', value: counts.shipped, icon: Truck, color: 'text-indigo-400', bg: 'bg-indigo-500/10', href: '/portal-orders/all?status=shipped' },
    { label: 'Delivery Failed', value: counts.delivery_failed, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', href: '/portal-orders/all?status=delivery_failed' },
    { label: 'Active RTOs', value: counts.rto, icon: ArchiveX, color: 'text-red-400', bg: 'bg-red-500/10', href: '/portal-orders/rto' },
    { label: 'Open Returns', value: counts.returns, icon: RotateCcw, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/portal-orders/returns' },
    { label: 'Pending Refunds', value: counts.pending_refunds, icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/portal-orders/refunds' },
    { label: 'Total Orders', value: counts.total, icon: TrendingUp, color: 'text-slate-400', bg: 'bg-slate-500/10', href: '/portal-orders/all' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Orders Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {loading ? 'Loading...' : `Real-time overview — ${counts.total} total orders, ${counts.today} today`}
          </p>
        </div>
        <button
          onClick={fetchCounts}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-white/5 bg-[#131726] p-5 transition-colors hover:border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}