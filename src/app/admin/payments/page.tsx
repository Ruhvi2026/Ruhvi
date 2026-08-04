'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { CreditCard, Search, RefreshCw, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  gateway_ref?: string;
  created_at: string;
  order?: { order_number: string };
}

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'phonepe' | 'cod'>('all');

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // Fall back to orders table for payment data until a dedicated transactions table exists
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total, payment_method, payment_status, transaction_id, created_at')
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((o: any) => ({
        id: o.id,
        order_id: o.id,
        amount: o.total,
        method: o.payment_method || 'unknown',
        status: o.payment_status || (o.payment_method === 'cod' ? 'pending' : 'success'),
        gateway_ref: o.transaction_id || null,
        created_at: o.created_at,
        order: { order_number: o.order_number },
      }));
      setTransactions(mapped);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() =>
    transactions.filter((t) => {
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchMethod = methodFilter === 'all' || t.method === methodFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || t.order?.order_number?.toLowerCase().includes(q) || t.gateway_ref?.toLowerCase().includes(q);
      return matchStatus && matchMethod && matchSearch;
    }),
    [transactions, search, statusFilter, methodFilter]
  );

  const totalCollected = transactions
    .filter((t) => t.status !== 'failed')
    .reduce((s, t) => s + Number(t.amount), 0);

  const phonepeTotal = transactions
    .filter((t) => t.method === 'phonepe' && t.status !== 'failed')
    .reduce((s, t) => s + Number(t.amount), 0);

  const codTotal = transactions
    .filter((t) => t.method === 'cod')
    .reduce((s, t) => s + Number(t.amount), 0);

  const failedCount = transactions.filter((t) => t.status === 'failed').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Payments</h1>
          <p className="text-slate-500 text-xs mt-0.5">Transaction log & payment reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: `₹${totalCollected.toLocaleString('en-IN')}`, color: 'text-white' },
          { label: 'PhonePe Online', value: `₹${phonepeTotal.toLocaleString('en-IN')}`, color: 'text-purple-400' },
          { label: 'COD Pending', value: `₹${codTotal.toLocaleString('en-IN')}`, color: 'text-amber-400' },
          { label: 'Failed Transactions', value: failedCount.toString(), color: failedCount > 0 ? 'text-rose-400' : 'text-slate-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#131726] border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order number or transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as any)}
          className="bg-white/5 border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="all" className="bg-[#1a1f35]">All Methods</option>
          <option value="phonepe" className="bg-[#1a1f35]">PhonePe</option>
          <option value="cod" className="bg-[#1a1f35]">Cash on Delivery</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-white/5 border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="all" className="bg-[#1a1f35]">All Statuses</option>
          <option value="success" className="bg-[#1a1f35]">Successful</option>
          <option value="pending" className="bg-[#1a1f35]">Pending</option>
          <option value="failed" className="bg-[#1a1f35]">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Order</th>
                  <th className="px-5 py-3 text-left font-semibold">Method</th>
                  <th className="px-5 py-3 text-left font-semibold">Transaction ID</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${tx.order_id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
                      >
                        #{tx.order?.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        tx.method === 'cod'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {tx.method === 'cod' ? 'COD' : 'PhonePe'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400 text-[11px]">
                      {tx.gateway_ref || <span className="text-slate-700 italic">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold w-fit px-2 py-0.5 rounded-full border ${
                        tx.status === 'success' || tx.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : tx.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {tx.status === 'success' || tx.status === 'paid' ? (
                          <CheckCircle className="w-2.5 h-2.5" />
                        ) : tx.status === 'failed' ? (
                          <XCircle className="w-2.5 h-2.5" />
                        ) : (
                          <Clock className="w-2.5 h-2.5" />
                        )}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-white">
                      ₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
