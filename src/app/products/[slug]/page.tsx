import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_PRODUCTS } from '@/lib/products';
import { ProductDetailPageClient } from './ProductDetailPageClient';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import ProductSchema from '@/components/ProductSchema';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  let { data: product } = await supabase
    .from('products')
    .select('*, images:product_images(*), viewer360:product_360_sets(*)')
    .eq('slug', slug)
    .single();

  if (!product) {
    product = DEMO_PRODUCTS.find(
      (p) => p.slug === slug || p.id === slug
    ) as any;
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
    `Buy ${product.name} at Ruhvi. Premium gold-plated & diamond-set fine jewellery with a 6-month color guarantee and free insured shipping.`;

  return {
    title: `${product.name} — Buy Online`,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
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
    .select(
      '*, images:product_images(*), category:categories(*), viewer360:product_360_sets(*)'
    )
    .eq('slug', slug)
    .single();

  if (!product) {
    product = DEMO_PRODUCTS.find(
      (p) => p.slug === slug || p.id === slug
    ) as any;
  }

  if (!product) {
    notFound();
  }

  // We use the new ProductSchema component for JSON-LD and FAQ Schema

  let { data: relatedProducts } = await supabase
    .from('products')
    .select('*, images:product_images(*), category:categories(*)')
    .eq('category_id', product.category_id || '')
    .neq('id', product.id)
    .neq('status', 'hidden')
    .limit(4);

  if (!relatedProducts || relatedProducts.length === 0) {
    relatedProducts = DEMO_PRODUCTS.filter(
      (p) =>
        p.category_id === product.category_id &&
        p.id !== product.id &&
        p.status !== 'hidden'
    ).slice(0, 4) as any[];
  }

  return (
    <>
      <ProductSchema
        product={{
          id: product.id,
          name: product.name,
          description: product.description || '',
          images: product.images?.map((i: any) => i.url) || [],
          price: product.price,
          currency: 'INR',
          stock:
            product.stock_quantity ??
            (product.status === 'out_of_stock' ? 0 : 1),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'Collections', url: '/products' },
            ...(product.category
              ? [
                  {
                    label: product.category.name,
                    url: `/category/${product.category.slug}`,
                  },
                ]
              : []),
            { label: product.name, url: `/products/${product.slug}` },
          ]}
        />
      </div>
      <ProductDetailPageClient
        product={product}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
