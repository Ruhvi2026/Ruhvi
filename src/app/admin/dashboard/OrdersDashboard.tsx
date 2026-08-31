import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { Package, Truck, AlertTriangle, RotateCcw, Clock } from 'lucide-react';

interface OrdersDashboardProps {
  from: string;
  to: string;
}

export default async function OrdersDashboard({ from, to }: OrdersDashboardProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const fromISO = `${from}T00:00:00.000Z`;
  const toISO = `${to}T23:59:59.999Z`;

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total')
    .gte('created_at', fromISO)
    .lte('created_at', toISO);

  const allOrders = orders || [];
  const totalOrders = allOrders.length;

  const deliveredCount = allOrders.filter((o) => o.status === 'delivered').length;
  const returnedCount = allOrders.filter(
    (o) =>
      o.status === 'returned' ||
      o.status === 'return_requested' ||
      o.status === 'return_approved'
  ).length;
  const cancelledCount = allOrders.filter((o) => o.status === 'cancelled').length;
  const rtoCount = allOrders.filter(
    (o) => o.status === 'rto_initiated' || o.status === 'rto_received'
  ).length;
  const pendingCount = allOrders.filter(
    (o) => o.status === 'confirmed' || o.status === 'processing'
  ).length;

  const pct = (n: number) =>
    totalOrders > 0 ? ((n / totalOrders) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">Total Orders</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {totalOrders.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">In selected period</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Delivered</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{pct(deliveredCount)}%</p>
          <p className="mt-1 text-xs text-slate-500">{deliveredCount} packages</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">RTO Rate</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{pct(rtoCount)}%</p>
          <p className="mt-1 text-xs text-slate-500">{rtoCount} return-to-origin</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-medium text-slate-400">Cancellation</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{pct(cancelledCount)}%</p>
          <p className="mt-1 text-xs text-slate-500">{cancelledCount} cancelled</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">Pending</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {pendingCount.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">Confirmed / Processing</p>
        </div>
      </div>
    </div>
  );
}
