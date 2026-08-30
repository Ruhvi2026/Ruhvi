'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  XCircle,
  Gift,
  MapPin,
  Truck,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Order } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

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

  const handleCancelOrder = async () => {
    if (!order) return;

    if (order.status === 'shipped' || order.status === 'delivered') {
      setActionMessage(
        'This order has already been shipped or delivered and cannot be cancelled directly.'
      );
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) return;

    const updatedOrder: Order = { ...order, status: 'cancelled' };
    setOrder(updatedOrder);

    if (user) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setActionMessage('Order has been successfully cancelled.');
      } catch (err) {
        console.error('Failed to cancel order:', err);
        setOrder(order);
        setActionMessage(
          'Failed to cancel the order. Please contact support@ruhvi.in for assistance.'
        );
      }
      return;
    }

    // Guest fallback — update the locally stored preview order
    try {
      const saved = JSON.parse(localStorage.getItem('ruhvi_orders_v1') || '[]');
      const updated = saved.map((o: Order) =>
        o.id === order.id ? updatedOrder : o
      );
      localStorage.setItem('ruhvi_orders_v1', JSON.stringify(updated));
      setActionMessage('Order has been successfully cancelled.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReorder = () => {
    if (!order || !order.order_items) return;

    order.order_items.forEach((item) => {
      if (item.product) {
        addToCart(item.product, item.quantity);
      }
    });

    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-stone-500">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          Order Not Found
        </h2>
        <p className="text-xs text-stone-500">
          We could not locate the requested order.
        </p>
        <Link
          href="/orders"
          className="inline-block rounded-lg bg-amber-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const isCancellable =
    order.status === 'pending' || order.status === 'confirmed';

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/orders')}
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="block font-mono text-xs uppercase text-stone-400">
              Order Details
            </span>
            <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              {order.order_number}
            </h1>
          </div>
        </div>

        <Link
          href={`/orders/${order.id}/invoice`}
          className="inline-flex items-center space-x-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-900 transition-colors hover:bg-amber-100"
        >
          <FileText className="h-4 w-4 text-amber-800" />
          <span>GST Invoice</span>
        </Link>
      </div>

      {actionMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">
          {actionMessage}
        </div>
      )}

      {/* Status Timeline */}
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700">
          Order Progress
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div
            className={`rounded-lg p-2 ${order.status !== 'cancelled' ? 'bg-emerald-50 font-bold text-emerald-800' : 'bg-stone-100 text-stone-400'}`}
          >
            1. Placed
          </div>
          <div
            className={`rounded-lg p-2 ${order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? 'bg-emerald-50 font-bold text-emerald-800' : 'bg-stone-100 text-stone-400'}`}
          >
            2. Confirmed
          </div>
          <div
            className={`rounded-lg p-2 ${order.status === 'shipped' || order.status === 'delivered' ? 'bg-blue-50 font-bold text-blue-800' : 'bg-stone-100 text-stone-400'}`}
          >
            3. Shipped
          </div>
          <div
            className={`rounded-lg p-2 ${order.status === 'delivered' ? 'bg-amber-50 font-bold text-amber-900' : 'bg-stone-100 text-stone-400'}`}
          >
            4. Delivered
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Items List */}
        <div className="space-y-4 md:col-span-2">
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="border-b border-stone-100 pb-3 text-sm font-semibold uppercase tracking-wider text-stone-900">
              Items Purchased
            </h3>

            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-stone-100">
                    <ImageWithFallback
                      src={
                        item.product?.images?.[0]?.url ||
                        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={item.sku}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="font-mono text-xs uppercase text-stone-400">
                      {item.sku}
                    </span>
                    <h4 className="text-sm font-semibold text-stone-900">
                      {item.product?.name || 'Handcrafted Jewellery Piece'}
                    </h4>
                    <div className="mt-1 text-xs font-bold text-amber-950">
                      ₹{item.price_at_purchase.toLocaleString('en-IN')} ×{' '}
                      {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Gift Details */}
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center space-x-2 border-b border-stone-100 pb-3 text-sm font-semibold uppercase tracking-wider text-stone-900">
              <MapPin className="h-4 w-4 text-amber-800" />
              <span>Shipping Address</span>
            </h3>
            {order.shipping_address && (
              <div className="ph-no-capture space-y-1 text-xs text-stone-700">
                <div className="font-bold text-stone-900">
                  {order.shipping_address.full_name}
                </div>
                <div>
                  {order.shipping_address.line1}, {order.shipping_address.line2}
                </div>
                <div>
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  - {order.shipping_address.pincode}
                </div>
                <div className="pt-1 font-mono text-stone-500">
                  {order.shipping_address.phone}
                </div>
              </div>
            )}

            {order.gift_wrap && (
              <div className="flex items-start space-x-2 rounded-xl border border-t border-amber-900/10 border-stone-100 bg-amber-50/50 p-3 pt-3 text-xs text-stone-600">
                <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-800" />
                <div>
                  <span className="font-bold text-amber-950">
                    Gift Packaging Included
                  </span>
                  {order.gift_message && (
                    <p className="mt-0.5 italic text-stone-500">
                      "{order.gift_message}"
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Financial & Action Panel */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="border-b border-stone-100 pb-3 font-serif text-base font-bold text-stone-900">
              Payment Breakdown
            </h3>

            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">
                  ₹{order.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {order.shipping_charge === 0
                    ? 'FREE'
                    : `₹${order.shipping_charge}`}
                </span>
              </div>
              {order.cod_charge > 0 && (
                <div className="flex justify-between">
                  <span>COD Fee</span>
                  <span>₹{order.cod_charge}</span>
                </div>
              )}
              {order.coupon_discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon</span>
                  <span>-₹{order.coupon_discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {order.coins_redeemed > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Coins Redeemed</span>
                  <span>-₹{order.coins_redeemed.toLocaleString('en-IN')}</span>
                </div>
              )}
              {order.wallet_used > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Paid from Wallet</span>
                  <span>-₹{order.wallet_used.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-400">
                <span>GST (3% Included)</span>
                <span>₹{order.gst_amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between border-t border-stone-200 pt-3 text-sm font-bold text-amber-950">
                <span>
                  {order.payment_status === 'paid'
                    ? 'Total Paid'
                    : 'Total Payable'}
                </span>
                <span>₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
              Payment Method:{' '}
              <span className="font-bold text-stone-900">
                {order.payment_method.toUpperCase()}
              </span>{' '}
              ({order.payment_status})
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {order.payment_status === 'pending' &&
              order.payment_method === 'cod' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs font-medium text-amber-900">
                  Cash on Delivery — please pay when your order arrives.
                </div>
              )}

            <button
              onClick={handleReorder}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-amber-950 py-3 text-xs font-bold uppercase tracking-widest text-amber-100 shadow transition-all hover:bg-amber-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reorder Items</span>
            </button>

            {isCancellable ? (
              <button
                onClick={handleCancelOrder}
                className="flex w-full items-center justify-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 py-3 text-xs font-semibold uppercase tracking-widest text-rose-700 transition-colors hover:bg-rose-100"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Cancel Order</span>
              </button>
            ) : (
              <div className="py-2 text-center text-xs text-stone-400">
                Order status is{' '}
                <span className="font-bold">{order.status}</span> (Cancellation
                unavailable).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
