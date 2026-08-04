import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_PRODUCTS } from '@/lib/products';
import { ProductDetailPageClient } from './ProductDetailPageClient';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  let { data: product } = await supabase
    .from('products')
    .select('*, images:product_images(*)')
    .eq('slug', slug)
    .single();

  if (!product) {
    product = DEMO_PRODUCTS.find((p) => p.slug === slug) as any;
  }

  if (!product) {
    return {
      title: 'Product Not Found | Ruhvi',
    };
  }

  const mainImage =
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop';
  const description =
    product.description ||
    `Buy ${product.name} at Ruhvi. BIS hallmarked gold & certified diamond fine jewellery with lifetime warranty and free insured shipping.`;

  return {
    title: `${product.name} — Buy Online`,
    description,
    openGraph: {
      title: `${product.name} | Ruhvi Fine Jewellery`,
      description,
      url: `https://ruhvi.in/products/${product.slug}`,
      images: [
        {
          url: mainImage,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Ruhvi Fine Jewellery`,
      description,
      images: [mainImage],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  let { data: product } = await supabase
    .from('products')
    .select('*, images:product_images(*), category:categories(*)')
    .eq('slug', slug)
    .single();

  if (!product) {
    product = DEMO_PRODUCTS.find((p) => p.slug === slug) as any;
  }

  if (!product) {
    notFound();
  }

  // Server-rendered JSON-LD Product Schema
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    image: product.images?.map((i: any) => i.url) || [],
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'Ruhvi Fine Jewellery',
    },
    offers: {
      '@type': 'Offer',
      url: `https://ruhvi.in/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      priceValidUntil: '2030-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        product.status === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
    },
  };

  let { data: relatedProducts } = await supabase
    .from('products')
    .select('*, images:product_images(*), category:categories(*)')
    .eq('category_id', product.category_id || '')
    .neq('id', product.id)
    .neq('status', 'hidden')
    .limit(4);

  if (!relatedProducts || relatedProducts.length === 0) {
    relatedProducts = DEMO_PRODUCTS.filter(
      (p) => p.category_id === product.category_id && p.id !== product.id && p.status !== 'hidden'
    ).slice(0, 4) as any[];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailPageClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
