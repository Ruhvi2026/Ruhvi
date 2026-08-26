'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { Order, ReturnRequest } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function OrderReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [reason, setReason] = useState('Size mismatch');
  const [tagIntact, setTagIntact] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'original' | 'wallet'>(
    'original'
  );
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      if (!user) {
        try {
          const saved = localStorage.getItem('ruhvi_orders_v1');
          if (saved) {
            const parsed: Order[] = JSON.parse(saved);
            const match = parsed.find(
              (o) => o.id === orderId || o.order_number === orderId
            );
            if (isMounted && match) setOrder(match);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        let { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, product(*))')
          .eq('id', orderId)
          .maybeSingle();

        if (!data && !error) {
          const byNumber = await supabase
            .from('orders')
            .select('*, order_items(*, product(*))')
            .eq('order_number', orderId)
            .maybeSingle();
          data = byNumber.data;
          error = byNumber.error;
        }

        if (error) throw error;
        if (isMounted && data) setOrder(data as Order);
      } catch (err) {
        console.error('Error fetching real order:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, user]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagIntact) {
      setErrorMessage(
        'Returns can only be accepted if the security/authenticity tag remains intact.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    if (user) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('returns').insert({
          order_id: order?.id || orderId,
          user_id: user.id,
          reason,
          status: 'requested',
          item_condition: 'tag_intact',
          refund_method: refundMethod,
          comments,
        });

        if (error) throw error;

        toast.success('Return request submitted successfully.');
        setTimeout(() => {
          setIsSubmitting(false);
          router.push('/account/returns');
        }, 600);
        return;
      } catch (err) {
        console.error('Failed to submit return:', err);
        setErrorMessage(
          'Failed to submit return request. Please contact support@ruhvi.in.'
        );
        setIsSubmitting(false);
        return;
      }
    }

    // Guest fallback — store locally
    const newReturn: ReturnRequest = {
      id: `ret-${Date.now()}`,
      order_id: order?.id || orderId,
      order_number: order?.order_number || 'RHV-2026-8942',
      reason,
      item_condition: 'tag_intact',
      refund_method: refundMethod,
      comments,
      status: 'requested',
      requested_at: new Date().toISOString(),
      order: order || undefined,
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem('ruhvi_returns_v1') || '[]'
      );
      localStorage.setItem(
        'ruhvi_returns_v1',
        JSON.stringify([newReturn, ...existing])
      );
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/account/returns');
    }, 600);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-stone-500">
        Loading order return eligibility...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-stone-200 pb-6">
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900">
            <RefreshCw className="h-7 w-7 text-amber-900" />
            <span>7-Day Return Request</span>
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Order:{' '}
            <span className="font-mono font-bold text-stone-900">
              {order?.order_number || orderId}
            </span>
          </p>
        </div>
      </div>

      {/* Policy banner */}
      <div className="flex items-start space-x-3 rounded-xl border border-amber-900/10 bg-amber-950/5 p-4 text-xs text-amber-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-800" />
        <div className="space-y-1">
          <span className="font-bold">
            Ruhvi 7-Day Hassle-Free Return Guarantee
          </span>
          <p className="text-xs leading-relaxed text-stone-600">
            All fine jewellery items are eligible for return within 7 days of
            delivery provided the security seal and authenticity tag are intact
            and un-tampered.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Return Request Form */}
      <form
        onSubmit={handleSubmitReturn}
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h3 className="border-b border-stone-100 pb-3 font-serif text-lg font-bold text-stone-900">
          Return Request Details
        </h3>

        <div className="space-y-4 text-xs">
          {/* Reason Selector */}
          <div>
            <label className="mb-1 block font-semibold text-stone-700">
              Reason for Return *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Size mismatch">
                Size mismatch / Incorrect fit
              </option>
              <option value="Defective or damaged">
                Defective or damaged piece
              </option>
              <option value="Wrong item received">Wrong item received</option>
              <option value="Not as pictured">
                Design differs from expectations
              </option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          {/* Tag Condition Verification Checkbox */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <label className="flex cursor-pointer items-start space-x-3">
              <input
                type="checkbox"
                required
                checked={tagIntact}
                onChange={(e) => setTagIntact(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-amber-900"
              />
              <div>
                <span className="font-bold text-stone-900">
                  I confirm that the original Ruhvi security seal & authenticity
                  tag is unbroken and intact *
                </span>
                <p className="mt-0.5 text-xs text-stone-500">
                  Items with broken or tampered security tags cannot be accepted
                  under GSTR return rules.
                </p>
              </div>
            </label>
          </div>

          {/* Refund Method Selector */}
          <div>
            <label className="mb-2 block font-semibold text-stone-700">
              Preferred Refund Method *
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                onClick={() => setRefundMethod('original')}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  refundMethod === 'original'
                    ? 'border-amber-900 bg-amber-950/5 font-semibold ring-1 ring-amber-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="text-stone-900">Original Payment Source</div>
                  <div className="text-xs text-stone-500">
                    Refund back to original UPI/Card/Bank (5-7 days)
                  </div>
                </div>
                {refundMethod === 'original' && (
                  <CheckCircle2 className="h-4 w-4 text-amber-900" />
                )}
              </div>

              <div
                onClick={() => setRefundMethod('wallet')}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  refundMethod === 'wallet'
                    ? 'border-amber-900 bg-amber-950/5 font-semibold ring-1 ring-amber-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="text-stone-900">
                    Ruhvi Store Credit / Wallet
                  </div>
                  <div className="text-xs text-stone-500">
                    Instant credit upon return pickup (Bonus 5% cashback)
                  </div>
                </div>
                {refundMethod === 'wallet' && (
                  <CheckCircle2 className="h-4 w-4 text-amber-900" />
                )}
              </div>
            </div>
          </div>

          {/* Comments & Additional details */}
          <div>
            <label className="mb-1 block font-semibold text-stone-700">
              Additional Comments / Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Describe any specifics regarding the issue or pickup instructions..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full rounded-xl border border-stone-300 p-3 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/orders/${orderId}`)}
            className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-amber-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100 shadow transition-all hover:bg-amber-900 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
