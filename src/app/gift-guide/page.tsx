'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gift, Heart, Star, ArrowRight } from 'lucide-react';

const GIFT_CATEGORIES = [
  {
    title: 'Gifts for Her',
    description: 'Timeless pieces she will cherish forever.',
    image: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    link: '/collections/for-her',
    icon: Heart,
  },
  {
    title: 'Gifts Under ₹15,000',
    description: 'Beautiful jewellery that fits your budget.',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    link: '/collections/under-15000',
    icon: Star,
  },
  {
    title: 'Anniversary Specials',
    description: 'Celebrate milestones with 22K Gold.',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    link: '/collections/anniversary',
    icon: Gift,
  },
];

export default function GiftGuidePage() {
  return (
    <div className="min-h-screen bg-[#FAF6ED]">
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=80" 
          alt="Gift Guide Hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-stone-900/40" />
        
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
            <Gift className="w-4 h-4" />
            <span>The Ruhvi Gift Guide</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white drop-shadow-lg">
            Give the Gift of Gold
          </h1>
          <p className="text-stone-100 text-lg sm:text-xl font-light drop-shadow-md">
            Find the perfect expression of your love with our curated collections of BIS Hallmarked 22K Gold Jewellery.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Shop by Occasion</h2>
          <div className="w-24 h-1 bg-amber-900 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {GIFT_CATEGORIES.map((category, idx) => {
            const Icon = category.icon;
            return (
              <Link 
                href={category.link} 
                key={idx}
                className="group relative h-[450px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                <Image 
                  src={category.image} 
                  alt={category.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                  <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-full flex items-center justify-center mb-6 border border-white/30 transform group-hover:-translate-y-2 transition-transform duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-3">{category.title}</h3>
                  <p className="text-stone-300 text-sm mb-6 max-w-sm">{category.description}</p>
                  
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-amber-300 group-hover:text-white transition-colors">
                    <span>Explore Collection</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Services Banner */}
      <div className="bg-stone-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-stone-700">
            <div className="px-6 py-4 md:py-0">
              <h4 className="font-serif text-xl font-bold text-amber-200 mb-2">Luxury Packaging</h4>
              <p className="text-stone-400 text-sm">Every order arrives in our signature velvet box with a handwritten note.</p>
            </div>
            <div className="px-6 py-4 md:py-0">
              <h4 className="font-serif text-xl font-bold text-amber-200 mb-2">100% Certified</h4>
              <p className="text-stone-400 text-sm">BIS Hallmarked Gold and IGI Certified Diamonds.</p>
            </div>
            <div className="px-6 py-4 md:py-0">
              <h4 className="font-serif text-xl font-bold text-amber-200 mb-2">Insured Delivery</h4>
              <p className="text-stone-400 text-sm">Free, fully insured express shipping across India.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
