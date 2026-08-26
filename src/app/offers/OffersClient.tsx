'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Tag, Sparkles, Clock, ArrowRight, Percent } from 'lucide-react';
import Image from 'next/image';
import { ecommerceEvent } from '@/lib/gtag';
import toast from 'react-hot-toast';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const ACTIVE_COUPONS = [
  {
    code: 'WELCOME10',
    title: 'Welcome Offer',
    description: 'Get 10% off your first purchase up to ₹500.',
    expiry: 'Never',
    bg: 'from-charcoal-900 to-charcoal-800',
    textColor: 'text-gold-100',
  },
  {
    code: 'WEDDING25',
    title: 'Bridal Collection Specials',
    description: 'Flat 25% off making charges on bridal sets over ₹50,000.',
    expiry: 'Ends in 3 Days',
    bg: 'from-gold-900 to-gold-800',
    textColor: 'text-gold-100',
  },
];

const DISCOUNTED_PRODUCTS = [
  {
    id: 'prod-demo-1',
    name: 'Aurelia Solitaire Diamond Ring',
    image:
      'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    originalPrice: 15500,
    price: 12500,
    discountBadge: 'Save ₹3,000',
  },
  {
    id: 'prod-demo-2',
    name: 'Celestial Pearl Drop Earrings',
    image:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
    originalPrice: 8900,
    price: 7500,
    discountBadge: '15% OFF',
  },
  {
    id: 'prod-demo-3',
    name: 'Royal Heritage Gold Bangle',
    image:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    originalPrice: 45000,
    price: 39500,
    discountBadge: 'Trending',
  },
];

export default function OffersPage() {
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Coupon code ${code} copied to clipboard!`);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      toast.error('Could not copy the code. Please copy it manually.');
    }
  };

  useEffect(() => {
    ACTIVE_COUPONS.forEach((coupon) => {
      ecommerceEvent('view_promotion', {
        promotion_id: coupon.code,
        promotion_name: coupon.title,
        items: [], // Can be populated if specific items are tied to the promo
      });
    });
  }, []);

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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {ACTIVE_COUPONS.map((coupon, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${coupon.bg} relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8`}
              >
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <h3
                      className={`font-serif text-xl font-bold sm:text-2xl ${coupon.textColor}`}
                    >
                      {coupon.title}
                    </h3>
                    <div className="flex items-center space-x-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Clock className="h-3 w-3" />
                      <span>{coupon.expiry}</span>
                    </div>
                  </div>
                  <p className="max-w-sm text-sm leading-relaxed text-white/80">
                    {coupon.description}
                  </p>
                </div>

                <div className="relative z-10 mt-8 flex items-center justify-between border-t border-white/20 pt-6">
                  <div className="rounded-xl border-2 border-dashed border-white/40 bg-black/20 px-4 py-2 font-mono text-xl font-bold tracking-wider text-white backdrop-blur-sm sm:text-2xl">
                    {coupon.code}
                  </div>
                  <button
                    onClick={() => handleCopyCode(coupon.code)}
                    className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-charcoal-900 shadow-lg transition-colors hover:scale-105 hover:bg-taupe-100"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            ))}
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

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {DISCOUNTED_PRODUCTS.map((product) => (
              <Link
                href="/products"
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-taupe-200 bg-white shadow-sm transition-all hover:border-gold-700/30 hover:shadow-xl"
              >
                <div className="relative aspect-square overflow-hidden bg-taupe-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-gold-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                    {product.discountBadge}
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-6">
                  <h3 className="mb-2 line-clamp-2 font-serif text-lg font-bold text-charcoal-900 transition-colors group-hover:text-gold-700">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex items-baseline space-x-3">
                    <span className="text-xl font-bold text-charcoal-900">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm font-medium text-charcoal-400 line-through">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
