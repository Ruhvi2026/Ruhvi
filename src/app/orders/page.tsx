'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, FileText, ArrowRight, Clock, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { Order } from '@/types/database';

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
            { id: 'i1', product_id: 'prod-1', url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', type: 'still', sort_order: 1 }
          ]
        }
      }
    ]
  }
];

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruhvi_orders_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setOrders(parsed.length > 0 ? parsed : SAMPLE_ORDERS);
      } else {
        setOrders(SAMPLE_ORDERS);
      }
    } catch (e) {
      console.error('Failed to load orders', e);
      setOrders(SAMPLE_ORDERS);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Confirmed</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Shipped</span>;
      case 'delivered':
        return <span className="bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Delivered</span>;
      case 'cancelled':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Cancelled</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">Pending</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 flex items-center space-x-3">
          <Package className="w-8 h-8 text-amber-900" />
          <span>My Orders</span>
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-1">
          Track purchases, download GST invoices, cancel or re-order items
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">Loading order history...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
            >
              {/* Order Header Bar */}
              <div className="bg-stone-50 p-4 sm:p-6 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase tracking-wider font-medium">Order Number</span>
                    <span className="font-mono font-bold text-stone-900">{order.order_number}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase tracking-wider font-medium">Date Placed</span>
                    <span className="font-semibold text-stone-800">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase tracking-wider font-medium">Total Amount</span>
                    <span className="font-bold text-amber-950">₹{order.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusBadge(order.status)}

                  <Link
                    href={`/orders/${order.id}/invoice`}
                    className="p-1.5 text-stone-600 hover:text-amber-900 bg-white border border-stone-200 rounded-lg hover:border-amber-400 transition-colors flex items-center space-x-1 px-2.5 text-[11px] font-semibold"
                    title="View GST Invoice"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-800" />
                    <span>Invoice</span>
                  </Link>
                </div>
              </div>

              {/* Order Items & Preview */}
              <div className="p-4 sm:p-6 space-y-4">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-100">
                      <img
                        src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'}
                        alt={item.product?.name || item.sku}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-stone-400 uppercase">{item.sku}</span>
                      <h4 className="font-semibold text-xs sm:text-sm text-stone-900 line-clamp-1">
                        {item.product?.name || 'Handcrafted Jewellery Piece'}
                      </h4>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Qty: {item.quantity} × ₹{item.price_at_purchase.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Footer Actions */}
              <div className="bg-stone-50/50 p-4 border-t border-stone-100 flex justify-end space-x-3">
                <Link
                  href={`/orders/${order.id}`}
                  className="px-4 py-2 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <span>View Details & Actions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200 shadow-sm max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center mx-auto">
            <Package className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-stone-900">No Orders Yet</h2>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              You haven&apos;t placed any orders with Ruhvi yet. Explore our handcrafted fine jewellery catalog today.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 px-8 py-3.5 bg-amber-950 text-amber-100 font-bold text-xs uppercase tracking-widest rounded-full shadow-md hover:bg-amber-900 transition-all"
          >
            <span>Start Shopping</span>
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
