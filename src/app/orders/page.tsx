'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, product(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders((data as Order[]) || []);
      } catch (err) {
        console.error('Error fetching real orders:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return (
          <span className="rounded bg-stone-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-stone-700">
            Pending
          </span>
        );
      case 'confirmed':
      case 'processing':
        return (
          <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
            {status === 'processing' ? 'Processing' : 'Confirmed'}
          </span>
        );
      case 'shipped':
        return (
          <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800">
            Shipped
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="rounded bg-sky-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-800">
            Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900">
            Delivered
          </span>
        );
      case 'delivery_failed':
      case 'rto_initiated':
      case 'rto_received':
        return (
          <span className="rounded bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
            Delivery Issue
          </span>
        );
      case 'return_requested':
      case 'return_approved':
      case 'return_rejected':
      case 'returned':
        return (
          <span className="rounded bg-orange-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-orange-800">
            Return
          </span>
        );
      case 'refunded':
        return (
          <span className="rounded bg-purple-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-800">
            Refunded
          </span>
        );
      case 'cancelled':
        return (
          <span className="rounded bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded bg-stone-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-stone-700">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 border-b border-stone-200 pb-6">
        <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
          <Package className="h-8 w-8 text-amber-900" />
          <span>My Orders</span>
        </h1>
        <p className="mt-1 text-xs text-stone-500 sm:text-sm">
          Track purchases, download GST invoices, cancel or re-order items
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">
          Loading order history...
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              {/* Order Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 p-4 text-xs sm:p-6">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wider text-stone-400">
                      Order Number
                    </span>
                    <span className="font-mono font-bold text-stone-900">
                      {order.order_number}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wider text-stone-400">
                      Date Placed
                    </span>
                    <span className="font-semibold text-stone-800">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString(
                            'en-IN',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )
                        : 'Recently'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wider text-stone-400">
                      Total Amount
                    </span>
                    <span className="font-bold text-amber-950">
                      ₹{order.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusBadge(order.status)}

                  <Link
                    href={`/orders/${order.id}/invoice`}
                    className="flex items-center space-x-1 rounded-lg border border-stone-200 bg-white p-1.5 px-2.5 text-xs font-semibold text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-900"
                    title="View GST Invoice"
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-800" />
                    <span>Invoice</span>
                  </Link>
                </div>
              </div>

              {/* Order Items & Preview */}
              <div className="space-y-4 p-4 sm:p-6">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-stone-100">
                      <ImageWithFallback
                        src={
                          item.product?.images?.[0]?.url ||
                          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={item.product?.name || item.sku}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="font-mono text-xs uppercase text-stone-400">
                        {item.sku}
                      </span>
                      <h4 className="line-clamp-1 text-xs font-semibold text-stone-900 sm:text-sm">
                        {item.product?.name || 'Handcrafted Jewellery Piece'}
                      </h4>
                      <div className="mt-0.5 text-xs text-stone-500">
                        Qty: {item.quantity} × ₹
                        {item.price_at_purchase.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Footer Actions */}
              <div className="flex justify-end space-x-3 border-t border-stone-100 bg-stone-50/50 p-4">
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center space-x-1.5 rounded-lg bg-amber-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-900"
                >
                  <span>View Details & Actions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-stone-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-900">
            <Package className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              No Orders Yet
            </h2>
            <p className="mx-auto max-w-xs text-xs text-stone-500">
              You haven&apos;t placed any orders with Ruhvi yet. Explore our
              handcrafted fine jewellery catalog today.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 rounded-full bg-amber-950 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-amber-100 shadow-md transition-all hover:bg-amber-900"
          >
            <span>Start Shopping</span>
            <ShoppingBag className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
