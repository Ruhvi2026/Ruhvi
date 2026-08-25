import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const COLLECTIONS_DATA: Record<string, any> = {
  'for-her': {
    title: 'Gifts For Her',
    subtitle: 'Timeless pieces designed to make her feel extraordinary.',
    cover:
      'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
    products: [
      {
        id: 'prod-1',
        name: 'Aurelia Diamond Ring',
        price: 15500,
        image:
          'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
      },
      {
        id: 'prod-2',
        name: 'Celestial Pearl Drop',
        price: 8900,
        image:
          'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
      },
    ],
  },
  'under-15000': {
    title: 'Gifts Under ₹15,000',
    subtitle: 'Beautiful 22K Gold jewellery that fits perfectly within budget.',
    cover:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    products: [
      {
        id: 'prod-3',
        name: 'Minimalist Gold Chain',
        price: 12000,
        image:
          'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
      },
      {
        id: 'prod-4',
        name: 'Rose Gold Studs',
        price: 7500,
        image:
          'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
      },
    ],
  },
  anniversary: {
    title: 'Anniversary Specials',
    subtitle:
      'Celebrate your beautiful journey with the timeless elegance of gold and diamonds.',
    cover:
      'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
    products: [
      {
        id: 'prod-5',
        slug: 'modern-minimalist-diamond-mangalsutra',
        name: 'Eternity Diamond Band',
        price: 45000,
        image:
          'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
      },
      {
        id: 'prod-6',
        slug: 'lotus-blossom-ruby-pendant',
        name: 'Heritage Gold Necklace',
        price: 85000,
        image:
          'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
      },
    ],
  },
  bestsellers: {
    title: 'Bestsellers',
    subtitle: 'Our most loved and sought-after jewellery pieces.',
    cover:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80',
    products: [
      {
        id: 'prod-1',
        slug: 'aurelia-solitaire-diamond-ring',
        name: 'Aurelia Diamond Ring',
        price: 15500,
        image:
          'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80',
      },
      {
        id: 'prod-2',
        slug: 'royal-heritage-emerald-choker-necklace',
        name: 'Royal Heritage Emerald Choker',
        price: 189999,
        image:
          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80',
      },
    ],
  },
  bridal: {
    title: 'Bridal Collection',
    subtitle: 'Exquisite jewelry for your special day.',
    cover:
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80',
    products: [
      {
        id: 'prod-2',
        slug: 'royal-heritage-emerald-choker-necklace',
        name: 'Royal Heritage Emerald Choker',
        price: 189999,
        image:
          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80',
      },
    ],
  },
};

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
          id, name, slug, description, base_price, is_new_arrival, is_best_seller, 
          status, categories(name), product_images(url)
        `
        )
        .in('id', productIds)
        .eq('status', 'active');

      if (prodData) {
        products = prodData.map((p: any) => ({
          ...p,
          price: p.base_price,
          image:
            p.product_images?.[0]?.url ||
            'https://images.unsplash.com/photo-1605100804763-247f67b4549e?auto=format&fit=crop&w=400&q=80',
        }));
      }
    }

    collection = {
      title: dbCollection.title,
      subtitle: dbCollection.subtitle,
      cover:
        dbCollection.image_url ||
        'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&q=80',
      products: products,
    };
  } else {
    // Fallback to static data if not in DB yet
    collection = COLLECTIONS_DATA[type];
  }

  if (!collection) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Dynamic Hero */}
      <div className="relative flex h-[40vh] min-h-[400px] items-center overflow-hidden">
        <Image
          src={collection.cover}
          alt={collection.title}
          fill
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
                  src={product.image}
                  alt={product.name}
                  fill
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
