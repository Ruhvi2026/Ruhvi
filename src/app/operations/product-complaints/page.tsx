'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Ticket,
  MessageSquareWarning,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductComplaintsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [unlinked, setUnlinked] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // All tickets joined to products (left join so we can count unlinked too)
      const { data } = await supabase.from('support_tickets').select(
        `product_id, status, priority, created_at,
         product:products!left(id, name, sku)`
      );

      const all = data || [];
      const byProduct = new Map<
        string,
        {
          id: string;
          name: string;
          sku: string;
          total: number;
          open: number;
          resolved: number;
          urgent: number;
        }
      >();

      all.forEach((t: any) => {
        if (!t.product_id || !t.product) {
          return;
        }
        const pid = t.product_id;
        if (!byProduct.has(pid)) {
          byProduct.set(pid, {
            id: pid,
            name: t.product.name,
            sku: t.product.sku,
            total: 0,
            open: 0,
            resolved: 0,
            urgent: 0,
          });
        }
        const entry = byProduct.get(pid)!;
        entry.total++;
        if (['resolved', 'closed'].includes(t.status)) entry.resolved++;
        else entry.open++;
        if (t.priority === 'urgent') entry.urgent++;
      });

      const unlinkedCount = all.filter(
        (t: any) => !t.product_id || !t.product
      ).length;
      setUnlinked(unlinkedCount);

      const arr = Array.from(byProduct.values());
      arr.sort((a, b) => b.total - a.total);
      setRows(arr);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        // Composite: most complaints first, then open, then urgent
        if (b.total !== a.total) return b.total - a.total;
        if (b.open !== a.open) return b.open - a.open;
        return b.urgent - a.urgent;
      }),
    [rows]
  );

  const totalTickets = rows.reduce((s, r) => s + r.total, 0);
  const totalOpen = rows.reduce((s, r) => s + r.open, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/dashboard"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Product Complaint Insights
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Most-complained-about products, joined from support tickets.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Products Complained
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
            Linked Tickets
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{totalTickets}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Open
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{totalOpen}</p>
        </div>
        <div className="rounded-xl border border-slate-500/20 bg-[#151520] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Unlinked Tickets
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{unlinked}</p>
        </div>
      </div>

      {unlinked > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#151520] p-4 text-xs text-slate-400">
          <strong>{unlinked}</strong> support ticket(s) have no product link and
          are excluded from this ranking. Tickets get a product link when the
          customer selects a product while creating the ticket.
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" />
          Loading ticket data...
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#151520] p-16 text-center">
          <MessageSquareWarning className="mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-300">
            No product-linked complaints yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            This view will populate once support tickets are created with a
            linked product.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Tickets
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Open</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Resolved
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Urgent</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Complaint Index
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.map((r, i) => {
                  const idx =
                    totalTickets > 0
                      ? Math.round((r.total / totalTickets) * 1000) / 10
                      : 0;
                  const isWorst = i === 0 && r.total > 0;
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors hover:bg-white/5 ${
                        isWorst ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isWorst && (
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                          )}
                          <div>
                            <p className="font-medium text-white">{r.name}</p>
                            <p className="font-mono text-[10px] text-slate-500">
                              {r.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {r.total}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400">
                        {r.open}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {r.resolved}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-400">
                        {r.urgent}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 font-medium text-indigo-400">
                          <Ticket className="h-3 w-3" />
                          {idx}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
