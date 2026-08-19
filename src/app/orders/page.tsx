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

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-demo-1001',
    user_id: 'demo-user',
    order_number: 'RHV-2026-8942',
    status: 'confirmed',
    subtotal: 49999,
    shipping_charge: 0,
    cod_charge: 0,
    coupon_discount: 0,
    wallet_used: 0,
    coins_redeemed: 0,
    gst_amount: 1456,
    total: 49999,
    payment_method: 'phonepe',
    payment_status: 'paid',
    gift_wrap: true,
    gift_message: 'Happy Anniversary my love!',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    shipping_address: {
      id: 'addr-1',
      user_id: 'demo-user',
      label: 'Home',
      full_name: 'Ananya Sharma',
      phone: '+91 98765 43210',
      line1: 'Flat 402, Royal Palms Apartments',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      is_default: true,
    },
    order_items: [
      {
        id: 'item-1',
        order_id: 'ord-demo-1001',
        sku: 'RNG-000101',
        quantity: 1,
        price_at_purchase: 49999,
        product: {
          id: 'prod-1',
          sku: 'RNG-000101',
          name: 'Aurelia Solitaire Diamond Ring',
          slug: 'aurelia-solitaire-diamond-ring',
          price: 49999,
          mrp: 59999,
          gst_rate: 3.0,
          stock_quantity: 10,
          low_stock_threshold: 3,
          status: 'active',
          is_new_arrival: true,
          is_best_seller: true,
          images: [
            {
              id: 'i1',
              product_id: 'prod-1',
              url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
              type: 'still',
              sort_order: 1,
            },
          ],
        },
      },
    ],
  },
];

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        // Unauthenticated preview
        try {
          const saved = localStorage.getItem('ruhvi_orders_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            setOrders(parsed.length > 0 ? parsed : SAMPLE_ORDERS);
          } else {
            setOrders(SAMPLE_ORDERS);
          }
        } catch (e) {
          console.error('Failed to load guest orders', e);
          setOrders(SAMPLE_ORDERS);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, product(*))')
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
      case 'confirmed':
        return (
          <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Confirmed
          </span>
        );
      case 'shipped':
        return (
          <span className="rounded bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="rounded bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
            Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="rounded bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
            Pending
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
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Order Number
                    </span>
                    <span className="font-mono font-bold text-stone-900">
                      {order.order_number}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-stone-400">
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
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-stone-400">
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
                    className="flex items-center space-x-1 rounded-lg border border-stone-200 bg-white p-1.5 px-2.5 text-[11px] font-semibold text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-900"
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
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-stone-100">
                      <img
                        src={
                          item.product?.images?.[0]?.url ||
                          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={item.product?.name || item.sku}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="font-mono text-[10px] uppercase text-stone-400">
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
