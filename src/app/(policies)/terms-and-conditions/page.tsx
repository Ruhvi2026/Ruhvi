import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Ruhvi',
  description:
    'Read the terms and conditions for using Ruhvi.in and purchasing our products.',
  alternates: { canonical: '/terms-and-conditions' },
};

export default function TermsConditionsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-center font-serif text-3xl font-bold text-stone-900">
        Terms & Conditions
      </h1>

      <div className="space-y-6 rounded-2xl border border-[#E7D7A3]/50 bg-white p-6 text-sm leading-relaxed text-[#121110]/80 shadow-sm sm:p-10">
        <p className="font-medium">
          Welcome to Ruhvi.in. These terms and conditions outline the rules and
          regulations for the use of our website.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing this website, we assume you accept these terms and
            conditions in full. Do not continue to use Ruhvi.in if you do not
            accept all of the terms and conditions stated on this page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            2. Wallet & Reward Coins
          </h2>
          <p>
            Ruhvi offers promotional wallets and reward coins to enhance your
            shopping experience. Please note the following rules:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Reward Coins:</strong> Earned on qualifying purchases
              (usually 10% of product value). Coins are credited only after the
              7-day return window expires. Coins expire 100 days from the date
              of issue. 10 Coins = ₹1. A minimum order value of ₹250 is required
              to redeem coins.
            </li>
            <li>
              <strong>Wallet Cashback:</strong> You may receive 5% cashback on
              certain promotional orders when paid via Wallet. Wallet balances
              are strictly promotional and non-withdrawable to your bank
              account.
            </li>
            <li>
              <strong>Referral Program:</strong> When you refer a friend, you
              earn 500 Reward Coins (₹50 value) once their order is delivered
              and passes the 7-day return window. Your referred friend gets ₹100
              in Wallet balance (₹50 standard signup bonus + ₹50 referral
              bonus).
            </li>
            <li>
              We reserve the right to modify, expire, or cancel promotional
              coins and wallet balances in case of suspected fraud or abuse.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            3. Pricing and Availability
          </h2>
          <p>
            All prices are displayed in Indian Rupees (INR) and are final at the
            time of checkout. We reserve the right to modify prices without
            prior notice. While we strive to ensure stock accuracy, in rare
            cases, an item may become out of stock after an order is placed. In
            such instances, we will cancel the order and provide a full refund.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            4. Product Materials & Hallmarking
          </h2>
          <p>
            Our products are premium gold-plated jewelry designed for durability
            and elegance. Please note that government hallmarking standards
            apply exclusively to solid precious metals (like 14K/18K/22K solid
            gold). As our items are gold-plated, hallmark certification is not
            applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            5. Coupons & Discounts
          </h2>
          <p>
            Only one coupon code can be applied per order. However, coupons can
            be stacked with Wallet Balance and Reward Coins unless explicitly
            stated otherwise. Minimum order limits and usage limits apply to
            coupons.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            6. Intellectual Property
          </h2>
          <p>
            Unless otherwise stated, Ruhvi owns the intellectual property rights
            for all material on Ruhvi.in, including but not limited to jewelry
            designs, product photography, logos, and text. You may not
            republish, sell, rent, or duplicate our material without express
            written consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            7. Governing Law
          </h2>
          <p>
            These terms and conditions are governed by and construed in
            accordance with the laws of India, and you irrevocably submit to the
            exclusive jurisdiction of the courts in India for the resolution of
            any disputes.
          </p>
        </section>

        <section className="space-y-3 border-t border-[#E7D7A3]/50 pt-4">
          <h2 className="font-serif text-xl font-bold text-[#121110]">
            8. Grievance Officer
          </h2>
          <p>
            In accordance with the Information Technology Act, 2000 and rules
            made thereunder, the name and contact details of the Grievance
            Officer are provided below:
          </p>
          <div className="mt-2 text-[#121110]/80">
            <p>
              <span className="font-semibold">Name:</span>{' '}
              [GRIEVANCE_OFFICER_NAME]
            </p>
            <p>
              <span className="font-semibold">Designation:</span> Grievance
              Officer
            </p>
            <p>
              <span className="font-semibold">Email:</span> support@ruhvi.in
            </p>
            <p>
              <span className="font-semibold">Time to respond:</span> We will
              acknowledge your complaint within 48 hours and resolve it within
              30 days.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
