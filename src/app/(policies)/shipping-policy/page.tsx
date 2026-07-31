import React from 'react';

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Shipping & Delivery Policy</h1>
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs text-stone-700 leading-relaxed">
        <p>All orders placed on Ruhvi.in are dispatched with 100% transit insurance in tamper-evident sealed packaging.</p>
        <h3 className="font-bold text-stone-900 text-sm">Domestic Shipping Rates</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Orders above ₹500: <strong>FREE Insured Express Delivery</strong></li>
          <li>Orders below ₹500: Flat ₹49 shipping charge</li>
          <li>Cash on Delivery (COD): Additional ₹49 handling fee applies</li>
        </ul>
        <h3 className="font-bold text-stone-900 text-sm">Delivery Timelines</h3>
        <p>Metros: 2-4 business days. Other cities: 4-7 business days.</p>
      </div>
    </div>
  );
}
