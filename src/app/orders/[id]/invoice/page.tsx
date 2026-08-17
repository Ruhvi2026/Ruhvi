'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Download,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Order } from '@/types/database';

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruhvi_orders_v1');
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        const match = parsed.find(
          (o) => o.id === orderId || o.order_number === orderId
        );
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
    <div className="min-h-screen bg-stone-100 px-4 py-10 sm:px-6">
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <Link
          href={`/orders/${dummyOrder.id}`}
          className="flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Order</span>
        </Link>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 rounded-lg bg-amber-950 px-5 py-2 text-xs font-bold uppercase tracking-wider text-amber-100 shadow transition-all hover:bg-amber-900"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Invoice Document (A4 Printable Box) */}
      <div className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-8 font-sans text-stone-900 shadow-lg sm:p-12 print:border-none print:p-0 print:shadow-none">
        {/* Seller & Brand Header */}
        <div className="mb-6 flex items-start justify-between border-b-2 border-amber-950 pb-6">
          <div>
            <span className="block font-serif text-3xl font-bold uppercase tracking-widest text-amber-950">
              RUHVI JEWELS
            </span>
            <span className="mt-0.5 block font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-500">
              Sole Proprietorship
            </span>
            <div className="mt-2 space-y-0.5 text-xs text-stone-600">
              <p>Plot 12, Road No. 36, Jubilee Hills</p>
              <p>Hyderabad, Telangana - 500033</p>
              <p className="font-mono text-[11px] font-bold text-stone-800">
                GSTIN: [GST_NUMBER_PENDING]
              </p>
              <p className="text-[11px]">
                Email: support@ruhvi.in | Web: www.ruhvi.in
              </p>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <span className="inline-block rounded bg-amber-950 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-100">
              TAX INVOICE
            </span>
            <div className="space-y-0.5 pt-2 text-xs text-stone-600">
              <p className="font-mono text-sm font-bold text-stone-900">
                Invoice: {invoiceNo}
              </p>
              <p>
                Order Ref:{' '}
                <span className="font-mono">{dummyOrder.order_number}</span>
              </p>
              <p>
                Date:{' '}
                {new Date(
                  dummyOrder.created_at || Date.now()
                ).toLocaleDateString('en-IN')}
              </p>
              <p>
                Place of Supply:{' '}
                <span className="font-semibold">Telangana (36)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div className="mb-8 grid grid-cols-2 gap-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs">
          <div>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-950">
              Billed To & Shipped To
            </h4>
            {dummyOrder.shipping_address && (
              <div className="space-y-0.5 text-stone-700">
                <p className="text-sm font-bold text-stone-900">
                  {dummyOrder.shipping_address.full_name}
                </p>
                <p>{dummyOrder.shipping_address.line1}</p>
                {dummyOrder.shipping_address.line2 && (
                  <p>{dummyOrder.shipping_address.line2}</p>
                )}
                <p>
                  {dummyOrder.shipping_address.city},{' '}
                  {dummyOrder.shipping_address.state} -{' '}
                  {dummyOrder.shipping_address.pincode}
                </p>
                <p className="pt-1 font-mono text-stone-500">
                  Phone: {dummyOrder.shipping_address.phone}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1 border-l border-stone-200 pl-6">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-950">
              Payment & Dispatch Info
            </h4>
            <p>
              <span className="font-semibold text-stone-700">
                Payment Method:
              </span>{' '}
              {dummyOrder.payment_method.toUpperCase()}
            </p>
            <p>
              <span className="font-semibold text-stone-700">
                Payment Status:
              </span>{' '}
              {dummyOrder.payment_status.toUpperCase()}
            </p>
            <p>
              <span className="font-semibold text-stone-700">
                Insured Shipping:
              </span>{' '}
              Blue Dart Express
            </p>
            <p>
              <span className="font-semibold text-stone-700">
                BIS Hallmarked:
              </span>{' '}
              Certified 22K/22K Gold & VVS Diamond
            </p>
          </div>
        </div>

        {/* Itemized Invoice Table */}
        <table className="mb-8 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-amber-950 text-[10px] uppercase tracking-wider text-amber-100">
              <th className="rounded-l p-3">S.No</th>
              <th className="p-3">Item Description</th>
              <th className="p-3 font-mono">HSN Code</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-right">Taxable Value</th>
              <th className="p-3 text-right">CGST (1.5%)</th>
              <th className="p-3 text-right">SGST (1.5%)</th>
              <th className="rounded-r p-3 text-right">Total (₹)</th>
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
                    <div className="font-mono text-[10px] text-stone-400">
                      SKU: {item.sku}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-stone-500">7113</td>
                  <td className="p-3 text-center font-bold">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">
                    ₹{itemTaxable.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ₹{itemCgst.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ₹{itemSgst.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    ₹{itemTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Calculations & Totals Box */}
        <div className="flex items-start justify-between border-t border-stone-200 pt-6">
          <div className="max-w-xs space-y-2 text-[11px] text-stone-500">
            <div className="flex items-center space-x-1 font-bold text-amber-950">
              <ShieldCheck className="h-4 w-4 text-amber-800" />
              <span>Certified Authenticity Guarantee</span>
            </div>
            <p>
              This is a computer-generated tax invoice issued in accordance with
              GST Rules 2017.
            </p>
          </div>

          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Total Taxable Amount</span>
              <span className="font-mono">
                ₹{taxableSubtotal.toLocaleString('en-IN')}
              </span>
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
              <span>
                {dummyOrder.shipping_charge === 0
                  ? 'FREE'
                  : `₹${dummyOrder.shipping_charge}`}
              </span>
            </div>
            {dummyOrder.cod_charge > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>COD Charge</span>
                <span>₹{dummyOrder.cod_charge}</span>
              </div>
            )}

            <div className="flex justify-between border-t-2 border-stone-900 pt-2 text-sm font-bold text-amber-950">
              <span>Grand Total</span>
              <span className="font-mono">
                ₹{dummyOrder.total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Authorized Signatory Stamp */}
        <div className="mt-12 flex items-end justify-between border-t border-stone-100 pt-6 text-xs text-stone-500">
          <div>
            <p className="font-bold text-stone-800">Terms & Conditions:</p>
            <p className="text-[10px]">
              1. Goods once sold carry a 7-day return policy subject to
              condition tag.
            </p>
            <p className="text-[10px]">
              2. All disputes subject to Hyderabad jurisdiction.
            </p>
          </div>

          <div className="text-center font-serif">
            <div className="mb-1 font-serif text-lg font-bold italic text-amber-950">
              RUHVI JEWELS
            </div>
            <div className="border-t border-stone-300 pt-1 font-sans text-[10px] uppercase tracking-wider">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
