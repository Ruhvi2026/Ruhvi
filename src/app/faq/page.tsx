import { Metadata } from 'next';
import React from 'react';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Ruhvi',
  description:
    'Find answers to common questions about Ruhvi jewelry, shipping, returns, warranty, and more.',
  alternates: { canonical: '/faq' },
};

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How much does shipping cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer free standard shipping on all orders above ₹500. For orders below ₹500, a flat shipping fee of ₹49 is applied. If you choose Cash on Delivery (COD), an additional COD convenience charge of ₹49 will apply.',
        },
      },
      {
        '@type': 'Question',
        name: 'How long does delivery take?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Orders are dispatched within 1-2 business days. Standard delivery usually takes 3-7 business days depending on your location.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I track my order?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Once dispatched, you will receive an AWB tracking number via email and WhatsApp. You can also track your order directly from the "My Orders" section of your account.',
        },
      },
      {
        '@type': 'Question',
        name: "Can I return an item if I don't like it?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! We have a 7-day return policy. The jewelry must be completely unworn, unused, and in its original condition. IMPORTANT: Our jewelry comes with a security tag. If this tag is broken, removed, or tampered with at any point within the 7 days, the product return is NOT applicable.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I cancel my order?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can cancel your order at any time before it is shipped. Once the order status is "Shipped", it cannot be cancelled, but you can request a return after delivery.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is the jewelry hallmarked?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Government hallmarking applies only to solid gold jewelry (like 22K or 18K solid gold). Because our products are premium gold-plated jewelry, hallmarking is not applicable to them.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do Reward Coins work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You earn Reward Coins on purchases (usually 10% of the item value). These coins are credited to your account 7 days after delivery (once the return window closes). 10 Coins = ₹1. You need a minimum order of ₹250 to redeem coins on future purchases.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I transfer my Wallet balance to my bank account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No, the Ruhvi Wallet is a closed-loop promotional wallet. Balances can only be used for purchases on Ruhvi.in and cannot be withdrawn to a bank account.',
        },
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Breadcrumbs
        items={[
          { label: 'Home', url: '/' },
          { label: 'FAQs', url: '/faq' },
        ]}
      />
      <h1 className="text-center font-serif text-3xl font-bold text-stone-900">
        Frequently Asked Questions
      </h1>

      <div className="space-y-8 rounded-2xl border border-gold-200/50 bg-white p-6 text-sm leading-relaxed text-charcoal-900/80 shadow-sm sm:p-10">
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-charcoal-900">
            Orders & Shipping
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-charcoal-900">
                How much does shipping cost?
              </h3>
              <p>
                We offer free standard shipping on all orders above ₹500. For
                orders below ₹500, a flat shipping fee of ₹49 is applied. If you
                choose Cash on Delivery (COD), an additional COD convenience
                charge of ₹49 will apply.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-charcoal-900">
                How long does delivery take?
              </h3>
              <p>
                Orders are dispatched within 1-2 business days. Standard
                delivery usually takes 3-7 business days depending on your
                location.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-charcoal-900">
                How can I track my order?
              </h3>
              <p>
                Once dispatched, you will receive an AWB tracking number via
                email and WhatsApp. You can also track your order directly from
                the "My Orders" section of your account.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-charcoal-900">
            Returns & Cancellations
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-charcoal-900">
                Can I return an item if I don't like it?
              </h3>
              <p>
                Yes! We have a 7-day return policy. The jewelry must be
                completely unworn, unused, and in its original condition.{' '}
                <strong>
                  IMPORTANT: Our jewelry comes with a security tag. If this tag
                  is broken, removed, or tampered with at any point within the 7
                  days, the product return is NOT applicable.
                </strong>
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-charcoal-900">
                Can I cancel my order?
              </h3>
              <p>
                You can cancel your order at any time before it is shipped. Once
                the order status is "Shipped", it cannot be cancelled, but you
                can request a return after delivery.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-charcoal-900">
            Product Information
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-charcoal-900">
                Is the jewelry hallmarked?
              </h3>
              <p>
                No. Government hallmarking applies only to solid gold jewelry
                (like 22K or 18K solid gold). Because our products are premium
                gold-plated jewelry, hallmarking is not applicable to them.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-charcoal-900">
            Rewards & Wallet
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-charcoal-900">
                How do Reward Coins work?
              </h3>
              <p>
                You earn Reward Coins on purchases (usually 10% of the item
                value). These coins are credited to your account 7 days after
                delivery (once the return window closes). 10 Coins = ₹1. You
                need a minimum order of ₹250 to redeem coins on future
                purchases.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-charcoal-900">
                Can I transfer my Wallet balance to my bank account?
              </h3>
              <p>
                No, the Ruhvi Wallet is a closed-loop promotional wallet.
                Balances can only be used for purchases on Ruhvi.in and cannot
                be withdrawn to a bank account.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-gold-200/50 pt-4">
          <h2 className="font-serif text-xl font-bold text-charcoal-900">
            Still have questions?
          </h2>
          <p>
            We're here to help! Reach out to us at{' '}
            <strong>support@ruhvi.in</strong> or via our Contact Us page.
          </p>
        </section>
      </div>
    </div>
  );
}
