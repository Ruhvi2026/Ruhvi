import React from 'react';

const SPECIFICATIONS = [
  { label: 'Base Metal', value: 'High-grade solid brass' },
  { label: 'Plating Options', value: '24K & 22K Micro Gold Plated' },
  {
    label: 'Plating Protection',
    value: 'Electronic anti-tarnish coating (e-coating), 100% waterproof',
  },
  {
    label: 'Skin Safety',
    value: 'Nickel-free, lead-free, 100% hypoallergenic for sensitive skin',
  },
  {
    label: 'Guarantee',
    value: '6-month color & shine replacement guarantee',
  },
  {
    label: 'Delivery & Shipping',
    value: 'All-India insured express delivery (2 to 5 business days)',
  },
];

const FAQS = [
  {
    question: 'How long does delivery take?',
    answer:
      'Standard estimated delivery takes 2 to 5 business days across India. All shipments are fully insured and dispatched with real-time tracking.',
  },
  {
    question: 'Is RUHVI gold plated jewellery anti-tarnish?',
    answer:
      'Yes, all RUHVI pieces use an advanced e-coating that protects against water, sweat, and tarnish, backed by a 6-month color guarantee.',
  },
  {
    question: 'Is RUHVI jewellery suitable for sensitive skin?',
    answer:
      'Yes, our pieces are crafted on nickel-free and lead-free bases, making them 100% hypoallergenic and skin-safe.',
  },
];

export default function ProductAttributes() {
  return (
    <div className="product-attributes my-6 space-y-6">
      {/* Specifications Grid */}
      <div className="rounded-xl border border-gold-200/50 bg-[#FDFBF7] p-5 shadow-sm">
        <h4 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold tracking-wide text-charcoal-900">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8C6D2E]" />
          Product Specifications
        </h4>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {SPECIFICATIONS.map((spec) => (
            <div
              key={spec.label}
              className="flex flex-col border-b border-gold-100/60 pb-2 sm:border-b-0"
            >
              <dt className="text-xs font-medium uppercase tracking-wider text-[#7A5C22]">
                {spec.label}
              </dt>
              <dd className="mt-0.5 text-xs font-light text-slate-700">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-xl border border-gold-200/40 bg-[#FAF6EE]/70 p-5">
        <h4 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold tracking-wide text-charcoal-900">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8C6D2E]" />
          Frequently Asked Questions
        </h4>
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          {FAQS.map((faq) => (
            <div
              key={faq.question}
              className="border-b border-gold-100/40 pb-2 last:border-b-0 last:pb-0"
            >
              <p className="font-medium text-charcoal-900">{faq.question}</p>
              <p className="mt-0.5 font-light text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
