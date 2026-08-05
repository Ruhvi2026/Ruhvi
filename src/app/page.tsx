import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Star,
  Layers,
  Gem,
  Truck,
  RotateCcw,
  BadgeCheck,
} from 'lucide-react';
import { INITIAL_CATEGORIES, DEMO_PRODUCTS } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';
import { TiltCard } from '@/components/ui/TiltCard';
import Hero3D from '@/components/three/Hero3D';
import { createClient } from '@/lib/supabase/server';
import { Category, Collection, Product } from '@/types/database';

const FALLBACK_HOME_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    title: 'Gifts For Her',
    slug: 'for-her',
    subtitle: 'Timeless pieces designed to make her feel extraordinary.',
    image_url:
      'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
  },
  {
    id: 'col-2',
    title: 'Gifts Under ₹15,000',
    slug: 'under-15000',
    subtitle: 'Beautiful 22K Gold jewellery that fits perfectly within budget.',
    image_url:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
  },
  {
    id: 'col-3',
    title: 'Anniversary Specials',
    slug: 'anniversary',
    subtitle: 'Celebrate your journey with gold and solitaire diamonds.',
    image_url:
      'https://images.unsplash.com/photo-1605100804763-247f67b4549e?auto=format&fit=crop&q=80',
  },
  {
    id: 'col-4',
    title: 'Royal Bridal Collection',
    slug: 'bridal',
    subtitle: 'Handcrafted Kundan and Emerald sets for grand celebrations.',
    image_url:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
  },
];

