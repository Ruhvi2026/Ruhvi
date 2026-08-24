'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { RotateCcw, Search, RefreshCw, Check, X, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ReturnStatus } from '@/types/database';

interface RefundRequest {
  id: string;
  order_id: string;
  reason: string;
  status: ReturnStatus;
  refund_method?: string;
  requested_at: string;
  resolved_at?: string;
  order?: {
    order_number: string;
    total: number;
    user?: { full_name: string; email: string } | null;
  };
}

const STATUS_CFG: Record<ReturnStatus, { label: string; cls: string }> = {
  requested: {
    label: 'Requested',
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  approved: {
    label: 'Approved',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null
  );
  const [refundMethod, setRefundMethod] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('returns')
        .select(
          `
          *,
          order:orders(order_number, total, user:users(full_name, email))
        `
        )
        .order('requested_at', { ascending: false });
      setRefunds((data as any) || []);
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (refundId: string, newStatus: ReturnStatus) => {
    setProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('returns')
        .update({
          status: newStatus,
          ...(newStatus === 'approved'
            ? { refund_method: refundMethod || 'original' }
            : {}),
          resolved_at: new Date().toISOString(),
        })
        .eq('id', refundId);
      if (error) throw error;
      setRefunds((prev) =>
        prev.map((r) =>
          r.id === refundId
            ? {
                ...r,
                status: newStatus,
                refund_method: refundMethod || r.refund_method,
              }
            : r
        )
      );
      setSelectedRefund(null);
      setRefundMethod('');
    } catch {
      alert('Failed to update refund status.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = useMemo(
    () =>
      refunds.filter((r) => {
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          r.order_id?.toLowerCase().includes(q) ||
          r.order?.order_number?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      }),
    [refunds, search, statusFilter]
  );

  const requestedCount = refunds.filter((r) => r.status === 'requested').length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Refunds & Returns</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {requestedCount > 0 ? (
              <span className="text-amber-400">
                {requestedCount} pending review
              </span>
            ) : (
              `${refunds.length} total requests`
            )}
          </p>
        </div>
        <button
          onClick={fetchRefunds}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Requested',
            value: refunds.filter((r) => r.status === 'requested').length,
            color: 'text-amber-400',
          },
          {
            label: 'Approved',
            value: refunds.filter((r) => r.status === 'approved').length,
            color: 'text-blue-400',
          },
          {
            label: 'Completed',
            value: refunds.filter((r) => r.status === 'completed').length,
            color: 'text-emerald-400',
          },
          {
            label: 'Rejected',
            value: refunds.filter((r) => r.status === 'rejected').length,
            color: 'text-rose-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 bg-[#131726] p-4 text-center"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order ID or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-1">
          {(
            ['all', 'requested', 'approved', 'completed', 'rejected'] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading refund requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <RotateCcw className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              No refund requests found
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Refund requests from customers will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left font-semibold">Request</th>
                  <th className="px-5 py-3 text-left font-semibold">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left font-semibold">Order</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((refund) => {
                  const cfg = STATUS_CFG[refund.status];
                  return (
                    <tr
                      key={refund.id}
                      className="hover:bg-white/2 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-400">
                        {refund.id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-200">
                          {(refund.order as any)?.user?.full_name || 'Customer'}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {(refund.order as any)?.user?.email}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${refund.order_id}`}
                          className="font-mono font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          #{(refund.order as any)?.order_number || 'N/A'}
                        </Link>
                        {(refund.order as any)?.total && (
                          <div className="text-[10px] text-slate-500">
                            ₹
                            {Number((refund.order as any).total).toLocaleString(
                              'en-IN'
                            )}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[150px] truncate px-5 py-3 text-slate-400">
                        {refund.reason}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(refund.requested_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedRefund(refund);
                            setRefundMethod(refund.refund_method || '');
                          }}
                          className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition-colors hover:bg-white/10"
                        >
                          <Eye className="h-3 w-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f35] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h2 className="text-sm font-bold text-white">
                Review Refund Request
              </h2>
              <button
                onClick={() => setSelectedRefund(null)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium text-white">
                    {(selectedRefund.order as any)?.user?.full_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order:</span>
                  <span className="font-mono text-emerald-400">
                    #{(selectedRefund.order as any)?.order_number || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-white">
                    ₹
                    {Number(
                      (selectedRefund.order as any)?.total || 0
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CFG[selectedRefund.status].cls}`}
                  >
                    {STATUS_CFG[selectedRefund.status].label}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Reason
                </p>
                <p className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                  {selectedRefund.reason}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Refund Method
                </label>
                <input
                  type="text"
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. original, wallet, bank_transfer"
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2">
                <button
                  onClick={() => handleAction(selectedRefund.id, 'rejected')}
                  disabled={processing}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => handleAction(selectedRefund.id, 'approved')}
                  disabled={processing}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
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
