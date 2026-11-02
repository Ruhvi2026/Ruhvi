'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  PlusCircle,
  Printer,
  Download,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

interface OrderInvoiceRow {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  payment_method?: string;
  shipping_address?: {
    full_name?: string;
    city?: string;
    state?: string;
    phone?: string;
    gstin?: string;
  };
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<OrderInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'intra' | 'inter'>(
    'all'
  );

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, created_at, total, status, payment_method, shipping_address:addresses(*)'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const state = inv.shipping_address?.state || 'West Bengal';
      const isInter = state.toLowerCase() !== 'west bengal';

      if (stateFilter === 'intra' && isInter) return false;
      if (stateFilter === 'inter' && !isInter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const num = (inv.order_number || inv.id).toLowerCase();
      const name = (inv.shipping_address?.full_name || '').toLowerCase();
      const phone = (inv.shipping_address?.phone || '').toLowerCase();

      return num.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [invoices, search, stateFilter]);

  const totalGross = filteredInvoices.reduce(
    (s, i) => s + (Number(i.total) || 0),
    0
  );
  const totalTaxable = Math.round((totalGross / 1.03) * 100) / 100;
  const totalGst = Math.round((totalGross - totalTaxable) * 100) / 100;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
            <FileText className="h-6 w-6 text-amber-400" />
            <span>Sales & GST Tax Invoices</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Compliant with GST Rule 46 • Intra-state (CGST+SGST 1.5% each) &
            Inter-state (IGST 3%)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/accounts/invoices/new"
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-amber-400"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Custom Bill</span>
          </Link>
          <button
            onClick={fetchInvoices}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              Total Filtered Bills
            </div>
            <div className="mt-0.5 font-mono text-xl font-bold text-white">
              {filteredInvoices.length} Invoices
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 font-mono font-bold text-blue-400">
            #
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              Total Taxable Value
            </div>
            <div className="mt-0.5 font-mono text-xl font-bold text-amber-300">
              ₹{totalTaxable.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 font-bold text-amber-400">
            ₹
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              Total 3% GST Output
            </div>
            <div className="mt-0.5 font-mono text-xl font-bold text-purple-300">
              ₹{totalGst.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 font-mono text-xs font-bold text-purple-400">
            GST
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, customer name, phone..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
          />
        </div>

        <div className="flex w-full items-center space-x-2 sm:w-auto">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" /> Place of Supply:
          </span>
          <select
            value={stateFilter}
            onChange={(e: any) => setStateFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400/50 focus:outline-none"
          >
            <option value="all">All States</option>
            <option value="intra">Intra-State (West Bengal - CGST+SGST)</option>
            <option value="inter">Inter-State (Outside WB - IGST)</option>
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        {loading ? (
          <div className="p-12 text-center font-mono text-sm text-slate-400">
            Loading tax invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No invoices match your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">POS / Tax Type</th>
                  <th className="px-6 py-4 text-right">Taxable (₹)</th>
                  <th className="px-6 py-4 text-right">GST (3%)</th>
                  <th className="px-6 py-4 text-right">Grand Total (₹)</th>
                  <th className="px-6 py-4 text-center">Invoice Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredInvoices.map((inv) => {
                  const gross = Number(inv.total) || 0;
                  const taxable = Math.round((gross / 1.03) * 100) / 100;
                  const gst = Math.round((gross - taxable) * 100) / 100;
                  const state = inv.shipping_address?.state || 'West Bengal';
                  const isInter = state.toLowerCase() !== 'west bengal';

                  return (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4 font-bold text-white">
                        RJ-{inv.order_number || inv.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(inv.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-sans text-slate-200">
                        <div className="font-medium">
                          {inv.shipping_address?.full_name ||
                            'Walk-in Customer'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {inv.shipping_address?.city || 'India'} •{' '}
                          {inv.shipping_address?.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-sans">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            isInter
                              ? 'border border-purple-500/20 bg-purple-500/10 text-purple-300'
                              : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          {state} ({isInter ? 'IGST 3%' : 'CGST+SGST 3%'})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">
                        ₹
                        {taxable.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-amber-300">
                        ₹
                        {gst.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        ₹
                        {gross.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/accounts/invoices/${inv.id}`}
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500 hover:text-slate-950"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>View / Print</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
