'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { CheckCircle2, Package, FileText, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export default function OrderSuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const estimatedDeliveryDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });


  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-8">
      {/* Icon & Title */}
      <div className="space-y-3">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-900 rounded-full text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Order Confirmed & Insured</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Thank You For Your Order!
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
          Your order ID is <span className="font-mono font-bold text-stone-900">{orderId}</span>. We are preparing your handcrafted fine jewellery piece with extra care.
        </p>
      </div>

      {/* Delivery Banner Card */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center space-x-3">
            <Package className="w-5 h-5 text-amber-800" />
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Estimated Delivery</div>
              <div className="text-sm font-bold text-stone-900">{estimatedDeliveryDate}</div>
            </div>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded">
            Confirmed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-600">
          <div className="space-y-1">
            <div className="font-semibold text-stone-900">Confirmation Email</div>
            <div>Order receipt & tracking updates sent to your registered email.</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-stone-900 flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>Tamper-Proof Insured Shipping</span>
            </div>
            <div>Shipped in a sealed security bag with 100% transit insurance.</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          href={`/orders/${orderId}`}
          className="w-full sm:w-auto px-6 py-3 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>View Order & GST Invoice</span>
        </Link>

        <Link
          href="/products"
          className="w-full sm:w-auto px-6 py-3 border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center space-x-2"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
