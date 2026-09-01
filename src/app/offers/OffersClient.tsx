'use client';

import React from 'react';
import Link from 'next/link';
import { Tag, Sparkles, ArrowRight, Percent } from 'lucide-react';

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-champagne-100">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-stone-900 py-16 sm:py-24">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid-pattern"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 40V0h40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center space-x-2 rounded-full border border-charcoal-800 bg-charcoal-900/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold-200">
            <Sparkles className="h-4 w-4" />
            <span>Exclusive Offers</span>
          </div>
          <h1 className="mb-6 font-serif text-4xl font-bold text-white sm:text-6xl">
            Ruhvi Privileges
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-charcoal-300 sm:text-base">
            Discover our curated selection of special offers, exclusive coupon
            codes, and limited-time savings on fine jewellery.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 lg:px-8">
        {/* Active Coupons Section */}
        <section className="space-y-8">
          <div className="flex items-center space-x-3 border-b border-taupe-200 pb-4">
            <Tag className="h-6 w-6 text-gold-700" />
            <h2 className="font-serif text-2xl font-bold text-charcoal-900">
              Active Coupons
            </h2>
          </div>

          <div className="rounded-2xl border border-dashed border-taupe-200 bg-white p-12 text-center">
            <Tag className="mx-auto mb-4 h-10 w-10 text-taupe-300" />
            <h3 className="mb-2 font-serif text-lg font-bold text-charcoal-800">
              No Active Coupons
            </h3>
            <p className="text-sm text-charcoal-500">
              There are no active coupons right now. Check back soon for new
              offers.
            </p>
          </div>
        </section>

        {/* Flash Sale Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-taupe-200 pb-4">
            <div className="flex items-center space-x-3">
              <Percent className="h-6 w-6 text-gold-700" />
              <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                Flash Sale
              </h2>
            </div>
            <Link
              href="/products"
              className="flex items-center text-xs font-bold uppercase tracking-wider text-charcoal-500 transition-colors hover:text-charcoal-900"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-dashed border-taupe-200 bg-white p-12 text-center">
            <Percent className="mx-auto mb-4 h-10 w-10 text-taupe-300" />
            <h3 className="mb-2 font-serif text-lg font-bold text-charcoal-800">
              No Flash Sale Items
            </h3>
            <p className="text-sm text-charcoal-500">
              There are no discounted items right now. Check back soon.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
