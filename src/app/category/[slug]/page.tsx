import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { INITIAL_CATEGORIES, DEMO_PRODUCTS } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  let { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!category) {
    category = INITIAL_CATEGORIES.find((c) => c.slug === slug) as any;
  }

  if (!category) {
    return { title: 'Category Not Found | Ruhvi' };
  }

  const title = `Buy Fine ${category.name} Online — Certified Gold & Diamonds`;
  const description = `Explore handcrafted ${category.name.toLowerCase()} at Ruhvi. Certified 22K gold, ethically sourced diamonds, lifetime warranty, and free insured shipping in India.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/category/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://ruhvi.in/category/${category.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  
  let { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!category) {
    category = INITIAL_CATEGORIES.find((c) => c.slug === slug) as any;
  }

  if (!category) {
    notFound();
  }

  let { data: categoryProducts } = await supabase
    .from('products')
    .select('*, images:product_images(*), category:categories(*)')
    .eq('category_id', category.id)
    .neq('status', 'hidden');

  if (!categoryProducts || categoryProducts.length === 0) {
    categoryProducts = DEMO_PRODUCTS.filter(
      (p) => p.category?.slug === slug && p.status !== 'hidden'
    ) as any[];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Breadcrumbs 
        items={[
          { label: 'Collections', url: '/products' },
          { label: category.name, url: `/category/${category.slug}` }
        ]} 
      />
      {/* Category Header */}
      <div className="bg-gradient-to-r from-amber-950 to-stone-900 text-white rounded-2xl p-8 sm:p-12 mb-10 border border-amber-500/20 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
            Collection
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
            {category.name}
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm font-light">
            Handcrafted with certified 22K & 22K Gold and ethically sourced gemstones.
          </p>
        </div>
      </div>

      {/* Category Product Grid */}
      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                {product.images && product.images[0] && (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-stone-400 uppercase mb-1">{product.sku}</div>
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </div>
                <div className="mt-4 flex items-baseline space-x-2">
                  <span className="text-base font-bold text-amber-950">₹{product.price.toLocaleString('en-IN')}</span>
                  {product.mrp > product.price && (
                    <span className="text-xs text-stone-400 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-stone-800 mb-2">No Items Currently in {category.name}</h3>
          <p className="text-xs text-stone-500 mb-6">Explore our complete catalog for other designs.</p>
          <Link
            href="/products"
            className="px-6 py-2.5 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
          >
            Browse All Fine Jewellery
          </Link>
        </div>
      )}

      {/* SEO Content Block */}
      <div className="mt-16 pt-12 border-t border-stone-200">
        <div className="max-w-3xl">
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">
            Buy Exquisite {category.name} Online
          </h2>
          <div className="text-sm text-stone-600 space-y-4 font-light leading-relaxed">
            <p>
              Discover our exclusive collection of {category.name.toLowerCase()}, meticulously handcrafted to blend traditional elegance with contemporary design. At Ruhvi Fine Jewellery, every piece is a testament to superior craftsmanship and timeless beauty.
            </p>
            <p>
              Whether you are looking for an everyday staple or a statement piece for a grand celebration, our {category.name.toLowerCase()} are crafted using <strong>100% BIS Hallmarked 22K Gold</strong> and adorned with ethically sourced, VVS certified diamonds and gemstones. Enjoy the peace of mind that comes with our lifetime warranty, transparent pricing, and complimentary insured shipping across India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
