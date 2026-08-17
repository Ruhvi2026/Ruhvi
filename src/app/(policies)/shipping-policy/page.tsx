import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Shipping Policy | Ruhvi',
  description:
    'Read about our shipping times, costs, and delivery partners for orders across India.',
  alternates: { canonical: '/shipping-policy' },
};

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-center font-serif text-3xl font-bold text-stone-900">
        Shipping & Delivery Policy
      </h1>

      <div className="space-y-6 rounded-2xl border border-[#E7D7A3]/50 bg-white p-6 text-sm leading-relaxed text-[#121110]/80 shadow-sm sm:p-10">
        <p className="font-medium">
          Effective Date:{' '}
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            1. Shipping Charges
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              We offer <strong>Free Standard Shipping</strong> on all prepaid
              and Cash on Delivery (COD) orders with a total cart value{' '}
              <strong>above ₹500</strong>.
            </li>
            <li>
              For orders with a cart value <strong>below ₹500</strong>, a flat
              shipping fee of <strong>₹49</strong> applies.
            </li>
            <li>
              If you choose Cash on Delivery (COD) as your payment method, an
              additional COD convenience charge of <strong>₹49</strong> is
              applied to the order, regardless of the cart value.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            2. Processing & Delivery Timelines
          </h2>
          <p>
            We partner with premium logistics providers to ensure your jewellery
            reaches you safely and quickly.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Processing Time:</strong> All orders are processed and
              dispatched within 1-2 business days from the time of confirmation.
            </li>
            <li>
              <strong>Delivery Time:</strong> Standard delivery usually takes
              3-7 business days depending on your pin code. Remote locations may
              take up to 10 business days.
            </li>
          </ul>
          <p>
            Please note that delivery timelines are estimates. Unforeseen
            circumstances such as weather disruptions or public holidays may
            cause minor delays.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            3. Order Tracking
          </h2>
          <p>
            Once your order is shipped, you will receive an email and WhatsApp
            update containing your AWB tracking number and a tracking link. You
            can also track the real-time status of your order directly from the
            "My Orders" section in your Ruhvi account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            4. Delivery Attempts & Failed Deliveries
          </h2>
          <p>
            Our courier partners typically make up to 3 delivery attempts. If
            you are unavailable, the package will be returned to our warehouse.
            In such cases:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Prepaid Orders:</strong> A refund will be initiated to
              your original payment method or Ruhvi Wallet (excluding the
              shipping charge, if applicable) once the item is returned to us.
            </li>
            <li>
              <strong>COD Orders:</strong> We may disable the COD option for
              your account for future orders if multiple COD deliveries are
              refused or uncollected.
            </li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-[#E7D7A3]/50 pt-4">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            Questions?
          </h2>
          <p>
            If you need help tracking your order or changing your delivery
            address before shipment, please contact us at{' '}
            <strong>support@ruhvi.in</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
