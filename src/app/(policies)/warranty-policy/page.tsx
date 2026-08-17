import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Warranty Policy | Ruhvi',
  description:
    "Learn about Ruhvi's 6-month color and shine replacement guarantee on our jewellery.",
  alternates: { canonical: '/warranty-policy' },
};

export default function WarrantyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl font-bold text-stone-900">
        Warranty & Repair Policy
      </h1>
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-xs leading-relaxed text-stone-700 shadow-sm sm:p-8">
        <p>Every Ruhvi piece comes with the following coverage:</p>
        <div className="space-y-3 pt-2">
          <p>
            <strong className="font-semibold text-stone-900">
              6-Month Color Guarantee
            </strong>{' '}
            — Covers fading or discoloration of the gold plating under normal
            use, for 6 months from the delivery date.
          </p>
          <p>
            <strong className="font-semibold text-stone-900">
              7-Day Manufacturing Defect Warranty
            </strong>{' '}
            — If your piece has a manufacturing defect (faulty clasp, incorrect
            stone setting, structural flaw) within 7 days of delivery, we will
            replace or return it at no cost to you. We arrange pickup and return
            shipping — no additional charges apply.
          </p>
          <p>
            <strong className="font-semibold text-stone-900">
              Not Covered:
            </strong>{' '}
            Physical damage, chemical damage (from perfume, lotion, chlorine,
            etc.), loosened or damaged stones, and natural dullness from wear
            are not covered under this warranty.
          </p>
          <p className="pt-2">
            To claim, contact{' '}
            <a
              href="mailto:support@ruhvi.in"
              className="font-medium text-amber-950 underline"
            >
              support@ruhvi.in
            </a>{' '}
            with your order number and photos of the issue within the applicable
            window.
          </p>
        </div>
      </div>
    </div>
  );
}
