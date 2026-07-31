'use client';

import React from 'react';
import Link from 'next/link';
import { Tag, Sparkles, Clock, ArrowRight, Percent } from 'lucide-react';
import Image from 'next/image';

const ACTIVE_COUPONS = [
  {
    code: 'WELCOME10',
    title: 'Welcome Offer',
    description: 'Get 10% off your first purchase up to ₹500.',
    expiry: 'Never',
    bg: 'from-amber-900 to-amber-800',
    textColor: 'text-amber-100',
  },
  {
    code: 'WEDDING25',
    title: 'Bridal Collection Specials',
    description: 'Flat 25% off making charges on bridal sets over ₹50,000.',
    expiry: 'Ends in 3 Days',
    bg: 'from-rose-900 to-rose-800',
    textColor: 'text-rose-100',
  }
];

const DISCOUNTED_PRODUCTS = [
  {
    id: 'prod-demo-1',
    name: 'Aurelia Solitaire Diamond Ring',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    originalPrice: 15500,
    price: 12500,
    discountBadge: 'Save ₹3,000',
  },
  {
    id: 'prod-demo-2',
    name: 'Celestial Pearl Drop Earrings',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
    originalPrice: 8900,
    price: 7500,
    discountBadge: '15% OFF',
  },
  {
    id: 'prod-demo-3',
    name: 'Royal Heritage Gold Bangle',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    originalPrice: 45000,
    price: 39500,
    discountBadge: 'Trending',
  }
];

export default function OffersPage() {
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Coupon code ${code} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-[#FAF6ED]">
      {/* Hero Banner */}
      <div className="bg-stone-900 py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V0h40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-amber-900/50 text-amber-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-amber-800">
            <Sparkles className="w-4 h-4" />
            <span>Exclusive Offers</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white mb-6">
            Ruhvi Privileges
          </h1>
          <p className="text-stone-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Discover our curated selection of special offers, exclusive coupon codes, and limited-time savings on fine jewellery.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        
        {/* Active Coupons Section */}
        <section className="space-y-8">
          <div className="flex items-center space-x-3 border-b border-stone-200 pb-4">
            <Tag className="w-6 h-6 text-amber-900" />
            <h2 className="font-serif text-2xl font-bold text-stone-900">Active Coupons</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ACTIVE_COUPONS.map((coupon, idx) => (
              <div key={idx} className={`bg-gradient-to-br ${coupon.bg} p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between h-full`}>
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white rounded-full opacity-10 blur-2xl"></div>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-serif text-xl sm:text-2xl font-bold ${coupon.textColor}`}>{coupon.title}</h3>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{coupon.expiry}</span>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed max-w-sm">{coupon.description}</p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between relative z-10">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-wider border-2 border-dashed border-white/40 px-4 py-2 rounded-xl bg-black/20 backdrop-blur-sm">
                    {coupon.code}
                  </div>
                  <button 
                    onClick={() => handleCopyCode(coupon.code)}
                    className="bg-white text-stone-900 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-100 transition-colors shadow-lg hover:scale-105"
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
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center space-x-3">
              <Percent className="w-6 h-6 text-rose-700" />
              <h2 className="font-serif text-2xl font-bold text-stone-900">Flash Sale</h2>
            </div>
            <Link href="/products" className="text-xs font-bold text-stone-500 uppercase tracking-wider hover:text-stone-900 flex items-center transition-colors">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {DISCOUNTED_PRODUCTS.map((product) => (
              <Link href={`/products/${product.id}`} key={product.id} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-900/30 transition-all shadow-sm hover:shadow-xl">
                <div className="relative aspect-square overflow-hidden bg-stone-100">
                  <Image 
                    src={product.image} 
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-4 left-4 bg-rose-700 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                    {product.discountBadge}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex items-baseline space-x-3">
                    <span className="text-xl font-bold text-stone-900">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm font-medium text-stone-400 line-through">
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
