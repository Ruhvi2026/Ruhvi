import React from 'react';
import { notFound } from 'next/navigation';
import { DEMO_PRODUCTS } from '@/lib/products';
import { ProductDetailPageClient } from './ProductDetailPageClient';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
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
