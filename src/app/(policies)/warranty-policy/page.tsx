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
        <p>
          Every authentic Ruhvi piece comes with our{' '}
          <strong>6-Month Comprehensive Warranty</strong>. All warranties
          provided by Ruhvi are strictly valid for <strong>6 months</strong>{' '}
          from the date of delivery:
        </p>
        <div className="space-y-3 pt-2">
          <p>
            <strong className="font-semibold text-stone-900">
              1. 6-Month Anti-Tarnish Color Guarantee
            </strong>{' '}
            — Covers fading, dullness, or discoloration of the authentic 22K
            gold nano e-coating under normal wear for 6 months from the delivery
            date. If your piece loses its luster within 6 months, we offer
            complimentary replating or a direct replacement.
          </p>
          <p>
            <strong className="font-semibold text-stone-900">
              2. 6-Month Manufacturing Defect Warranty
            </strong>{' '}
            — Covers craftsmanship flaws, broken soldering, faulty clasps, and
            loose stone settings for 6 months from delivery. If any defect is
            noticed within the first 7 days of delivery, we provide an
            immediate, zero-cost doorstep replacement or return with reverse
            pickup included. For defects occurring between Day 8 and Month 6, we
            provide free repair, replating, or replacement.
          </p>
          <p>
            <strong className="font-semibold text-stone-900">
              Ruhvi Privé Members:
            </strong>{' '}
            Privé VIP members receive priority concierge claim processing and
            complimentary piece inspection during their active membership.
          </p>
          <p>
            <strong className="font-semibold text-stone-900">
              Not Covered:
            </strong>{' '}
            Intentional physical damage, accidental breakage or crushing,
            exposure to harsh industrial chemicals, perfume or chlorine misuse
            beyond normal daily wear, and unauthorized third-party repairs or
            alterations are not covered under this warranty.
          </p>
          <p className="pt-2">
            To file a warranty claim, contact our concierge team at{' '}
            <a
              href="mailto:support@ruhvi.in"
              className="font-medium text-amber-950 underline"
            >
              support@ruhvi.in
            </a>{' '}
            or reach out to our WhatsApp support at +91 91535 77651 with your
            Order ID and clear photos/videos of the item.
          </p>
        </div>
      </div>
    </div>
  );
}
