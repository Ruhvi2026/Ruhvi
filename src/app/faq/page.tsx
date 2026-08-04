import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, ChevronDown, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions (FAQ) — Orders, Shipping & Warranty',
  description:
    'Got questions about ordering, BIS hallmarking, free insured shipping, or returns at Ruhvi? Find instant answers to all common questions.',
  openGraph: {
    title: 'Ruhvi FAQ | Frequently Asked Questions',
    description: 'Find answers regarding BIS certification, insured shipping, custom jewelry orders, and return policies.',
    url: 'https://ruhvi.in/faq',
  },
};

export default function FAQPage() {
  const faqCategories = [
    {
      category: 'Purity & Certification',
      icon: Award,
      faqs: [
        {
          q: 'Are all Ruhvi gold jewellery pieces BIS Hallmarked?',
          a: 'Yes, 100% of our gold jewellery carries official BIS Hallmarking displaying the gold purity (e.g., 22K 916 or 22K 750) alongside our registered logo.',
        },
        {
          q: 'Do solitaire diamonds come with certificates?',
          a: 'All solitaire diamonds above 0.30ct are certified by international grading laboratories such as IGI (International Gemological Institute) or GIA.',
        },
      ],
    },
    {
      category: 'Shipping & Delivery',
      icon: Truck,
      faqs: [
        {
          q: 'Is shipping free and insured?',
          a: 'Yes, we provide 100% free insured transit shipping across all serviceable pin codes in India. Your order is completely safe from dispatch to delivery.',
        },
        {
          q: 'How long does delivery take?',
          a: 'Standard orders ship within 2-4 business days and arrive in 3-5 business days. Custom or made-to-order pieces take 10-14 business days.',
        },
      ],
    },
    {
      category: 'Returns & Exchange',
      icon: RotateCcw,
      faqs: [
        {
          q: 'What is your return policy?',
          a: 'We offer a 15-day no-questions-asked return policy for all standard unworn jewellery items in original condition with intact certificates.',
        },
        {
          q: 'Do you offer a Lifetime Exchange program?',
          a: 'Yes, we provide a Lifetime Exchange policy for gold and diamond jewellery at current prevailing gold/diamond rates subject to standard processing fees.',
        },
      ],
    },
    {
      category: 'Orders & Customization',
      icon: ShieldCheck,
      faqs: [
        {
          q: 'Can I request custom ring sizes or personalized engravings?',
          a: 'Absolutely! Contact our jewelry concierge team via WhatsApp or Email after placing your order for free custom size adjustments and laser engraving.',
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept Credit/Debit Cards, Net Banking, UPI (PhonePe, Google Pay, Paytm), Wallet balance, and EMI options.',
        },
      ],
    },
  ];

  return (
    <div className="bg-stone-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-stone-500 text-sm max-w-md mx-auto font-light">
            Everything you need to know about our craftsmanship, delivery, and guarantees.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-8">
          {faqCategories.map((cat) => (
            <div key={cat.category} className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-9 h-9 bg-amber-50 text-amber-950 rounded-xl flex items-center justify-center border border-amber-200">
                  <cat.icon className="w-5 h-5" />
                </div>
                <h2 className="font-serif text-xl font-bold text-stone-900">{cat.category}</h2>
              </div>

              <div className="space-y-4">
                {cat.faqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group border border-stone-100 rounded-xl p-4 transition-all [&[open]]:bg-amber-50/40"
                  >
                    <summary className="font-semibold text-stone-900 text-sm cursor-pointer list-none flex items-center justify-between">
                      <span>{faq.q}</span>
                      <ChevronDown className="w-4 h-4 text-stone-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" />
                    </summary>
                    <p className="text-stone-600 text-xs mt-3 leading-relaxed font-light pl-1">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help */}
        <div className="bg-stone-900 text-white rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <h3 className="font-serif text-xl font-bold">Still have questions?</h3>
          <p className="text-stone-300 text-xs max-w-sm mx-auto font-light">
            Our jewelry concierges are available 7 days a week to guide you with your purchase.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/contact"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
