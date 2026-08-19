import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { Layers, AlertCircle, ArchiveX } from 'lucide-react';

export default async function OperationsDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: products } = await supabase
    .from('products')
    .select('stock, low_stock_threshold');

  const totalStock = (products || []).reduce(
    (acc, p) => acc + (p.stock || 0),
    0
  );
  const lowStockCount = (products || []).filter(
    (p) => (p.stock || 0) <= (p.low_stock_threshold || 5) && (p.stock || 0) > 0
  ).length;
  const outOfStockCount = (products || []).filter(
    (p) => (p.stock || 0) === 0
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Stock Items
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {totalStock.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            Healthy levels across most SKUs
          </p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Low Stock Alerts
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-400">
            {lowStockCount} SKUs
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Requires replenishment review
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-3">
            <ArchiveX className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">Out of Stock</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">
            {outOfStockCount} SKUs
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Currently unavailable in catalog
          </p>
        </div>
      </div>
    </div>
  );
}
