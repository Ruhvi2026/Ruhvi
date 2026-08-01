'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Download, ShieldCheck, Sparkles } from 'lucide-react';
import { Order } from '@/types/database';

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruhvi_orders_v1');
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        const match = parsed.find((o) => o.id === orderId || o.order_number === orderId);
        if (match) setOrder(match);
      }
    } catch (e) {
      console.error(e);
    }
  }, [orderId]);


  const handlePrint = () => {
    window.print();
  };

  const dummyOrder: Order = order || {
    id: orderId,
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
    created_at: new Date().toISOString(),
    shipping_address: {
      id: 'a1',
      user_id: 'u1',
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
        id: 'i1',
        order_id: orderId,
        sku: 'RNG-000101',
        quantity: 1,
        price_at_purchase: 49999,
        product: {
          id: 'p1',
          sku: 'RNG-000101',
          name: 'Aurelia Solitaire Diamond Ring',
          slug: 'aurelia-solitaire-diamond-ring',
          price: 49999,
          mrp: 59999,
          gst_rate: 3.0,
          stock_quantity: 10,
          low_stock_threshold: 2,
          status: 'active',
          is_new_arrival: true,
          is_best_seller: true,
        },
      },
    ],
  };

  const invoiceNo = `INV/${new Date().getFullYear()}/${dummyOrder.order_number.split('-').pop()}`;
  const taxableSubtotal = Math.round(dummyOrder.subtotal / 1.03);
  const totalGst = dummyOrder.subtotal - taxableSubtotal;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

  return (
    <div className="min-h-screen bg-stone-100 py-10 px-4 sm:px-6">
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href={`/orders/${dummyOrder.id}`}
          className="text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Order</span>
        </Link>

        <button
          onClick={handlePrint}
          className="px-5 py-2 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition-all flex items-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Invoice Document (A4 Printable Box) */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-stone-200 text-stone-900 font-sans print:shadow-none print:border-none print:p-0">
        {/* Seller & Brand Header */}
        <div className="flex justify-between items-start border-b-2 border-amber-950 pb-6 mb-6">
          <div>
            <span className="font-serif text-3xl font-bold tracking-widest text-amber-950 uppercase block">
              Ruhvi
            </span>
            <span className="text-[10px] uppercase font-sans tracking-widest text-stone-500 font-semibold block mt-0.5">
              Fine Jewellery Pvt. Ltd.
            </span>
            <div className="text-xs text-stone-600 mt-2 space-y-0.5">
              <p>Plot 12, Road No. 36, Jubilee Hills</p>
              <p>Hyderabad, Telangana - 500033</p>
              <p className="font-mono text-[11px] font-bold text-stone-800">GSTIN: 36AAACR8492F1Z5</p>
              <p className="text-[11px]">Email: care@ruhvi.in | Web: www.ruhvi.in</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="bg-amber-950 text-amber-100 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded inline-block">
              TAX INVOICE
            </span>
            <div className="text-xs text-stone-600 pt-2 space-y-0.5">
              <p className="font-mono font-bold text-stone-900 text-sm">Invoice: {invoiceNo}</p>
              <p>Order Ref: <span className="font-mono">{dummyOrder.order_number}</span></p>
              <p>Date: {new Date(dummyOrder.created_at || Date.now()).toLocaleDateString('en-IN')}</p>
              <p>Place of Supply: <span className="font-semibold">Telangana (36)</span></p>
            </div>
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div className="grid grid-cols-2 gap-6 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs mb-8">
          <div>
            <h4 className="font-bold uppercase tracking-wider text-amber-950 text-[11px] mb-1">
              Billed To & Shipped To
            </h4>
            {dummyOrder.shipping_address && (
              <div className="space-y-0.5 text-stone-700">
                <p className="font-bold text-stone-900 text-sm">{dummyOrder.shipping_address.full_name}</p>
                <p>{dummyOrder.shipping_address.line1}</p>
                {dummyOrder.shipping_address.line2 && <p>{dummyOrder.shipping_address.line2}</p>}
                <p>{dummyOrder.shipping_address.city}, {dummyOrder.shipping_address.state} - {dummyOrder.shipping_address.pincode}</p>
                <p className="font-mono pt-1 text-stone-500">Phone: {dummyOrder.shipping_address.phone}</p>
              </div>
            )}
          </div>

          <div className="border-l border-stone-200 pl-6 space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-amber-950 text-[11px] mb-1">
              Payment & Dispatch Info
            </h4>
            <p><span className="font-semibold text-stone-700">Payment Method:</span> {dummyOrder.payment_method.toUpperCase()}</p>
            <p><span className="font-semibold text-stone-700">Payment Status:</span> {dummyOrder.payment_status.toUpperCase()}</p>
            <p><span className="font-semibold text-stone-700">Insured Shipping:</span> Blue Dart Express</p>
            <p><span className="font-semibold text-stone-700">BIS Hallmarked:</span> Certified 22K/22K Gold & VVS Diamond</p>
          </div>
        </div>

        {/* Itemized Invoice Table */}
        <table className="w-full text-left text-xs mb-8 border-collapse">
          <thead>
            <tr className="bg-amber-950 text-amber-100 uppercase tracking-wider text-[10px]">
              <th className="p-3 rounded-l">S.No</th>
              <th className="p-3">Item Description</th>
              <th className="p-3 font-mono">HSN Code</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-right">Taxable Value</th>
              <th className="p-3 text-right">CGST (1.5%)</th>
              <th className="p-3 text-right">SGST (1.5%)</th>
              <th className="p-3 text-right rounded-r">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {dummyOrder.order_items?.map((item, idx) => {
              const itemTotal = item.price_at_purchase * item.quantity;
              const itemTaxable = Math.round(itemTotal / 1.03);
              const itemTax = itemTotal - itemTaxable;
              const itemCgst = Math.round(itemTax / 2);
              const itemSgst = itemTax - itemCgst;

              return (
                <tr key={item.id} className="text-stone-800">
                  <td className="p-3 font-mono">{idx + 1}</td>
                  <td className="p-3 font-medium">
                    <div>{item.product?.name || item.sku}</div>
                    <div className="text-[10px] font-mono text-stone-400">SKU: {item.sku}</div>
                  </td>
                  <td className="p-3 font-mono text-stone-500">7113</td>
                  <td className="p-3 text-center font-bold">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">₹{itemTaxable.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono">₹{itemCgst.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono">₹{itemSgst.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-bold font-mono">₹{itemTotal.toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Calculations & Totals Box */}
        <div className="flex justify-between items-start border-t border-stone-200 pt-6">
          <div className="max-w-xs text-[11px] text-stone-500 space-y-2">
            <div className="flex items-center space-x-1 text-amber-950 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>Certified Authenticity Guarantee</span>
            </div>
            <p>This is a computer-generated tax invoice issued in accordance with GST Rules 2017.</p>
          </div>

          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Total Taxable Amount</span>
              <span className="font-mono">₹{taxableSubtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>CGST @ 1.5%</span>
              <span className="font-mono">₹{cgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>SGST @ 1.5%</span>
              <span className="font-mono">₹{sgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Shipping Charge</span>
              <span>{dummyOrder.shipping_charge === 0 ? 'FREE' : `₹${dummyOrder.shipping_charge}`}</span>
            </div>
            {dummyOrder.cod_charge > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>COD Charge</span>
                <span>₹{dummyOrder.cod_charge}</span>
              </div>
            )}

            <div className="border-t-2 border-stone-900 pt-2 flex justify-between font-bold text-sm text-amber-950">
              <span>Grand Total</span>
              <span className="font-mono">₹{dummyOrder.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Authorized Signatory Stamp */}
        <div className="mt-12 pt-6 border-t border-stone-100 flex justify-between items-end text-xs text-stone-500">
          <div>
            <p className="font-bold text-stone-800">Terms & Conditions:</p>
            <p className="text-[10px]">1. Goods once sold carry a 7-day return policy subject to condition tag.</p>
            <p className="text-[10px]">2. All disputes subject to Hyderabad jurisdiction.</p>
          </div>

          <div className="text-center font-serif">
            <div className="font-serif italic text-amber-950 font-bold text-lg mb-1">Ruhvi Fine Jewellery</div>
            <div className="text-[10px] uppercase font-sans tracking-wider border-t border-stone-300 pt-1">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
