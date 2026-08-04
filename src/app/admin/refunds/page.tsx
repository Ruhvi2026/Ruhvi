'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { RotateCcw, Search, RefreshCw, Check, X, Clock, AlertTriangle, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  refund_amount?: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  order?: { order_number: string; total: number };
  user?: { full_name: string; email: string };
}

const STATUS_CFG = {
  pending:   { label: 'Pending',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved:  { label: 'Approved',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  processed: { label: 'Processed', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected:  { label: 'Rejected',  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'processed' | 'rejected'>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchRefunds(); }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('return_requests')
        .select(`
          *,
          order:orders(order_number, total),
          user:users(full_name, email)
        `)
        .order('created_at', { ascending: false });
      setRefunds((data as any) || []);
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (refundId: string, newStatus: string) => {
    setProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('return_requests')
        .update({
          status: newStatus,
          admin_notes: adminNote || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundId);
      if (error) throw error;
      setRefunds((prev) =>
        prev.map((r) => r.id === refundId ? { ...r, status: newStatus as any, admin_notes: adminNote } : r)
      );
      setSelectedRefund(null);
      setAdminNote('');
    } catch {
      alert('Failed to update refund status.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = useMemo(() =>
    refunds.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || r.order_id?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    }),
    [refunds, search, statusFilter]
  );

  const pendingCount = refunds.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Refunds & Returns</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {pendingCount > 0 ? (
              <span className="text-amber-400">{pendingCount} pending review</span>
            ) : (
              `${refunds.length} total requests`
            )}
          </p>
        </div>
        <button
          onClick={fetchRefunds}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending',   value: refunds.filter((r) => r.status === 'pending').length,   color: 'text-amber-400' },
          { label: 'Approved',  value: refunds.filter((r) => r.status === 'approved').length,  color: 'text-blue-400' },
          { label: 'Processed', value: refunds.filter((r) => r.status === 'processed').length, color: 'text-emerald-400' },
          { label: 'Rejected',  value: refunds.filter((r) => r.status === 'rejected').length,  color: 'text-rose-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#131726] border border-white/5 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order ID or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'approved', 'processed', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                statusFilter === s
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading refund requests...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <RotateCcw className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No refund requests found</p>
            <p className="text-slate-600 text-xs mt-1">Refund requests from customers will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Request</th>
                  <th className="px-5 py-3 text-left font-semibold">Customer</th>
                  <th className="px-5 py-3 text-left font-semibold">Order</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((refund) => {
                  const cfg = STATUS_CFG[refund.status];
                  return (
                    <tr key={refund.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-400 text-[10px]">
                        {refund.id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-200 font-medium">
                          {(refund.user as any)?.full_name || 'Customer'}
                        </div>
                        <div className="text-slate-600 text-[10px]">
                          {(refund.user as any)?.email}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${refund.order_id}`}
                          className="text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
                        >
                          #{(refund.order as any)?.order_number || 'N/A'}
                        </Link>
                        {(refund.order as any)?.total && (
                          <div className="text-slate-500 text-[10px]">
                            ₹{Number((refund.order as any).total).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 max-w-[150px] truncate">
                        {refund.reason}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(refund.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedRefund(refund);
                            setAdminNote(refund.admin_notes || '');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors border border-white/10 ml-auto"
                        >
                          <Eye className="w-3 h-3" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1f35] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Review Refund Request</h2>
              <button onClick={() => setSelectedRefund(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="text-white font-medium">{(selectedRefund.user as any)?.full_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order:</span>
                  <span className="text-emerald-400 font-mono">#{(selectedRefund.order as any)?.order_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-white font-bold">₹{Number((selectedRefund.order as any)?.total || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CFG[selectedRefund.status].cls}`}>
                    {STATUS_CFG[selectedRefund.status].label}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason</p>
                <p className="text-slate-300 text-xs bg-white/5 rounded-xl p-3">{selectedRefund.reason}</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  placeholder="Internal note about this refund..."
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleAction(selectedRefund.id, 'rejected')}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/20 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => handleAction(selectedRefund.id, 'approved')}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {processing ? 'Saving...' : 'Approve Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
