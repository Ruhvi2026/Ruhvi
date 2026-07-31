'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Clock, CheckCircle2, XCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import { ReturnRequest } from '@/types/database';

const SAMPLE_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-demo-101',
    order_id: 'ord-demo-1001',
    order_number: 'RHV-2026-8942',
    reason: 'Size mismatch / Incorrect fit',
    item_condition: 'tag_intact',
    refund_method: 'wallet',
    comments: 'Requesting size 14 instead of size 12 ring.',
    status: 'approved',
    requested_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ReturnsHistoryPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruhvi_returns_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setReturns(parsed.length > 0 ? parsed : SAMPLE_RETURNS);
      } else {
        setReturns(SAMPLE_RETURNS);
      }
    } catch (e) {
      console.error(e);
      setReturns(SAMPLE_RETURNS);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Approved (Pickup Scheduled)</span>;
      case 'completed':
        return <span className="bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Completed (Refund Issued)</span>;
      case 'rejected':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Rejected</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Under Review</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/account"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900 flex items-center space-x-3">
              <RefreshCw className="w-7 h-7 text-amber-900" />
              <span>Return Requests</span>
            </h1>
            <p className="text-stone-500 text-xs mt-1">Track status & updates on your 7-day return requests</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">Loading return requests...</div>
      ) : returns.length > 0 ? (
        <div className="space-y-4">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs uppercase font-bold text-stone-400">Order Ref:</span>
                  <Link
                    href={`/orders/${ret.order_id}`}
                    className="font-mono font-bold text-xs text-amber-950 hover:underline"
                  >
                    {ret.order_number || ret.order_id}
                  </Link>
                </div>
                {getStatusBadge(ret.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">Reason</span>
                  <span className="font-semibold text-stone-800">{ret.reason}</span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">Refund Preference</span>
                  <span className="font-semibold text-stone-800">
                    {ret.refund_method === 'wallet' ? 'Ruhvi Wallet / Store Credit' : 'Original Payment Method'}
                  </span>
                </div>
              </div>

              {ret.comments && (
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 italic">
                  "{ret.comments}"
                </div>
              )}

              <div className="text-[10px] text-stone-400 font-mono">
                Requested on {new Date(ret.requested_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200 shadow-sm max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center mx-auto">
            <RefreshCw className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-stone-900">No Return Requests</h2>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              You currently have no active or past return requests.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
