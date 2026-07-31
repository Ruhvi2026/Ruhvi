import React from 'react';

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Return & Refund Policy</h1>
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs text-stone-700 leading-relaxed">
        <p>We want you to love your Ruhvi piece. We offer a 7-day hassle-free return policy from the date of delivery.</p>
        <h3 className="font-bold text-stone-900 text-sm">Eligibility Criteria</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Item must be unused, in original condition with security tags intact.</li>
          <li>Original invoice and lab certificates must be enclosed.</li>
          <li>Customized or engraved orders are non-returnable unless damaged in transit.</li>
        </ul>
      </div>
    </div>
  );
}
