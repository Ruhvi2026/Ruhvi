'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Package,
  FileText,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Crown,
  Gift,
  Clock,
  Coins,
  MessageCircle,
} from 'lucide-react';
import { ecommerceEvent } from '@/lib/gtag';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  const { user } = useAuth();
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  const estimatedDeliveryDate = new Date(
    Date.now() + 4 * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Track GA4 purchase event & load order details
  useEffect(() => {
    let isMounted = true;
    try {
      const existingOrders = JSON.parse(
        localStorage.getItem('ruhvi_orders_v1') || '[]'
      );
      const order = existingOrders.find(
        (o: any) => o.id === orderId || o.order_number === orderId
      );
      if (order) {
        setCurrentOrder(order);

        if (!order.ga4_tracked) {
          ecommerceEvent('purchase', {
            transaction_id: order.id,
            currency: 'INR',
            value: order.total,
            coupon: order.coupon_discount > 0 ? 'COUPON_APPLIED' : undefined,
            items:
              order.order_items?.map((item: any) => ({
                item_id: item.product_id,
                item_name: item.sku,
                price: item.price_at_purchase,
                quantity: item.quantity,
              })) || [],
          });

          // Mark as tracked to prevent duplicate events on refresh
          order.ga4_tracked = true;
          localStorage.setItem(
            'ruhvi_orders_v1',
            JSON.stringify(existingOrders)
          );
        }
      } else {
        // Fallback fetch from Supabase
        const supabase = createClient();
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .maybeSingle()
          .then(({ data }: any) => {
            if (isMounted && data) {
              setCurrentOrder(data);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('Failed to track purchase or load order', e);
    }

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const isVip = Boolean(currentOrder?.is_vip || user?.is_vip);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-16 text-center">
      {/* Icon & Title */}
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>Order Confirmed & Insured</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
          Thank You For Your Order!
        </h1>
        <p className="mx-auto max-w-md text-xs text-stone-500 sm:text-sm">
          Your order ID is{' '}
          <span className="font-mono font-bold text-stone-900">
            {currentOrder?.order_number || orderId}
          </span>
          . We are preparing your handcrafted fine jewellery piece with extra
          care.
        </p>
      </div>

      {/* Delivery Banner Card */}
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-amber-800" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Estimated Delivery
              </div>
              <div className="text-sm font-bold text-stone-900">
                {estimatedDeliveryDate}
              </div>
            </div>
          </div>
          <span className="rounded bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Confirmed
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs text-stone-600 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="font-semibold text-stone-900">
              Confirmation Email
            </div>
            <div>
              Order receipt & tracking updates sent to your registered email.
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-1 font-semibold text-stone-900">
              <ShieldCheck className="h-4 w-4 text-amber-800" />
              <span>Tamper-Proof Insured Shipping</span>
            </div>
            <div>
              Shipped in a sealed security bag with 100% transit insurance.
            </div>
          </div>
        </div>
      </div>

      {/* Ruhvi Privé VIP Priority Care Seal */}
      {isVip && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-stone-50 p-6 text-left shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/70 pb-4">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 shadow-md">
                <Crown className="h-5 w-5 fill-current" />
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
                  Exclusive Privilege
                </span>
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Ruhvi Privé Priority Care Dispatch
                </h2>
              </div>
            </div>
            <span className="inline-flex items-center space-x-1.5 rounded-full border border-amber-300 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-900">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>VIP White-Glove Handled</span>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
            <div className="space-y-1 rounded-xl border border-amber-200/60 bg-white/70 p-3.5 backdrop-blur-sm">
              <div className="flex items-center space-x-1.5 font-bold text-stone-900">
                <Clock className="h-4 w-4 text-amber-700" />
                <span>Priority Express Dispatch</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Fast-tracked queue. Dispatched with express courier partners
                within 24 hours.
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-amber-200/60 bg-white/70 p-3.5 backdrop-blur-sm">
              <div className="flex items-center space-x-1.5 font-bold text-stone-900">
                <Gift className="h-4 w-4 text-amber-700" />
                <span>Luxury Velvet Keepsake</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Hand-inspected & packaged inside our signature Privé travel
                velvet keepsake.
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-amber-200/60 bg-white/70 p-3.5 backdrop-blur-sm">
              <div className="flex items-center space-x-1.5 font-bold text-stone-900">
                <Coins className="h-4 w-4 text-amber-700" />
                <span>2X Double Coins</span>
              </div>
              <p className="text-[11px] text-stone-600">
                10% cashback value in Reward Coins will be credited directly on
                delivery.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/60 pt-3.5 text-xs">
            <span className="text-stone-600">
              Need custom packaging or express delivery tracking? Dedicated VIP
              Concierge on WhatsApp:
            </span>
            <a
              href={`https://wa.me/918240443056?text=${encodeURIComponent(
                `Hello Ruhvi Privé Concierge, I placed VIP Order #${currentOrder?.order_number || orderId}. Please assist with my priority dispatch.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-[11px] font-bold text-white shadow transition hover:bg-emerald-800"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Chat with VIP Concierge</span>
            </a>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
        <Link
          href={`/orders/${orderId}`}
          className="flex w-full items-center justify-center space-x-2 rounded-xl bg-amber-950 px-6 py-3 text-xs font-bold uppercase tracking-wider text-amber-100 shadow-md transition-all hover:bg-amber-900 sm:w-auto"
        >
          <FileText className="h-4 w-4" />
          <span>View Order & GST Invoice</span>
        </Link>

        <Link
          href="/products"
          className="flex w-full items-center justify-center space-x-2 rounded-xl border border-stone-300 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-stone-800 transition-colors hover:bg-stone-50 sm:w-auto"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
