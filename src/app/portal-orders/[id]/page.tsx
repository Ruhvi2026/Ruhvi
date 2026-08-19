'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Truck,
  FileText,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Order } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPushing, setIsPushing] = useState(false);

  React.useEffect(() => {
    fetchOrder();
  }, [resolvedParams.id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          shipping_address:addresses(*),
          order_items(*)
        `
        )
        .eq('id', resolvedParams.id)
        .single();

      if (error) throw error;
      setOrder(data as Order);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToShiprocket = async () => {
    if (!order) return;
    setIsPushing(true);

    try {
      const res = await fetch('/api/admin/shiprocket/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrder({
          ...order,
          awb_code: data.awb_code,
          courier_name: data.courier_name,
          status: 'shipped',
        });
      } else {
        alert(`Failed to create shipment: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error occurred while pushing to Shiprocket.');
    } finally {
      setIsPushing(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500">Loading order...</div>
    );
  if (error || !order)
    return (
      <div className="p-10 text-center font-bold text-rose-600">
        {error || 'Order not found.'}
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-4 border-b border-white/10 pb-6">
        <Link
          href="/portal-orders/all"
          className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5 text-slate-300" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">
            Manage Order {order.order_number}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Placed on {new Date(order.created_at!).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Order Details */}
        <div className="space-y-8 lg:col-span-2">
          {/* Items */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-6">
            <h2 className="mb-4 font-serif text-lg font-bold text-white">
              Order Items
            </h2>
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-200">
                      Product ID: {item.product_id}
                    </p>
                    <p className="text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-bold text-white">
                    ₹{item.price_at_purchase.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-6">
            <h2 className="mb-4 font-serif text-lg font-bold text-white">
              Shipping Destination
            </h2>
            {order.shipping_address && (
              <div className="space-y-1 text-sm text-slate-300">
                <p className="font-semibold text-white">
                  {order.shipping_address.full_name}
                </p>
                <p>{order.shipping_address.phone}</p>
                <p>
                  {order.shipping_address.line1}, {order.shipping_address.line2}
                </p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  - {order.shipping_address.pincode}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fulfillment Panel */}
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-amber-500/20 bg-[#131726] p-6">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-4">
              <Package className="h-5 w-5 text-amber-500" />
              <h2 className="font-serif text-lg font-bold text-white">
                Fulfillment
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Payment Status</span>
                <span className="flex items-center font-bold capitalize text-emerald-400">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {order.payment_status}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Order Status</span>
                <span className="font-bold capitalize text-white">
                  {order.status}
                </span>
              </div>
            </div>

            {/* Shiprocket Panel */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              {!order.awb_code ? (
                <>
                  <p className="text-xs text-slate-500">
                    Ready to pack? Push this order to Shiprocket to generate a
                    shipping label and tracking number.
                  </p>
                  <button
                    onClick={handlePushToShiprocket}
                    disabled={isPushing}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Truck className="h-4 w-4" />
                    <span>
                      {isPushing
                        ? 'Creating Shipment...'
                        : 'Generate Shipping Label'}
                    </span>
                  </button>
                </>
              ) : (
                <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-bold">Shipment Created</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">Courier Partner:</p>
                    <p className="font-bold text-white">{order.courier_name}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">Tracking AWB:</p>
                    <p className="font-mono font-bold text-white">
                      {order.awb_code}
                    </p>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-slate-700 py-2 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-slate-600">
                      <FileText className="h-3 w-3" />
                      <span>Print Label</span>
                    </button>
                    <button className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-white/10">
                      Manifest
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
