'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, RefreshCw, XCircle, Gift, MapPin, Truck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Order } from '@/types/database';
import { useCart } from '@/context/CartContext';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();
  const { addToCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruhvi_orders_v1');
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        const match = parsed.find((o) => o.id === orderId || o.order_number === orderId);
        if (match) {
          setOrder(match);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);


  const handleCancelOrder = () => {
    if (!order) return;

    if (order.status === 'shipped' || order.status === 'delivered') {
      setActionMessage('This order has already been shipped or delivered and cannot be cancelled directly.');
      return;
    }

    if (confirm('Are you sure you want to cancel this order?')) {
      const updatedOrder: Order = { ...order, status: 'cancelled' };
      setOrder(updatedOrder);

      // Update in localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('ruhvi_orders_v1') || '[]');
        const updated = saved.map((o: Order) => (o.id === order.id ? updatedOrder : o));
        localStorage.setItem('ruhvi_orders_v1', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setActionMessage('Order has been successfully cancelled.');
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
    return <div className="p-12 text-center text-xs text-stone-500">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Order Not Found</h2>
        <p className="text-xs text-stone-500">We could not locate the requested order.</p>
        <Link
          href="/orders"
          className="inline-block px-6 py-2.5 bg-amber-950 text-amber-100 text-xs font-bold uppercase tracking-wider rounded-lg"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const isCancellable = order.status === 'pending' || order.status === 'confirmed';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/orders')}
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-mono text-stone-400 uppercase block">Order Details</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              {order.order_number}
            </h1>
          </div>
        </div>

        <Link
          href={`/orders/${order.id}/invoice`}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors"
        >
          <FileText className="w-4 h-4 text-amber-800" />
          <span>GST Invoice</span>
        </Link>
      </div>

      {actionMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
          {actionMessage}
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-stone-700">Order Progress</h3>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className={`p-2 rounded-lg ${order.status !== 'cancelled' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-stone-100 text-stone-400'}`}>
            1. Placed
          </div>
          <div className={`p-2 rounded-lg ${order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-stone-100 text-stone-400'}`}>
            2. Confirmed
          </div>
          <div className={`p-2 rounded-lg ${order.status === 'shipped' || order.status === 'delivered' ? 'bg-blue-50 text-blue-800 font-bold' : 'bg-stone-100 text-stone-400'}`}>
            3. Shipped
          </div>
          <div className={`p-2 rounded-lg ${order.status === 'delivered' ? 'bg-amber-50 text-amber-900 font-bold' : 'bg-stone-100 text-stone-400'}`}>
            4. Delivered
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-stone-900 border-b border-stone-100 pb-3">
              Items Purchased
            </h3>

            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-100">
                    <img
                      src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'}
                      alt={item.sku}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">{item.sku}</span>
                    <h4 className="font-semibold text-sm text-stone-900">
                      {item.product?.name || 'Handcrafted Jewellery Piece'}
                    </h4>
                    <div className="text-xs text-amber-950 font-bold mt-1">
                      ₹{item.price_at_purchase.toLocaleString('en-IN')} × {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Gift Details */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-stone-900 border-b border-stone-100 pb-3 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-800" />
              <span>Shipping Address</span>
            </h3>
            {order.shipping_address && (
              <div className="text-xs text-stone-700 space-y-1">
                <div className="font-bold text-stone-900">{order.shipping_address.full_name}</div>
                <div>{order.shipping_address.line1}, {order.shipping_address.line2}</div>
                <div>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</div>
                <div className="font-mono text-stone-500 pt-1">{order.shipping_address.phone}</div>
              </div>
            )}

            {order.gift_wrap && (
              <div className="pt-3 border-t border-stone-100 flex items-start space-x-2 text-xs text-stone-600 bg-amber-50/50 p-3 rounded-xl border border-amber-900/10">
                <Gift className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950">Gift Packaging Included</span>
                  {order.gift_message && <p className="italic text-stone-500 mt-0.5">"{order.gift_message}"</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Financial & Action Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
              Payment Breakdown
            </h3>

            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shipping_charge === 0 ? 'FREE' : `₹${order.shipping_charge}`}</span>
              </div>
              {order.cod_charge > 0 && (
                <div className="flex justify-between">
                  <span>COD Fee</span>
                  <span>₹{order.cod_charge}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-stone-400">
                <span>GST (3% Included)</span>
                <span>₹{order.gst_amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="border-t border-stone-200 pt-3 flex justify-between font-bold text-sm text-amber-950">
                <span>Total Paid</span>
                <span>₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
              Payment Method: <span className="text-stone-900 font-bold">{order.payment_method.toUpperCase()}</span> ({order.payment_status})
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleReorder}
              className="w-full py-3 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-widest rounded-xl shadow transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reorder Items</span>
            </button>

            {isCancellable ? (
              <button
                onClick={handleCancelOrder}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs uppercase tracking-widest rounded-xl border border-rose-200 transition-colors flex items-center justify-center space-x-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            ) : (
              <div className="text-center text-[10px] text-stone-400 py-2">
                Order status is <span className="font-bold">{order.status}</span> (Cancellation unavailable).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
