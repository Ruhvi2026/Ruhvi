'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  History,
  Package,
  ArrowRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function InventoryOverviewPage() {
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryData = async () => {
      const supabase = createClient();

      // Fetch low stock items
      const { data: lowStock } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, low_stock_threshold')
        .lte('stock_quantity', 5) // MVP low stock logic
        .order('stock_quantity', { ascending: true })
        .limit(10);

      // Fetch recent adjustments
      const { data: adjustments } = await supabase
        .from('inventory_adjustments')
        .select(
          `
          id, adjusted_by, new_stock, reason, created_at,
          products ( name, sku ),
          users ( full_name, email )
        `
        )
        .order('created_at', { ascending: false })
        .limit(10);

      setLowStockProducts(lowStock || []);
      setRecentAdjustments(adjustments || []);
      setLoading(false);
    };

    fetchInventoryData();
  }, []);

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'restock':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'damage':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'return':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'transfer':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor inventory health and recent stock movements.
          </p>
        </div>
        <Link
          href="/operations/inventory/adjustment"
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Activity className="h-4 w-4" />
          Adjust Stock
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="overflow-hidden rounded-xl border border-rose-500/20 bg-[#151520] shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 bg-rose-500/5 p-4">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Low Stock Alerts</h2>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                Loading alerts...
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No low stock items!
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {lowStockProducts.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-800 text-slate-400">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          SKU: {item.sku}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${item.stock_quantity === 0 ? 'text-rose-500' : 'text-amber-500'}`}
                      >
                        {item.stock_quantity}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          left
                        </span>
                      </p>
                      <Link
                        href="/operations/inventory/adjustment"
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Restock <ArrowRight className="inline h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Adjustments Log */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 p-4">
            <History className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Recent Movements</h2>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                Loading movements...
              </div>
            ) : recentAdjustments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No recent adjustments.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {recentAdjustments.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-white/5"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {log.products?.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getReasonColor(log.reason)}`}
                        >
                          {log.reason}
                        </span>
                        <span className="text-xs text-slate-500">
                          by {log.users?.full_name?.split(' ')[0] || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${log.adjusted_by > 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {log.adjusted_by > 0 ? '+' : ''}
                        {log.adjusted_by}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
