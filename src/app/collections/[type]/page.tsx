import React, { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Sparkles, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getOptimizedImageUrl } from '@/lib/imageService';
import { filterPublicProducts } from '@/lib/content/content-isolation';

const getCollectionBySlug = cache(async (type: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', type)
    .maybeSingle();

  if (data) return data;

  // Graceful virtual fallback collections for high-traffic homepage banners and gift guides
  if (type === 'new-arrivals') {
    return {
      id: 'virtual_new_arrivals',
      title: 'New Arrivals',
      subtitle: 'Explore our latest handcrafted fine jewellery designs.',
      image_url: '/images/categories/necklaces.jpg',
      isVirtual: true,
      virtualType: 'new_arrivals',
    };
  }
  if (type === 'best-sellers') {
    return {
      id: 'virtual_best_sellers',
      title: 'Best Sellers',
      subtitle: 'Our most cherished and timeless jewellery creations.',
      image_url: '/images/categories/pendants.jpg',
      isVirtual: true,
      virtualType: 'best_sellers',
    };
  }
  if (type === 'limited') {
    return {
      id: 'virtual_limited',
      title: 'Limited Edition',
      subtitle: 'Exclusive handcrafted masterpieces in limited quantities.',
      image_url: '/images/categories/bridal.jpg',
      isVirtual: true,
      virtualType: 'limited',
    };
  }
  if (type === 'for-her') {
    return {
      id: 'virtual_for_her',
      title: 'Gifts For Her',
      subtitle: 'Timeless pieces designed to make her feel extraordinary.',
      image_url: '/images/categories/necklaces.jpg',
      isVirtual: true,
      virtualType: 'for_her',
    };
  }
  if (type === 'under-15000') {
    return {
      id: 'virtual_under_15000',
      title: 'Gifts Under ₹15,000',
      subtitle:
        'Beautiful 22K Gold jewellery that fits perfectly within budget.',
      image_url: '/images/categories/pendants.jpg',
      isVirtual: true,
      virtualType: 'under_15000',
    };
  }
  if (type === 'anniversary') {
    return {
      id: 'virtual_anniversary',
      title: 'Anniversary Specials',
      subtitle:
        'Celebrate your beautiful journey with the timeless elegance of gold and diamonds.',
      image_url: '/images/categories/rings.jpg',
      isVirtual: true,
      virtualType: 'anniversary',
    };
  }

  return null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const data = await getCollectionBySlug(type);
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

  const dbCollection: any = await getCollectionBySlug(type);
  const supabase = await createClient();

  let collection = null;

  if (dbCollection) {
    let products: any[] = [];

    if (dbCollection.isVirtual) {
      let query = supabase
        .from('products')
        .select(
          `
          id, name, slug, description, price, mrp, is_new_arrival, is_best_seller, 
          status, category:categories(name), images:product_images(url)
        `
        )
        .eq('status', 'active');

      if (dbCollection.virtualType === 'new_arrivals') {
        query = query
          .order('is_new_arrival', { ascending: false })
          .order('created_at', { ascending: false });
      } else if (dbCollection.virtualType === 'best_sellers') {
        query = query
          .order('is_best_seller', { ascending: false })
          .order('created_at', { ascending: false });
      } else if (dbCollection.virtualType === 'under_15000') {
        query = query.lte('price', 15000).order('price', { ascending: false });
      } else if (dbCollection.virtualType === 'for_her') {
        query = query
          .order('is_best_seller', { ascending: false })
          .order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: prodData } = await query.limit(24);
      if (prodData) {
        products = prodData.map((p: any) => ({
          ...p,
          price: p.price,
          image: p.images?.[0]?.url || '/images/categories/rings.jpg',
        }));
      }
    } else {
      // Fetch products for this collection
      const { data: pcData } = await supabase
        .from('product_collections')
        .select('product_id')
        .eq('collection_id', dbCollection.id);

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
    }

    collection = {
      title: dbCollection.title,
      subtitle: dbCollection.subtitle,
      cover: dbCollection.image_url || '/images/categories/necklaces.jpg',
      products: filterPublicProducts(products),
    };
  }

  if (!collection) {
    notFound();
  }

  const isGiftGuideOrigin =
    type === 'for-her' || type === 'under-15000' || type === 'anniversary';

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
            href={isGiftGuideOrigin ? '/gift-guide' : '/products'}
            className="mb-8 inline-flex items-center text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />{' '}
            {isGiftGuideOrigin ? 'Back to Gift Guide' : 'Back to All Products'}
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
        {collection.products.length > 0 ? (
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
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-sm">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-amber-600/60" />
            <h3 className="mb-2 font-serif text-xl font-bold text-stone-900">
              No Products Currently in this Collection
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-stone-500">
              Our master artisans are curating exquisite pieces for{' '}
              {collection.title}. Explore our complete catalogue for currently
              available designs.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-700"
            >
              Browse All Fine Jewellery
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
