'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { ReturnRequest } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface ReturnRow {
  id: string;
  order_id: string;
  reason: string;
  status: ReturnRequest['status'];
  refund_method: string;
  item_condition?: string | null;
  comments?: string | null;
  requested_at: string;
  resolved_at?: string | null;
  order?: { order_number: string } | null;
}

export default function ReturnsHistoryPage() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReturns() {
      if (!user) {
        try {
          const saved = localStorage.getItem('ruhvi_returns_v1');
          if (saved) setReturns(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('returns')
          .select('*, order:orders!inner(order_number)')
          .eq('order.user_id', user.id)
          .order('requested_at', { ascending: false });

        if (error) throw error;

        const mapped: ReturnRequest[] = ((data as ReturnRow[]) || []).map(
          (r) => ({
            id: r.id,
            order_id: r.order_id,
            order_number: r.order?.order_number,
            reason: r.reason,
            item_condition: r.item_condition || undefined,
            status: r.status,
            refund_method: r.refund_method,
            comments: r.comments || undefined,
            requested_at: r.requested_at,
            resolved_at: r.resolved_at || undefined,
          })
        );

        setReturns(mapped);
      } catch (err) {
        console.error('Error fetching returns:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReturns();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Approved (Pickup Scheduled)
          </span>
        );
      case 'completed':
        return (
          <span className="rounded bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
            Completed (Refund Issued)
          </span>
        );
      case 'rejected':
        return (
          <span className="rounded bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="rounded bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
            Under Review
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/account"
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900">
              <RefreshCw className="h-7 w-7 text-amber-900" />
              <span>Return Requests</span>
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Track status & updates on your 7-day return requests
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">
          Loading return requests...
        </div>
      ) : returns.length > 0 ? (
        <div className="space-y-4">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold uppercase text-stone-400">
                    Order Ref:
                  </span>
                  <Link
                    href={`/orders/${ret.order_id}`}
                    className="font-mono text-xs font-bold text-amber-950 hover:underline"
                  >
                    {ret.order_number || ret.order_id}
                  </Link>
                </div>
                {getStatusBadge(ret.status)}
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-stone-400">
                    Reason
                  </span>
                  <span className="font-semibold text-stone-800">
                    {ret.reason}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold uppercase text-stone-400">
                    Refund Preference
                  </span>
                  <span className="font-semibold text-stone-800">
                    {ret.refund_method === 'wallet'
                      ? 'Ruhvi Wallet / Store Credit'
                      : 'Original Payment Method'}
                  </span>
                </div>
              </div>

              {ret.comments && (
                <div className="rounded-xl bg-stone-50 p-3 text-xs italic text-stone-600">
                  "{ret.comments}"
                </div>
              )}

              <div className="font-mono text-[10px] text-stone-400">
                Requested on{' '}
                {new Date(ret.requested_at || Date.now()).toLocaleDateString(
                  'en-IN',
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-stone-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-900">
            <RefreshCw className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              No Return Requests
            </h2>
            <p className="mx-auto max-w-xs text-xs text-stone-500">
              You currently have no active or past return requests.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
