'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  PlusCircle,
  ShoppingBag,
  ArrowUpRight,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  IndianRupee,
  ShieldCheck,
  Printer,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  RUHVI_GST_CONFIG,
  numberToIndianWords,
} from '@/lib/accounts/gst-engine';

interface OrderSummary {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  shipping_address?: {
    full_name?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
}

export default function AccountsDashboardPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, created_at, total, status, shipping_address:addresses(*)'
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Could not load live orders from database.');
    } finally {
      setLoading(false);
    }
  };

  // Financial calculations
  const totalGrossSales = orders.reduce(
    (sum, o) => sum + (Number(o.total) || 0),
    0
  );
  // In India jewelry GST is 3% inclusive or added. If total is gross, taxable is total / 1.03
  const taxableValue = Math.round((totalGrossSales / 1.03) * 100) / 100;
  const gstOutputLiability =
    Math.round((totalGrossSales - taxableValue) * 100) / 100;
  const estimatedItc = Math.round(gstOutputLiability * 0.45 * 100) / 100; // estimated 45% ITC from bullion/vendor purchases
  const netGstPayable = Math.max(
    0,
    Math.round((gstOutputLiability - estimatedItc) * 100) / 100
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official GST Compliance Hub</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Accounts & Tax Management
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Real-time Indian GST Rule 46 Tax Invoicing, HSN 7113 Jewelry Tax
              Breakdowns, GSTR-1/3B Automated Filing, and Input Tax Credit
              ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/accounts/invoices/new"
              className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create GST Bill</span>
            </Link>
            <Link
              href="/accounts/gstr"
              className="inline-flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>GSTR-1 JSON</span>
            </Link>
            <button
              onClick={fetchOrders}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-300 transition-colors hover:bg-slate-700"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {/* Gross Sales */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition-colors hover:border-slate-700">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Gross Sales (Total)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            ₹
            {totalGrossSales.toLocaleString('en-IN', {
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Across {orders.length} latest store orders
          </p>
        </div>

        {/* Taxable Turnover */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition-colors hover:border-slate-700">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Taxable Turnover
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-amber-300">
            ₹
            {taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Net value subject to 3% GST
          </p>
        </div>

        {/* Output GST Collected */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition-colors hover:border-slate-700">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Output GST (3%)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-purple-300">
            ₹
            {gstOutputLiability.toLocaleString('en-IN', {
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            CGST + SGST (1.5% each) / IGST (3%)
          </p>
        </div>

        {/* Net GST Payable */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition-colors hover:border-slate-700">
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Net Tax Payable
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-400">
            ₹
            {netGstPayable.toLocaleString('en-IN', {
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            After offsetting ₹{estimatedItc.toLocaleString('en-IN')} ITC
          </p>
        </div>
      </div>

      {/* Compliance Deadlines & Shortcuts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              GSTR-1 Monthly Return
            </div>
            <div className="text-sm font-bold text-white">
              Due Date: 11th Nov 2026
            </div>
            <div className="text-xs font-medium text-emerald-400">
              Ready to Export JSON
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              GSTR-3B Tax Summary
            </div>
            <div className="text-sm font-bold text-white">
              Due Date: 20th Nov 2026
            </div>
            <div className="text-xs text-slate-400">
              Monthly Tax Payment Form
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400">
              Jewelry TCS (206C)
            </div>
            <div className="text-sm font-bold text-white">
              Limit: &gt; ₹5,00,000 Cash
            </div>
            <div className="text-xs text-slate-400">1% TCS auto-evaluated</div>
          </div>
        </div>
      </div>

      {/* Recent Orders / GST Tax Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Receipt className="h-5 w-5 text-amber-400" />
              <span>Recent Sales Tax Invoices</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Synced with store orders • Ready for Rule 46 Tax Invoice
              generation & print
            </p>
          </div>

          <Link
            href="/accounts/invoices"
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
          >
            <span>View All Invoices</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center font-mono text-sm text-slate-400">
            Fetching sales records...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No orders found yet. Create your first manual GST invoice!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Invoice / Order #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Place of Supply</th>
                  <th className="px-6 py-4 text-right">Taxable (₹)</th>
                  <th className="px-6 py-4 text-right">GST (3%)</th>
                  <th className="px-6 py-4 text-right">Total (₹)</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {orders.map((ord) => {
                  const gross = Number(ord.total) || 0;
                  const taxable = Math.round((gross / 1.03) * 100) / 100;
                  const gst = Math.round((gross - taxable) * 100) / 100;
                  const state = ord.shipping_address?.state || 'West Bengal';
                  const isInter = state.toLowerCase() !== 'west bengal';

                  return (
                    <tr
                      key={ord.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        INV-{ord.order_number || ord.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-sans text-slate-200">
                        <div className="font-medium">
                          {ord.shipping_address?.full_name ||
                            'Walk-in / Online Client'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ord.shipping_address?.city || 'India'}
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
                          href={`/accounts/invoices/${ord.id}`}
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500 hover:text-slate-950"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print Bill</span>
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
