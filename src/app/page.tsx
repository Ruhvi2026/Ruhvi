import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, Star, Layers } from 'lucide-react';
import { INITIAL_CATEGORIES, DEMO_PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';
import { createClient } from '@/lib/supabase/server';
import { Category, Collection } from '@/types/database';

const FALLBACK_HOME_COLLECTIONS: Collection[] = [
  { id: 'col-1', title: 'Gifts For Her', slug: 'for-her', subtitle: 'Timeless pieces designed to make her feel extraordinary.', image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80' },
  { id: 'col-2', title: 'Gifts Under ₹15,000', slug: 'under-15000', subtitle: 'Beautiful 22K Gold jewellery that fits perfectly within budget.', image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80' },
  { id: 'col-3', title: 'Anniversary Specials', slug: 'anniversary', subtitle: 'Celebrate your journey with gold and solitaire diamonds.', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b4549e?auto=format&fit=crop&q=80' },
  { id: 'col-4', title: 'Royal Bridal Collection', slug: 'bridal', subtitle: 'Handcrafted Kundan and Emerald sets for grand celebrations.', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80' },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: catData } = await supabase.from('categories').select('*').order('name');
  const categories: Category[] = catData && catData.length > 0 ? catData : INITIAL_CATEGORIES;

  const { data: colData } = await supabase.from('collections').select('*').order('title');
  const collections: Collection[] = colData && colData.length > 0 ? colData : FALLBACK_HOME_COLLECTIONS;

  const newArrivals = DEMO_PRODUCTS.filter((p) => p.is_new_arrival);
  const bestSellers = DEMO_PRODUCTS.filter((p) => p.is_best_seller);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(217,119,6,0.15),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Certified 22K Fine Jewellery</span>
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-amber-50 leading-tight">
              Timeless Elegance, <br />
              <span className="text-amber-400">Crafted for You</span>
            </h1>
            <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Explore Ruhvi&apos;s signature collections of certified 22K Gold, VVS Solitaires, and Royal Emerald Kundan pieces designed for life&apos;s priceless moments.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/products"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                <span>Shop Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections/bridal"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all backdrop-blur-sm"
              >
                Bridal Collection
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="w-full max-w-md h-[450px] relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl group">
              <Image
                src="https://images.unsplash.com/photo-1599643478524-fb66f70d00f0?auto=format&fit=crop&q=80"
                alt="Royal Heritage Emerald Choker"
                fill
                priority
                className="w-full h-[450px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Featured Masterpiece</span>
                  <h3 className="text-xl font-serif font-bold text-white">Royal Heritage Emerald Choker</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-widest font-semibold text-amber-800">Categories</span>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">Shop by Category</h2>
          <div className="w-16 h-0.5 bg-amber-500 mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group relative h-40 overflow-hidden bg-stone-100 rounded-xl text-center shadow-sm hover:shadow-md transition-all block border border-stone-200 hover:border-amber-400"
            >
              {cat.image_url ? (
                <Image 
                  src={cat.image_url} 
                  alt={cat.name} 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  sizes="(max-width: 768px) 50vw, 16vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-50 text-amber-900 group-hover:bg-amber-900 group-hover:text-amber-100 transition-colors">
                  <Sparkles className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Collection Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-amber-50/50 py-12 rounded-3xl border border-amber-200/60 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center space-x-1.5 text-xs uppercase tracking-widest font-semibold text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full">
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>Curated Themes</span>
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mt-2">Shop by Collection</h2>
          <p className="text-stone-500 text-xs mt-1">Explore our exclusive collections crafted for every occasion & mood</p>
          <div className="w-16 h-0.5 bg-amber-500 mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="group relative h-72 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all block border border-amber-200/80 transform hover:-translate-y-1"
            >
              {col.image_url ? (
                <Image
                  src={col.image_url}
                  alt={col.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 bg-stone-900 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-amber-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                  Collection
                </span>
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-amber-200 transition-colors">
                  {col.title}
                </h3>
                {col.subtitle && (
                  <p className="text-xs text-stone-300 line-clamp-2 font-light leading-relaxed">
                    {col.subtitle}
                  </p>
                )}
                <div className="pt-1 flex items-center text-xs font-bold text-amber-300 uppercase tracking-wider space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Explore Collection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest font-semibold text-amber-800">Curated Additions</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">New Arrivals</h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold uppercase tracking-wider text-amber-900 hover:text-amber-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="bg-amber-900/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase tracking-widest font-semibold text-amber-800">Most Loved</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">Best Sellers</h2>
            <div className="w-16 h-0.5 bg-amber-500 mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

