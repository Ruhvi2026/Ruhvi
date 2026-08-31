import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { Layers, AlertCircle, ArchiveX, ArrowLeftRight, Package } from 'lucide-react';

interface OperationsDashboardProps {
  from: string;
  to: string;
}

export default async function OperationsDashboard({ from, to }: OperationsDashboardProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const fromISO = `${from}T00:00:00.000Z`;
  const toISO = `${to}T23:59:59.999Z`;

  const [
    { data: products },
    { count: movementsIn },
    { count: movementsOut },
    { count: newProductsCount },
  ] = await Promise.all([
    supabase.from('products').select('stock_quantity, low_stock_threshold'),
    supabase
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('movement_type', 'stock_in')
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    supabase
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('movement_type', 'stock_out')
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
  ]);

  // Stock alert counts are point-in-time (current state), not date-ranged
  const totalStock = (products || []).reduce(
    (acc, p) => acc + (p.stock_quantity || 0),
    0
  );
  const lowStockCount = (products || []).filter(
    (p) =>
      (p.stock_quantity || 0) <= (p.low_stock_threshold || 5) &&
      (p.stock_quantity || 0) > 0
  ).length;
  const outOfStockCount = (products || []).filter(
    (p) => (p.stock_quantity || 0) === 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Current Stock State (point-in-time — no date filter applies) */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Current Inventory State
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-medium text-slate-400">
                Total Stock Units
              </h3>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {totalStock.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              Across all active SKUs
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
              <h3 className="text-sm font-medium text-slate-400">
                Out of Stock
              </h3>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {outOfStockCount} SKUs
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Currently unavailable
            </p>
          </div>
        </div>
      </div>

      {/* Period Activity (date-filtered) */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Period Activity
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-medium text-slate-400">Stock In</h3>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {(movementsIn ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Inbound movements in period
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-400">Stock Out</h3>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {(movementsOut ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Outbound movements in period
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-purple-400" />
              <h3 className="text-sm font-medium text-slate-400">
                New Products
              </h3>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {(newProductsCount ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Added in selected period
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

