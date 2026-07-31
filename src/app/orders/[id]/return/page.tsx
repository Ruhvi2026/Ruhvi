'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { Order, ReturnRequest } from '@/types/database';

export default function OrderReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [reason, setReason] = useState('Size mismatch');
  const [tagIntact, setTagIntact] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'original' | 'wallet'>('original');
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruhvi_orders_v1');
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        const match = parsed.find((o) => o.id === orderId || o.order_number === orderId);
        if (match) setOrder(match);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagIntact) {
      setErrorMessage('Returns can only be accepted if the security/authenticity tag remains intact.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

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

    // Store in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('ruhvi_returns_v1') || '[]');
      localStorage.setItem('ruhvi_returns_v1', JSON.stringify([newReturn, ...existing]));
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/account/returns');
    }, 600);
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-stone-500">Loading order return eligibility...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-stone-200 pb-6">
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 flex items-center space-x-3">
            <RefreshCw className="w-7 h-7 text-amber-900" />
            <span>7-Day Return Request</span>
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Order: <span className="font-mono font-bold text-stone-900">{order?.order_number || orderId}</span>
          </p>
        </div>
      </div>

      {/* Policy banner */}
      <div className="bg-amber-950/5 border border-amber-900/10 p-4 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Ruhvi 7-Day Hassle-Free Return Guarantee</span>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            All fine jewellery items are eligible for return within 7 days of delivery provided the security seal and authenticity tag are intact and un-tampered.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Return Request Form */}
      <form onSubmit={handleSubmitReturn} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
          Return Request Details
        </h3>

        <div className="space-y-4 text-xs">
          {/* Reason Selector */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">Reason for Return *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="Size mismatch">Size mismatch / Incorrect fit</option>
              <option value="Defective or damaged">Defective or damaged piece</option>
              <option value="Wrong item received">Wrong item received</option>
              <option value="Not as pictured">Design differs from expectations</option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          {/* Tag Condition Verification Checkbox */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={tagIntact}
                onChange={(e) => setTagIntact(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded mt-0.5"
              />
              <div>
                <span className="font-bold text-stone-900">
                  I confirm that the original Ruhvi security seal & authenticity tag is unbroken and intact *
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Items with broken or tampered security tags cannot be accepted under GSTR return rules.
                </p>
              </div>
            </label>
          </div>

          {/* Refund Method Selector */}
          <div>
            <label className="block text-stone-700 font-semibold mb-2">Preferred Refund Method *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setRefundMethod('original')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  refundMethod === 'original'
                    ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900 font-semibold'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="text-stone-900">Original Payment Source</div>
                  <div className="text-[10px] text-stone-500">Refund back to original UPI/Card/Bank (5-7 days)</div>
                </div>
                {refundMethod === 'original' && <CheckCircle2 className="w-4 h-4 text-amber-900" />}
              </div>

              <div
                onClick={() => setRefundMethod('wallet')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  refundMethod === 'wallet'
                    ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900 font-semibold'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="text-stone-900">Ruhvi Store Credit / Wallet</div>
                  <div className="text-[10px] text-stone-500">Instant credit upon return pickup (Bonus 5% cashback)</div>
                </div>
                {refundMethod === 'wallet' && <CheckCircle2 className="w-4 h-4 text-amber-900" />}
              </div>
            </div>
          </div>

          {/* Comments & Additional details */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">Additional Comments / Instructions</label>
            <textarea
              rows={3}
              placeholder="Describe any specifics regarding the issue or pickup instructions..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={() => router.push(`/orders/${orderId}`)}
            className="px-4 py-2.5 text-stone-500 hover:text-stone-800 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-amber-950 text-amber-100 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-amber-900 shadow transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
