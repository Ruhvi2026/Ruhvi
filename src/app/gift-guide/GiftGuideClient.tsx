'use client';

import React from 'react';
import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';

export default function GiftGuidePage() {
  return (
    <div className="min-h-screen bg-champagne-100">
      {/* Hero */}
      <div className="relative flex h-[60vh] min-h-[500px] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-stone-900/60" />
        <div className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 text-center">
          <div className="inline-flex items-center space-x-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
            <Gift className="h-4 w-4" />
            <span>The Ruhvi Gift Guide</span>
          </div>
          <h1 className="font-serif text-5xl font-bold text-white drop-shadow-lg sm:text-6xl md:text-7xl">
            Give the Gift of Gold
          </h1>
          <p className="text-lg font-light text-stone-100 drop-shadow-md sm:text-xl">
            Find the perfect expression of your love with our curated
            collections of premium 22K gold-plated jewellery.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-taupe-200 bg-white p-12 text-center">
          <Gift className="mx-auto mb-4 h-10 w-10 text-taupe-300" />
          <h3 className="mb-2 font-serif text-lg font-bold text-charcoal-800">
            No Gift Categories Available
          </h3>
          <p className="text-sm text-charcoal-500">
            Gift categories are being curated. Check back soon.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-charcoal-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-charcoal-700"
          >
            Browse All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Services Banner */}
      <div className="bg-stone-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 divide-y divide-stone-700 text-center md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="px-6 py-4 md:py-0">
              <h4 className="mb-2 font-serif text-xl font-bold text-amber-200">
                Luxury Packaging
              </h4>
              <p className="text-sm text-stone-400">
                Every order arrives in our signature velvet box with a
                handwritten note.
              </p>
            </div>
            <div className="px-6 py-4 md:py-0">
              <h4 className="mb-2 font-serif text-xl font-bold text-amber-200">
                Premium Craftsmanship
              </h4>
              <p className="text-sm text-stone-400">
                Thick 22K gold-plated finish with anti-tarnish e-coating and a
                6-month color guarantee.
              </p>
            </div>
            <div className="px-6 py-4 md:py-0">
              <h4 className="mb-2 font-serif text-xl font-bold text-amber-200">
                Insured Delivery
              </h4>
              <p className="text-sm text-stone-400">
                Free, fully insured express shipping across India.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
