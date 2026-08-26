'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gift, Heart, Star, ArrowRight } from 'lucide-react';

const GIFT_CATEGORIES = [
  {
    title: 'Gifts for Her',
    description: 'Timeless pieces she will cherish forever.',
    image:
      'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    link: '/collections/for-her',
    icon: Heart,
  },
  {
    title: 'Gifts Under ₹15,000',
    description: 'Beautiful jewellery that fits your budget.',
    image:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    link: '/collections/under-15000',
    icon: Star,
  },
  {
    title: 'Anniversary Specials',
    description: 'Celebrate milestones with 22K Gold.',
    image:
      'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    link: '/collections/anniversary',
    icon: Gift,
  },
];

export default function GiftGuidePage() {
  return (
    <div className="min-h-screen bg-champagne-100">
      {/* Hero */}
      <div className="relative flex h-[60vh] min-h-[500px] items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=80"
          alt="Gift Guide Hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-stone-900/40" />

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
        <div className="mb-16 space-y-4 text-center">
          <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            Shop by Occasion
          </h2>
          <div className="mx-auto h-1 w-24 rounded-full bg-amber-900" />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {GIFT_CATEGORIES.map((category, idx) => {
            const Icon = category.icon;
            return (
              <Link
                href={category.link}
                key={idx}
                className="group relative h-[450px] overflow-hidden rounded-3xl shadow-lg transition-all duration-500 hover:shadow-2xl"
              >
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                  <div className="mb-6 flex h-12 w-12 transform items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 font-serif text-3xl font-bold">
                    {category.title}
                  </h3>
                  <p className="mb-6 max-w-sm text-sm text-stone-300">
                    {category.description}
                  </p>

                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-amber-300 transition-colors group-hover:text-white">
                    <span>Explore Collection</span>
                    <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            );
          })}
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
