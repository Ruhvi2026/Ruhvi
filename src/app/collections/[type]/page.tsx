import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Sparkles, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getOptimizedImageUrl } from '@/lib/imageService';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('title, subtitle')
    .eq('slug', type)
    .single();
  const title = data?.title;
  const description = data?.subtitle;

  return {
    title: title ? `${title} | Ruhvi Fine Jewellery` : 'Collections | Ruhvi',
    description,
    alternates: { canonical: `/collections/${type}` },
    openGraph: {
      title: title ? `${title} | Ruhvi` : 'Ruhvi Collections',
      description,
      url: `/collections/${type}`,
      siteName: 'Ruhvi Fine Jewellery',
      type: 'website',
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const resolvedParams = await params;
  const type = resolvedParams.type;

  const supabase = await createClient();
  const { data: dbCollection } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', type)
    .single();

  let collection = null;

  if (dbCollection) {
    // Fetch products for this collection
    const { data: pcData } = await supabase
      .from('product_collections')
      .select('product_id')
      .eq('collection_id', dbCollection.id);

    let products = [];
    if (pcData && pcData.length > 0) {
      const productIds = pcData.map((pc: any) => pc.product_id);
      const { data: prodData } = await supabase
        .from('products')
        .select(
          `
          id, name, slug, description, price, mrp, is_new_arrival, is_best_seller, 
          status, category:categories(name), images:product_images(url)
        `
        )
        .in('id', productIds)
        .eq('status', 'active');

      if (prodData) {
        products = prodData.map((p: any) => ({
          ...p,
          price: p.price,
          image: p.images?.[0]?.url || '/images/categories/rings.jpg',
        }));
      }
    }

    collection = {
      title: dbCollection.title,
      subtitle: dbCollection.subtitle,
      cover: dbCollection.image_url || '/images/categories/necklaces.jpg',
      products: products,
    };
  }

  if (!collection) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Dynamic Hero */}
      <div className="relative flex h-[40vh] min-h-[400px] items-center overflow-hidden">
        <Image
          src={getOptimizedImageUrl(collection.cover)}
          alt={collection.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/gift-guide"
            className="mb-8 inline-flex items-center text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Gift Guide
          </Link>
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center space-x-2 text-amber-300">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Curated Collection
              </span>
            </div>
            <h1 className="mb-4 font-serif text-4xl font-bold text-white sm:text-5xl">
              {collection.title}
            </h1>
            <p className="text-lg leading-relaxed text-stone-200">
              {collection.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-sm font-semibold text-stone-500">
            {collection.products.length} Products Found
          </span>
          <button className="flex items-center space-x-2 text-sm font-bold uppercase tracking-wider text-stone-900 hover:text-amber-900">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.products.map((product: any) => (
            <Link
              href={`/products/${product.slug || product.id}`}
              key={product.id}
              className="group flex flex-col"
            >
              <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">
                <Image
                  src={getOptimizedImageUrl(product.image)}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <h3 className="line-clamp-1 font-serif text-lg font-bold text-stone-900 transition-colors group-hover:text-amber-900">
                {product.name}
              </h3>
              <p className="mt-1 font-semibold text-stone-500">
                ₹{product.price.toLocaleString('en-IN')}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
