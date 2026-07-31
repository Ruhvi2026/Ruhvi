'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Truck, FileText, CheckCircle, Clock } from 'lucide-react';
import { Order } from '@/types/database';

export default function AdminOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  // Mock Order Data (Phase 5)
  const [order, setOrder] = useState<Order>({
    id: resolvedParams.id,
    user_id: 'user-123',
    order_number: 'RHV-2026-8942',
    status: 'confirmed',
    subtotal: 12500,
    shipping_charge: 0,
    cod_charge: 0,
    coupon_discount: 1250,
    wallet_used: 0,
    coins_redeemed: 0,
    gst_amount: 0,
    total: 11250,
    payment_method: 'razorpay',
    payment_status: 'paid',
    gift_wrap: false,
    created_at: new Date().toISOString(),
    shipping_address_id: 'addr-1',
    shipping_address: {
      id: 'addr-1',
      user_id: 'user-123',
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
        order_id: resolvedParams.id,
        product_id: 'prod-1',
        sku: 'R-RING-01',
        quantity: 1,
        price_at_purchase: 12500,
      }
    ],
    // Shiprocket Phase 5 Fields
    shiprocket_order_id: null,
    shiprocket_shipment_id: null,
    awb_code: null,
    courier_name: null,
  });

  const [isPushing, setIsPushing] = useState(false);

  const handlePushToShiprocket = async () => {
    setIsPushing(true);
    // In a real app, this calls POST /api/admin/shiprocket/create-order
    // For now, we mock the successful response delay
    setTimeout(() => {
      setOrder({
        ...order,
        shiprocket_order_id: `SR-${Date.now()}`,
        shiprocket_shipment_id: `SHP-${Date.now()}`,
        awb_code: `AWB${Date.now()}`,
        courier_name: 'Blue Dart Express',
        status: 'shipped',
      });
      setIsPushing(false);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center space-x-4 border-b border-stone-200 pb-6">
        <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Manage Order {order.order_number}</h1>
          <p className="text-xs text-stone-500 mt-1">Placed on {new Date(order.created_at!).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Order Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-stone-800">Product ID: {item.product_id}</p>
                    <p className="text-stone-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-bold text-stone-900">
                    ₹{item.price_at_purchase.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">Shipping Destination</h2>
            {order.shipping_address && (
              <div className="text-sm text-stone-700 space-y-1">
                <p className="font-semibold text-stone-900">{order.shipping_address.full_name}</p>
                <p>{order.shipping_address.phone}</p>
                <p>{order.shipping_address.line1}, {order.shipping_address.line2}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fulfillment Panel */}
        <div className="space-y-6">
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 space-y-6">
            <div className="flex items-center space-x-2 border-b border-stone-200 pb-4">
              <Package className="w-5 h-5 text-amber-900" />
              <h2 className="font-serif text-lg font-bold text-stone-900">Fulfillment</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Payment Status</span>
                <span className="font-bold text-emerald-700 capitalize flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {order.payment_status}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Order Status</span>
                <span className="font-bold text-stone-900 capitalize">{order.status}</span>
              </div>
            </div>

            {/* Shiprocket Panel */}
            <div className="pt-4 border-t border-stone-200 space-y-4">
              {!order.awb_code ? (
                <>
                  <p className="text-xs text-stone-500">Ready to pack? Push this order to Shiprocket to generate a shipping label and tracking number.</p>
                  <button
                    onClick={handlePushToShiprocket}
                    disabled={isPushing}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{isPushing ? 'Creating Shipment...' : 'Generate Shipping Label'}</span>
                  </button>
                </>
              ) : (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold text-sm">Shipment Created</span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <p className="text-stone-500">Courier Partner:</p>
                    <p className="font-bold text-stone-900">{order.courier_name}</p>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <p className="text-stone-500">Tracking AWB:</p>
                    <p className="font-bold text-stone-900 font-mono">{order.awb_code}</p>
                  </div>

                  <div className="pt-2 flex space-x-2">
                    <button className="flex-1 py-2 bg-stone-900 text-white font-semibold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1 hover:bg-stone-800">
                      <FileText className="w-3 h-3" />
                      <span>Print Label</span>
                    </button>
                    <button className="flex-1 py-2 bg-stone-100 text-stone-700 font-semibold text-[10px] uppercase tracking-wider rounded-lg hover:bg-stone-200">
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
