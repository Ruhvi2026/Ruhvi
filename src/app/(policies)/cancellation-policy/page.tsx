import React from 'react';

export default function CancellationPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Cancellation Policy</h1>
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs text-stone-700 leading-relaxed">
        <p>Orders can be cancelled free of charge prior to shipping dispatch.</p>
        <p>Once dispatched, cancellation is handled under our standard 7-day return policy upon delivery.</p>
      </div>
    </div>
  );
}
