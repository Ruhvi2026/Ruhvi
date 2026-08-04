import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, Star, Layers } from 'lucide-react';
import { INITIAL_CATEGORIES, DEMO_PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';
import { createClient } from '@/lib/supabase/server';
import { Category, Collection, Product } from '@/types/database';

const FALLBACK_HOME_COLLECTIONS: Collection[] = [
  { id: 'col-1', title: 'Gifts For Her', slug: 'for-her', subtitle: 'Timeless pieces designed to make her feel extraordinary.', image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80' },
  { id: 'col-2', title: 'Gifts Under ₹15,000', slug: 'under-15000', subtitle: 'Beautiful 22K Gold jewellery that fits perfectly within budget.', image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80' },
  { id: 'col-3', title: 'Anniversary Specials', slug: 'anniversary', subtitle: 'Celebrate your journey with gold and solitaire diamonds.', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b4549e?auto=format&fit=crop&q=80' },
  { id: 'col-4', title: 'Royal Bridal Collection', slug: 'bridal', subtitle: 'Handcrafted Kundan and Emerald sets for grand celebrations.', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80' },
];

export const metadata: Metadata = {
  title: 'Ruhvi Fine Jewellery: Everyday Elegance, Crafted for You',
  description: 'Explore Ruhvi\'s signature collections of certified 22K Gold, VVS Solitaires, and modern designs crafted for life\'s beautiful moments.',
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: catData } = await supabase.from('categories').select('*').order('name');
  const categories: Category[] = catData && catData.length > 0 ? catData : INITIAL_CATEGORIES;

  const { data: colData } = await supabase.from('collections').select('*').order('title');
  const collections: Collection[] = colData && colData.length > 0 ? colData : FALLBACK_HOME_COLLECTIONS;

  const { data: prodData } = await supabase
    .from('products')
    .select('*, images:product_images(*)')
    .eq('status', 'active');
  const products: Product[] = prodData && prodData.length > 0 ? prodData : DEMO_PRODUCTS;

  const newArrivals = products.filter((p) => p.is_new_arrival);
  const bestSellers = products.filter((p) => p.is_best_seller);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ruhvi Fine Jewellery',
    url: 'https://ruhvi.in',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://ruhvi.in/products?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="space-y-16 pb-16 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-r from-fuchsia-50 via-pink-50 to-purple-50 text-slate-900 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(217,70,239,0.05),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center space-x-2 px-3 py-1 bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 rounded-full text-xs font-semibold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Certified Fine Jewellery</span>
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-purple-950 leading-tight">
              Ruhvi Fine Jewellery: <br />
              <span className="text-fuchsia-600">Everyday Elegance, Crafted for You</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Explore Ruhvi&apos;s signature collections of certified 22K Gold, VVS Solitaires, and modern designs crafted for life&apos;s beautiful moments.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/products"
                className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-fuchsia-600/20"
              >
                <span>Shop Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections/for-her"
                className="px-6 py-3 bg-white hover:bg-slate-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
              >
                Gifts for Her
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="w-full max-w-md h-[450px] relative rounded-3xl overflow-hidden shadow-2xl group border-[6px] border-white">
              <Image
                src="https://images.unsplash.com/photo-1599643478524-fb66f70d00f0?auto=format&fit=crop&q=80"
                alt="Elegant Rose Gold Necklace"
                fill
                priority
                className="w-full h-[450px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-pink-300 font-semibold">Featured Design</span>
                  <h3 className="text-xl font-serif font-bold text-white">Rose Gold Diamond Choker</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Circular Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-serif text-3xl font-bold text-purple-950">Shop by Category</h2>
          <div className="w-16 h-1 bg-fuchsia-500 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center space-y-3"
            >
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-slate-200 shadow-sm group-hover:shadow-md transition-all group-hover:border-fuchsia-300">
                {cat.image_url ? (
                  <Image 
                    src={cat.image_url} 
                    alt={cat.name} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 768px) 33vw, 16vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-fuchsia-50 text-fuchsia-400 group-hover:bg-fuchsia-100 transition-colors">
                    <Sparkles className="w-6 h-6" />
                  </div>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider text-center group-hover:text-fuchsia-600 transition-colors">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Collection Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-purple-50/40 py-12 rounded-3xl border border-purple-100/50 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center space-x-1.5 text-xs uppercase tracking-widest font-semibold text-purple-800 bg-purple-100/80 px-3 py-1 rounded-full">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Curated Themes</span>
          </span>
          <h2 className="font-serif text-3xl font-bold text-purple-950 mt-3">Shop by Collection</h2>
          <p className="text-slate-500 text-sm mt-2">Explore our exclusive collections crafted for every occasion & mood</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="group relative h-72 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all block border border-slate-200 transform hover:-translate-y-1"
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
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-slate-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
                  Collection
                </span>
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-fuchsia-200 transition-colors">
                  {col.title}
                </h3>
                {col.subtitle && (
                  <p className="text-xs text-slate-200 line-clamp-2 font-light leading-relaxed">
                    {col.subtitle}
                  </p>
                )}
                <div className="pt-1 flex items-center text-xs font-bold text-fuchsia-300 uppercase tracking-wider space-x-1 group-hover:translate-x-1 transition-transform">
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
            <span className="text-xs uppercase tracking-widest font-semibold text-fuchsia-600">Curated Additions</span>
            <h2 className="font-serif text-3xl font-bold text-purple-950 mt-1">New Arrivals</h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold uppercase tracking-wider text-purple-700 hover:text-fuchsia-600 flex items-center space-x-1"
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
      <section className="bg-fuchsia-50/50 py-12 border-t border-fuchsia-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase tracking-widest font-semibold text-fuchsia-600">Most Loved</span>
            <h2 className="font-serif text-3xl font-bold text-purple-950 mt-1">Best Sellers</h2>
            <div className="w-16 h-1 bg-fuchsia-500 mx-auto mt-4 rounded-full" />
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

