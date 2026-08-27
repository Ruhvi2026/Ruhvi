import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
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

  if (!category || category.is_hidden) {
    return { title: 'Category Not Found | Ruhvi' };
  }

  const title = `Buy Fine ${category.name} Online — Premium Gold Plated Jewellery`;
  const description = `Explore handcrafted ${category.name.toLowerCase()} at Ruhvi. Premium 22K gold-plated finish, anti-tarnish coating, 6-month color guarantee, and free insured shipping in India.`;

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

  if (!category || category.is_hidden) {
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Collections', url: '/products' },
          { label: category.name, url: `/category/${category.slug}` },
        ]}
      />
      {/* Category Header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950 to-stone-900 p-8 text-center text-white sm:p-12">
        <div className="relative z-10 mx-auto max-w-xl space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Collection
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl">
            {category.name}
          </h1>
          <p className="text-xs font-light text-stone-300 sm:text-sm">
            Handcrafted with premium 22K gold plating and ethically sourced
            gemstones.
          </p>
        </div>
      </div>

      {/* Category Product Grid */}
      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoryProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                {product.images && product.images[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase text-stone-400">
                    {product.sku}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 transition-colors group-hover:text-amber-800">
                    {product.name}
                  </h3>
                </div>
                <div className="mt-4 flex items-baseline space-x-2">
                  <span className="text-base font-bold text-amber-950">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.mrp > product.price && (
                    <span className="text-xs text-stone-400 line-through">
                      ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-sm">
          <h3 className="mb-2 font-serif text-lg font-bold text-stone-800">
            No Items Currently in {category.name}
          </h3>
          <p className="mb-6 text-xs text-stone-500">
            Explore our complete catalog for other designs.
          </p>
          <Link
            href="/products"
            className="rounded-lg bg-amber-950 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
          >
            Browse All Fine Jewellery
          </Link>
        </div>
      )}

      {/* SEO Content Block */}
      <div className="mt-16 border-t border-stone-200 pt-12">
        <div className="max-w-3xl">
          <h2 className="mb-4 font-serif text-2xl font-bold text-stone-900">
            Buy Exquisite {category.name} Online
          </h2>
          <div className="space-y-4 text-sm font-light leading-relaxed text-stone-600">
            <p>
              Discover our exclusive collection of {category.name.toLowerCase()}
              , meticulously handcrafted to blend traditional elegance with
              contemporary design. At Ruhvi Fine Jewellery, every piece is a
              testament to superior craftsmanship and timeless beauty.
            </p>
            <p>
              Whether you are looking for an everyday staple or a statement
              piece for a grand celebration, our {category.name.toLowerCase()}{' '}
              are crafted with a <strong>premium 22K gold-plated finish</strong>{' '}
              over a nickel-free brass base, with an anti-tarnish e-coating that
              is backed by our 6-month color guarantee. Every piece is finished
              with ethically sourced, VVS certified diamonds and gemstones.
              Enjoy the peace of mind that comes with our 6-month color
              guarantee, transparent pricing, and complimentary insured shipping
              across India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
