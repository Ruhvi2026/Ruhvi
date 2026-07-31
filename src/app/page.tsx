import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Star } from 'lucide-react';
import { INITIAL_CATEGORIES, DEMO_PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';

export default function HomePage() {
  const newArrivals = DEMO_PRODUCTS.filter((p) => p.is_new_arrival);
  const bestSellers = DEMO_PRODUCTS.filter((p) => p.is_best_seller);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(217,119,6,0.15),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-widest border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Handcrafted Heritage Fine Jewellery</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Elegance Woven into Every <span className="text-amber-400">Detail</span>
            </h1>

            <p className="text-stone-300 text-sm sm:text-base max-w-xl font-light leading-relaxed">
              Explore Ruhvi&apos;s signature collections of certified 18K & 22K Gold, VVS Solitaires, and Royal Emerald Kundan pieces designed for life&apos;s priceless moments.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/products"
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs uppercase tracking-widest rounded-full shadow-lg transition-all hover:scale-105 text-center"
              >
                Explore Catalog
              </Link>
              <Link
                href="/category/bridal"
                className="w-full sm:w-auto px-8 py-3.5 border border-amber-400/40 hover:bg-amber-400/10 text-amber-200 font-semibold text-xs uppercase tracking-widest rounded-full transition-all text-center"
              >
                Bridal Collection
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-md rounded-2xl overflow-hidden shadow-2xl border border-amber-500/20 group">
              <img
                src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80"
                alt="Ruhvi Heritage Necklace"
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
          {INITIAL_CATEGORIES.slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group p-5 bg-white border border-stone-200 rounded-xl text-center shadow-sm hover:shadow-md hover:border-amber-400 transition-all transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-900 group-hover:text-amber-100 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider group-hover:text-amber-900">
                {cat.name}
              </h3>
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

