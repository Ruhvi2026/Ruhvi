import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { Package, Truck, AlertTriangle, RotateCcw } from 'lucide-react';

export default async function OrdersDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: orders } = await supabase.from('orders').select('status');

  const totalOrders = (orders || []).length;
  const deliveredCount = (orders || []).filter(
    (o) => o.status === 'delivered'
  ).length;
  const returnedCount = (orders || []).filter(
    (o) => o.status === 'returned'
  ).length;
  const cancelledCount = (orders || []).filter(
    (o) => o.status === 'cancelled'
  ).length;

  const deliveredRate =
    totalOrders > 0 ? ((deliveredCount / totalOrders) * 100).toFixed(1) : '0.0';
  const returnedRate =
    totalOrders > 0 ? ((returnedCount / totalOrders) * 100).toFixed(1) : '0.0';
  const cancelledRate =
    totalOrders > 0 ? ((cancelledCount / totalOrders) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Order Volume
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {totalOrders.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">Historical Lifetime</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Delivery Success Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{deliveredRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {deliveredCount} packages delivered
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">RTO Rate</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{returnedRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {returnedCount} returned shipments
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Cancellation Rate
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{cancelledRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {cancelledCount} orders cancelled
          </p>
        </div>
      </div>
    </div>
  );
}
