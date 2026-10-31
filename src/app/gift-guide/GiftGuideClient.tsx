'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gift, ArrowRight, Sparkles } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/imageService';

interface GiftCategoryItem {
  slug: string;
  href: string;
  title: string;
  subtitle: string;
  tag: string;
  image: string;
}

const GIFT_CATEGORIES: GiftCategoryItem[] = [
  {
    slug: 'for-her',
    href: '/collections/for-her',
    title: 'Gifts For Her',
    subtitle:
      'Timeless pieces designed to make her feel extraordinary and cherished.',
    tag: 'Signature Curations',
    image: '/images/categories/necklaces.jpg',
  },
  {
    slug: 'under-15000',
    href: '/collections/under-15000',
    title: 'Gifts Under ₹15,000',
    subtitle:
      'Beautiful 22K Gold jewellery that fits perfectly within your celebratory budget.',
    tag: 'Affordable Luxury',
    image: '/images/categories/pendants.jpg',
  },
  {
    slug: 'anniversary',
    href: '/collections/anniversary',
    title: 'Anniversary Specials',
    subtitle:
      'Celebrate your journey together with the timeless elegance of gold and diamonds.',
    tag: 'Milestone Celebrations',
    image: '/images/categories/rings.jpg',
  },
];

export default function GiftGuidePage() {
  return (
    <div className="min-h-screen bg-champagne-100">
      {/* Hero */}
      <div className="relative flex h-[60vh] min-h-[500px] items-center justify-center overflow-hidden">
        <div className="backdrop-blur-xs absolute inset-0 bg-stone-900/60" />
        <div className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 text-center">
          <div className="inline-flex items-center space-x-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
            <Gift className="h-4 w-4 text-amber-300" />
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
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center space-x-2 text-gold-700">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Curated Occasions
            </span>
          </div>
          <h2 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 sm:text-4xl">
            Select an Occasion
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-charcoal-500">
            Every piece arrives nestled in signature velvet packaging, complete
            with a certificate of authenticity and 6-month color guarantee.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {GIFT_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-taupe-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                <Image
                  src={getOptimizedImageUrl(cat.image)}
                  alt={cat.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-stone-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-md">
                  {cat.tag}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="font-serif text-xl font-bold text-charcoal-900 transition-colors group-hover:text-gold-700">
                    {cat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-charcoal-500 sm:text-sm">
                    {cat.subtitle}
                  </p>
                </div>

                <div className="mt-6 flex items-center text-xs font-bold uppercase tracking-wider text-charcoal-900 group-hover:text-gold-700">
                  <span>Explore Gifts</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Browse All Products Fallback CTA */}
        <div className="mt-16 text-center">
          <p className="mb-4 text-xs uppercase tracking-wider text-charcoal-400">
            Looking for all categories?
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-lg bg-charcoal-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-charcoal-700"
          >
            Browse Complete Catalog <ArrowRight className="h-4 w-4" />
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
