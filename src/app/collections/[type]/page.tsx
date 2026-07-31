'use client';

import React, { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, Filter } from 'lucide-react';

const COLLECTIONS_DATA: Record<string, any> = {
  'for-her': {
    title: 'Gifts For Her',
    subtitle: 'Timeless pieces designed to make her feel extraordinary.',
    cover: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    products: [
      { id: 'prod-1', name: 'Aurelia Diamond Ring', price: 15500, image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80' },
      { id: 'prod-2', name: 'Celestial Pearl Drop', price: 8900, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80' },
    ]
  },
  'under-15000': {
    title: 'Gifts Under ₹15,000',
    subtitle: 'Beautiful 18K Gold jewellery that fits perfectly within budget.',
    cover: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    products: [
      { id: 'prod-3', name: 'Minimalist Gold Chain', price: 12000, image: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80' },
      { id: 'prod-4', name: 'Rose Gold Studs', price: 7500, image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80' },
    ]
  },
  'anniversary': {
    title: 'Anniversary Specials',
    subtitle: 'Celebrate your beautiful journey with the timeless elegance of gold and diamonds.',
    cover: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    products: [
      { id: 'prod-5', name: 'Eternity Diamond Band', price: 45000, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80' },
      { id: 'prod-6', name: 'Heritage Gold Necklace', price: 85000, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80' },
    ]
  }
};

export default function CollectionPage({ params }: { params: Promise<{ type: string }> }) {
  const resolvedParams = use(params);
  const type = resolvedParams.type;

  const collection = COLLECTIONS_DATA[type];

  if (!collection) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Dynamic Hero */}
      <div className="relative h-[40vh] min-h-[400px] flex items-center overflow-hidden">
        <Image 
          src={collection.cover} 
          alt={collection.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/gift-guide" className="inline-flex items-center text-white/80 hover:text-white mb-8 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Gift Guide
          </Link>
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 text-amber-300 mb-4">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Curated Collection</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-4">{collection.title}</h1>
            <p className="text-stone-200 text-lg leading-relaxed">{collection.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-stone-200 sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-stone-500">{collection.products.length} Products Found</span>
          <button className="flex items-center space-x-2 text-sm font-bold text-stone-900 hover:text-amber-900 uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {collection.products.map((product: any) => (
            <Link href={`/products/${product.id}`} key={product.id} className="group flex flex-col">
              <div className="relative aspect-[4/5] bg-stone-100 rounded-2xl overflow-hidden mb-4">
                <Image 
                  src={product.image} 
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-1">
                {product.name}
              </h3>
              <p className="text-stone-500 font-semibold mt-1">₹{product.price.toLocaleString('en-IN')}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