export const metadata: Metadata = {
  title: 'Ruhvi Fine Jewellery: Everyday Elegance, Crafted for You',
  description:
    "Explore Ruhvi's signature collections of certified 22K Gold, VVS Solitaires, and modern designs crafted for life's beautiful moments.",
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: catData } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  const categories: Category[] =
    catData && catData.length > 0 ? catData : INITIAL_CATEGORIES;

  const { data: colData } = await supabase
    .from('collections')
    .select('*')
    .order('title');
  const collections: Collection[] =
    colData && colData.length > 0 ? colData : FALLBACK_HOME_COLLECTIONS;

  const { data: prodData } = await supabase
    .from('products')
    .select('*, images:product_images(*)')
    .eq('status', 'active');
  const products: Product[] =
    prodData && prodData.length > 0 ? prodData : DEMO_PRODUCTS;

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
    <div className="bg-cream-100 pb-20 text-charcoal-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* ============ 3D Hero Section ============ */}
      <section className="cream-radial relative overflow-hidden bg-cream-100 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-gold-200/40 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="animate-fade-up space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/60 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold-500" />
              <span>Certified Fine Jewellery</span>
            </span>

            <h1 className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-charcoal-900 sm:text-5xl lg:text-6xl">
              Everyday Elegance,
              <br />
              <span className="gold-shimmer">Crafted for You</span>
            </h1>

            <p className="mx-auto max-w-xl text-sm font-light leading-relaxed text-slate-600 sm:text-base lg:mx-0">
              Explore Ruhvi&apos;s signature collections of certified 22K Gold,
              VVS Solitaires, and modern designs crafted for life&apos;s
              beautiful moments.
            </p>

            <div className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4 lg:justify-start">
              <Link
                href="/products"
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-gold-500/30 transition-all hover:-translate-y-0.5 hover:from-gold-500 hover:to-gold-800 hover:shadow-gold-500/50 sm:w-auto"
              >
                <span>Shop Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/collections/for-her"
                className="block w-full justify-center rounded-xl border border-gold-400/70 bg-white/80 px-7 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-charcoal-900 shadow-sm transition-all hover:bg-white hover:shadow-md sm:w-auto"
              >
                Gifts for Her
              </Link>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 text-[11px] font-medium text-slate-500 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" /> 4.9
                Rated
              </span>
              <span className="h-1 w-1 rounded-full bg-gold-400" />
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-gold-600" /> BIS
                Hallmarked
              </span>
              <span className="h-1 w-1 rounded-full bg-gold-400" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gold-600" /> Lifetime
                Warranty
              </span>
            </div>
          </div>

          <div className="animate-fade-up-delay-1 relative flex justify-center">
            <div className="gold-card relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[2rem] shadow-2xl lg:aspect-square">
              <div className="absolute inset-3 overflow-hidden rounded-3xl border border-gold-300/50 bg-cream-50 sm:inset-4">
                <div className="absolute inset-0 flex flex-col">
                  <div className="relative flex-1">
                    <Hero3D />
                  </div>
                  <div className="relative z-10 -mt-10 flex justify-center pb-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-charcoal-900/85 px-4 py-2 shadow-lg backdrop-blur">
                      <Gem className="h-4 w-4 text-gold-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-cream-100">
                        Handcrafted 22K Gold · VVS Solitaires
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gold-400/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-gold-300/30 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ Trust Strip ============ */}
      <section className="mx-auto -mt-2 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {[
            {
              icon: Gem,
              title: 'BIS Hallmarked',
              sub: 'Certified 22K purity on every piece',
            },
            {
              icon: Truck,
              title: 'Insured Shipping',
              sub: 'Tamper-proof delivery across India',
            },
            {
              icon: RotateCcw,
              title: '7-Day Returns',
              sub: 'Hassle-free exchange & refund',
            },
            {
              icon: ShieldCheck,
              title: 'Lifetime Warranty',
              sub: 'On all gold plated pieces',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-gold-200/70 bg-white/70 p-4 text-center transition-all duration-300 hover:border-gold-400 hover:shadow-lg hover:shadow-gold-500/10 sm:p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-300/60 bg-gold-100 text-gold-700 transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-charcoal-900">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Category Circular Grid ============ */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-600">
            Browse the Collection
          </span>
          <h2 className="mt-2 font-serif text-3xl font-bold text-charcoal-900 sm:text-4xl">
            Shop by Category
          </h2>
          <div className="gold-divider mx-auto mt-4 w-24" />
        </div>

        <div className="perspective-1600 grid grid-cols-3 gap-6 sm:grid-cols-4 sm:gap-8 lg:grid-cols-6">
          {categories.slice(0, 12).map((cat) => (
            <TiltCard key={cat.id} maxTilt={10} scale={1.04} className="group">
              <Link
                href={`/category/${cat.slug}`}
                className="flex flex-col items-center space-y-3"
              >
                <div className="preserve-3d relative h-20 w-20 overflow-hidden rounded-full border-2 border-gold-300/70 bg-cream-50 shadow-md transition-all duration-300 group-hover:border-gold-500 group-hover:shadow-xl sm:h-28 sm:w-28">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 33vw, 16vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gold-100 text-gold-500 transition-colors group-hover:bg-gold-200">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors group-hover:text-gold-700 sm:text-sm">
                  {cat.name}
                </h3>
              </Link>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ============ Shop by Collection ============ */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gold-200/80 bg-cream-50/80 px-4 py-12 shadow-sm sm:px-8">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/50 bg-gold-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-700">
              <Layers className="h-3.5 w-3.5 text-gold-600" />
              <span>Curated Themes</span>
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-charcoal-900 sm:text-4xl">
              Shop by Collection
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Explore our exclusive collections crafted for every occasion &
              mood
            </p>
          </div>

          <div className="perspective-1000 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((col) => (
              <TiltCard key={col.id} maxTilt={7} className="group h-72">
                <Link
                  href={`/collections/${col.slug}`}
                  className="group relative block h-full overflow-hidden rounded-2xl border border-gold-300/60 shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-gold-600/20"
                >
                  {col.image_url ? (
                    <Image
                      src={col.image_url}
                      alt={col.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gold-100">
                      <Sparkles className="h-10 w-10 text-gold-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
                    <span className="inline-block rounded border border-gold-400/40 bg-charcoal-900/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold-200 backdrop-blur-sm">
                      Collection
                    </span>
                    <h3 className="font-serif text-xl font-bold text-cream-50 transition-colors group-hover:text-gold-200">
                      {col.title}
                    </h3>
                    {col.subtitle && (
                      <p className="line-clamp-2 text-xs font-light leading-relaxed text-cream-200/90">
                        {col.subtitle}
                      </p>
                    )}
                    <div className="flex items-center space-x-1 pt-1 text-xs font-bold uppercase tracking-wider text-gold-300 transition-transform group-hover:translate-x-1.5">
                      <span>Explore Collection</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ============ New Arrivals ============ */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-600">
              Curated Additions
            </span>
            <h2 className="mt-1 font-serif text-3xl font-bold text-charcoal-900 sm:text-4xl">
              New Arrivals
            </h2>
          </div>
          <Link
            href="/products"
            className="group flex items-center space-x-1 text-xs font-semibold uppercase tracking-wider text-gold-700 hover:text-gold-600"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ============ Best Sellers ============ */}
      <section className="mt-20 border-y border-gold-200/70 bg-gradient-to-b from-cream-50 to-cream-200/60 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-600">
              Most Loved
            </span>
            <h2 className="mt-1 font-serif text-3xl font-bold text-charcoal-900 sm:text-4xl">
              Best Sellers
            </h2>
            <div className="gold-divider mx-auto mt-4 w-24" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ Brand CTA Banner ============ */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="gold-gradient-bg relative overflow-hidden rounded-3xl p-10 text-center shadow-2xl shadow-gold-600/30 sm:p-14">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-gold-900/25 blur-3xl" />
          <div className="relative z-10">
            <Sparkles className="mx-auto h-6 w-6 text-gold-100" />
            <h2 className="mt-4 font-serif text-3xl font-bold text-white sm:text-4xl">
              Discover Your Signature Piece
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-light text-gold-100/90 sm:text-base">
              From everyday elegance to once-in-a-lifetime moments — find
              jewellery that tells your story.
            </p>
            <Link
              href="/products"
              className="mt-8 inline-flex items-center space-x-2 rounded-xl bg-charcoal-900 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-gold-200 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-charcoal-800"
            >
              <span>Shop the Collection</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
