'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Search, RefreshCw, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Shipment {
  id: string;
  order_id: string;
  courier_provider: string;
  awb_number?: string;
  tracking_url?: string;
  status: string;
  shipped_at?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  delivery_attempts: number;
  order?: { order_number: string };
}

export default function ShipmentsManagementPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchShipments(); }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('shipments')
        .select('*, order:orders(order_number)')
        .order('created_at', { ascending: false })
        .limit(200);
      setShipments((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = shipments.filter((s) =>
    !search ||
    s.awb_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.order?.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; cls: string }> = {
      created: { label: 'Created', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
      shipped: { label: 'Shipped', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
      in_transit: { label: 'In Transit', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      out_for_delivery: { label: 'Out for Delivery', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
      delivered: { label: 'Delivered', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      delivery_failed: { label: 'Delivery Failed', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      rto_initiated: { label: 'RTO Initiated', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
      rto_received: { label: 'RTO Received', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
      cancelled: { label: 'Cancelled', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    };
    const c = config[status] || { label: status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Shipments</h1>
          <p className="mt-0.5 text-xs text-slate-500">All shipments with courier tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search AWB or order..."
              className="bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-600"
            />
          </div>
          <button onClick={fetchShipments} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center text-slate-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
          <Truck className="mx-auto mb-4 h-12 w-12 text-slate-700" />
          <h2 className="text-lg font-semibold text-white">No Shipments</h2>
          <p className="mt-1 text-sm text-slate-400">No shipments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#131726]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">AWB</th>
                <th className="px-4 py-3 font-semibold">Provider</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Attempts</th>
                <th className="px-4 py-3 font-semibold">Shipped At</th>
                <th className="px-4 py-3 font-semibold">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
                  <td className="px-4 py-3 font-bold text-white">#{s.order?.order_number}</td>
                  <td className="px-4 py-3 font-mono">{s.awb_number || '—'}</td>
                  <td className="px-4 py-3 capitalize">{s.courier_provider}</td>
                  <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                  <td className="px-4 py-3">{s.delivery_attempts}</td>
                  <td className="px-4 py-3">{s.shipped_at ? new Date(s.shipped_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    {s.tracking_url ? (
                      <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                        <ExternalLink className="h-3 w-3" />
                        Track
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}