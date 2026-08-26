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
import { getHomepageSettings } from '@/app/admin/actions/settings';

const FALLBACK_HOME_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    title: 'Gifts For Her',
    slug: 'for-her',
    subtitle: 'Timeless pieces designed to make her feel extraordinary.',
    image_url: '/images/categories/necklaces.jpg',
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
    image_url: '/images/categories/rings.jpg',
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
    "Explore Ruhvi's signature collections of premium 22K gold-plated jewellery, VVS Solitaires, and modern designs crafted for life's beautiful moments.",
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const hp = await getHomepageSettings();

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

      {/* ============ Cinematic Hero Section ============ */}
      <section className="relative flex h-[85vh] min-h-[600px] w-full items-center justify-center overflow-hidden bg-charcoal-900">
        {/* Cinematic Photography (Indian Model, Gold-Plated Jewelry) */}
        <div className="absolute inset-0 z-0">
          <Image
            src={
              hp.hero_image_url ||
              'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80'
            }
            alt={hp.hero_title || 'Ruhvi - Designed to be remembered'}
            fill
            className="object-cover opacity-65"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900/30 via-transparent to-charcoal-900/90" />
        </div>

        <div className="animate-fade-up relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-8 font-serif text-5xl font-medium tracking-tight text-white drop-shadow-lg sm:text-6xl md:text-7xl lg:text-8xl">
            {hp.hero_title || 'Designed to be remembered.'}
          </h1>
          <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Link
              href={hp.hero_cta1_link || '/products'}
              className="min-w-[220px] bg-white px-10 py-4 text-xs font-bold uppercase tracking-[0.15em] text-charcoal-900 transition-colors hover:bg-champagne-100"
            >
              {hp.hero_cta1_text || 'Explore Collection'}
            </Link>
            <Link
              href={hp.hero_cta2_link || '/collections/new-arrivals'}
              className="min-w-[220px] border border-white/50 px-10 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              {hp.hero_cta2_text || 'Discover New Arrivals'}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ Trust Strip ============ */}
      <section className="mx-auto -mt-2 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {[
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
              title: '6-Month Color Guarantee',
              sub: 'Covers gold plating fading & discoloration',
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
                <p className="mt-0.5 text-[11px] text-slate-600">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Editorial Category Experience ============ */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-center justify-between border-b border-gold-200/50 pb-4">
          <h2 className="font-serif text-3xl font-medium tracking-wide text-charcoal-900">
            Shop by Category
          </h2>
          <Link
            href="/products"
            className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-gold-600 transition-colors hover:text-charcoal-900 sm:block"
          >
            Explore All Categories
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group relative h-[300px] overflow-hidden bg-champagne-100 sm:h-[420px]"
            >
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
                  className="object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-champagne-200/50">
                  <Sparkles className="h-6 w-6 text-gold-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/40 via-transparent to-transparent transition-opacity duration-500 group-hover:opacity-80" />
              <div className="absolute inset-x-0 bottom-8 text-center">
                <h3 className="font-serif text-2xl font-medium tracking-wide text-white">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ Lifestyle & Editorial Video Section ============ */}
      <section className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="relative order-2 aspect-[3/4] w-full overflow-hidden bg-champagne-100 lg:order-1">
            <Image
              src={
                hp.lifestyle_image_url ||
                'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80'
              }
              alt="Lifestyle"
              fill
              className="object-cover"
            />
          </div>
          <div className="order-1 mx-auto flex max-w-md flex-col justify-center text-center lg:order-2 lg:mx-0 lg:text-left">
            <span className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-600">
              Editorial
            </span>
            <h2 className="mb-6 font-serif text-4xl font-medium leading-tight tracking-wide text-charcoal-900 sm:text-5xl">
              {hp.lifestyle_title || 'Elegance in Motion'}
            </h2>
            <p className="mb-10 text-sm leading-relaxed text-slate-600">
              {hp.lifestyle_text ||
                'See how our 22K gold-plated pieces come to life. Designed to drape perfectly, capturing light and attention wherever you go. Styled by leading Indian fashion curators for the modern woman.'}
            </p>
            <div>
              <Link
                href={hp.lifestyle_cta_link || '/products'}
                className="inline-block border border-charcoal-900 px-10 py-4 text-xs font-bold uppercase tracking-[0.15em] text-charcoal-900 transition-colors hover:bg-charcoal-900 hover:text-white"
              >
                {hp.lifestyle_cta_text || 'Read The Journal'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Editorial Featured Collections ============ */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-600">
            The Essentials
          </span>
          <h2 className="font-serif text-3xl font-medium tracking-wide text-charcoal-900 sm:text-4xl">
            Curated Collections
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Large Feature */}
          {collections[0] && (
            <div className="group relative h-[600px] overflow-hidden bg-champagne-100 md:col-span-8">
              <Image
                src={
                  collections[0].image_url || '/images/categories/necklaces.jpg'
                }
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                alt={collections[0].title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10 text-white">
                <h3 className="mb-3 font-serif text-4xl font-medium">
                  {collections[0].title}
                </h3>
                <Link
                  href={`/collections/${collections[0].slug}`}
                  className="border-b border-white/60 pb-1 text-xs uppercase tracking-[0.2em] transition-colors hover:border-white"
                >
                  Discover Collection
                </Link>
              </div>
            </div>
          )}

          {/* Smaller Supporting */}
          <div className="flex flex-col gap-6 md:col-span-4">
            {collections[1] && (
              <div className="group relative h-[288px] overflow-hidden bg-champagne-100">
                <Image
                  src={
                    collections[1].image_url ||
                    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80'
                  }
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt={collections[1].title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 text-white">
                  <h3 className="mb-2 font-serif text-2xl font-medium">
                    {collections[1].title}
                  </h3>
                  <Link
                    href={`/collections/${collections[1].slug}`}
                    className="border-b border-white/60 pb-1 text-[10px] uppercase tracking-[0.2em] transition-colors hover:border-white"
                  >
                    Explore
                  </Link>
                </div>
              </div>
            )}

            {collections[2] && (
              <div className="group relative h-[288px] overflow-hidden bg-champagne-100">
                <Image
                  src={
                    collections[2].image_url || '/images/categories/rings.jpg'
                  }
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt={collections[2].title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 text-white">
                  <h3 className="mb-2 font-serif text-2xl font-medium">
                    {collections[2].title}
                  </h3>
                  <Link
                    href={`/collections/${collections[2].slug}`}
                    className="border-b border-white/60 pb-1 text-[10px] uppercase tracking-[0.2em] transition-colors hover:border-white"
                  >
                    Explore
                  </Link>
                </div>
              </div>
            )}
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

      {/* ============ Brand CTA Banner (Why Ruhvi) ============ */}
      <section className="mx-auto mb-20 mt-32 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-champagne-100 p-12 text-center sm:p-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="mt-4 font-serif text-3xl font-medium text-charcoal-900 sm:text-5xl">
              {hp.why_ruhvi_title || 'Why Ruhvi?'}
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-sm font-light leading-relaxed text-slate-700 sm:text-base">
              {hp.why_ruhvi_text ||
                'At Ruhvi, we believe in uncompromised craftsmanship. Our jewellery is meticulously designed and intricately plated in 22K gold to ensure lasting brilliance, elevating your everyday style with an enduring premium identity.'}
            </p>
            <Link
              href={hp.why_ruhvi_cta_link || '/about'}
              className="mt-10 inline-block border-b border-charcoal-900 pb-1 text-xs font-bold uppercase tracking-[0.2em] text-charcoal-900 transition-colors hover:border-gold-600 hover:text-gold-600"
            >
              {hp.why_ruhvi_cta_text || 'Discover Our Philosophy'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
