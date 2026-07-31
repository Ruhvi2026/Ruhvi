'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Heart, Sparkles, ShoppingBag } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';

export default function SharedWishlistPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;

  // Show a curated shared wishlist selection
  const sharedProducts = DEMO_PRODUCTS.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Shared Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 to-stone-900 text-amber-100 rounded-2xl p-8 sm:p-10 shadow-xl mb-10 text-center relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Shared Jewellery Vault</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Curated Wishlist
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm font-light leading-relaxed">
            Viewing a shared collection of handcrafted fine jewellery from Ruhvi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sharedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 px-8 py-3.5 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-widest rounded-full shadow-lg transition-all hover:scale-105"
        >
          <span>Explore All Collections</span>
          <ShoppingBag className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
