'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Send, Clock, AlertCircle } from 'lucide-react';

const MOCK_ABANDONED_CARTS = [
  {
    id: 'cart-101',
    customer: 'Meera Rajput',
    email: 'meera.r@example.com',
    phone: '+91 98765 12345',
    items: ['Aurelia Solitaire Diamond Ring'],
    cartValue: 12500,
    abandonedAt: '2 hours ago',
    stage: 'Checkout - Payment Screen',
  },
  {
    id: 'cart-102',
    customer: 'Vikas Sharma',
    email: 'vikas.s@example.com',
    phone: '+91 98123 45678',
    items: ['Royal Heritage Gold Bangle', 'Celestial Pearl Drop'],
    cartValue: 47000,
    abandonedAt: '5 hours ago',
    stage: 'Cart Page',
  },
  {
    id: 'cart-103',
    customer: 'Deepika Padukone',
    email: 'deepika@example.com',
    phone: '+91 99000 11223',
    items: ['Kundan Choker Statement Necklace'],
    cartValue: 85000,
    abandonedAt: 'Yesterday',
    stage: 'Checkout - Address Step',
  }
];

export default function AbandonedCartsPage() {
  const handleSendReminder = (customer: string) => {
    alert(`Triggered recovery email & WhatsApp notification for ${customer}!`);
  };

  const totalValueAtRisk = MOCK_ABANDONED_CARTS.reduce((acc, curr) => acc + curr.cartValue, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Abandoned Cart Tracking</h1>
            <p className="text-xs text-stone-500 mt-1">Recover lost checkouts and re-engage high-intent visitors</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Abandoned Carts</span>
            <ShoppingCart className="w-5 h-5 text-stone-700" />
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900">{MOCK_ABANDONED_CARTS.length} Carts</p>
          <p className="text-xs text-stone-400">Recorded in the past 48 hours</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Revenue at Risk</span>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-3xl font-serif font-bold text-rose-950">₹{totalValueAtRisk.toLocaleString('en-IN')}</p>
          <p className="text-xs text-rose-700">Potential revenue recoverable via AiSensy/Email</p>
        </div>
      </div>

      {/* Abandoned Carts Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-semibold tracking-wider bg-stone-50">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items in Cart</th>
                <th className="py-3 px-4">Cart Value</th>
                <th className="py-3 px-4">Drop-off Stage</th>
                <th className="py-3 px-4">Abandoned</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {MOCK_ABANDONED_CARTS.map((cart) => (
                <tr key={cart.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-stone-900">{cart.customer}</p>
                    <p className="text-xs text-stone-400">{cart.email}</p>
                  </td>
                  <td className="py-3 px-4 text-stone-700 font-medium">
                    {cart.items.join(', ')}
                  </td>
                  <td className="py-3 px-4 font-bold text-stone-900">
                    ₹{cart.cartValue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-stone-100 text-stone-800 text-[10px] uppercase font-bold px-2.5 py-1 rounded">
                      {cart.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-500 font-mono flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {cart.abandonedAt}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleSendReminder(cart.customer)}
                      className="inline-flex items-center space-x-1 bg-amber-900 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Reminder</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
