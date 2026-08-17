import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Cancellation Policy | Ruhvi',
  description: 'Find out how to cancel your order before it ships from Ruhvi.',
  alternates: { canonical: '/cancellation-policy' },
};

export default function CancellationPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-center font-serif text-3xl font-bold text-stone-900">
        Cancellation Policy
      </h1>

      <div className="space-y-6 rounded-2xl border border-[#E7D7A3]/50 bg-white p-6 text-sm leading-relaxed text-[#121110]/80 shadow-sm sm:p-10">
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            1. When can I cancel my order?
          </h2>
          <p>
            You can cancel your order at any time{' '}
            <strong>before it is shipped</strong>. As long as your order status
            is marked as "Pending" or "Confirmed", you are eligible for an
            immediate cancellation and a full refund.
          </p>
          <p>
            Once an order has been marked as <strong>"Shipped"</strong> and
            handed over to our logistics partner, it can no longer be cancelled.
            You will need to receive the package and initiate a return as per
            our Return Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            2. How to cancel an order
          </h2>
          <p>To cancel an eligible order:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Log into your Ruhvi account.</li>
            <li>
              Go to <strong>My Account &gt; Orders</strong>.
            </li>
            <li>Select the order you wish to cancel.</li>
            <li>
              Click on the <strong>Cancel Order</strong> button. If the button
              is hidden or disabled, the order has already been processed for
              shipping.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            3. Refunds for Cancelled Orders
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Prepaid Orders:</strong> If you cancel a prepaid order
              before shipment, a full refund (including any shipping charges)
              will be automatically processed. The amount will be credited back
              to your original payment method or Ruhvi Wallet within 3-5
              business days.
            </li>
            <li>
              <strong>COD Orders:</strong> No refund is required as no payment
              has been made. However, frequent cancellations of COD orders may
              result in restricted access to the COD payment method in the
              future.
            </li>
            <li>
              <strong>Coupons & Reward Coins:</strong> If you used Reward Coins
              or a single-use coupon, they will be credited back to your account
              immediately upon cancellation.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            4. Cancellations by Ruhvi
          </h2>
          <p>
            We reserve the right to cancel any order under the following
            circumstances:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              The product is suddenly found to be out of stock or fails our
              quality check prior to dispatch.
            </li>
            <li>Incomplete or inaccurate shipping address provided.</li>
            <li>
              Suspicion of fraudulent activity or violation of our Terms &
              Conditions.
            </li>
          </ul>
          <p>
            If we cancel your prepaid order, you will be notified immediately
            and a full refund will be processed.
          </p>
        </section>
      </div>
    </div>
  );
}
