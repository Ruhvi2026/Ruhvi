import React from 'react';
import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ProductDetailPageClient } from './ProductDetailPageClient';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import ProductSchema from '@/components/ProductSchema';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Fix 10: share the product lookup between generateMetadata and the page via
// React.cache(), so the slug/ID query runs once per request instead of twice.
const getProductBySlugOrId = cache(async (key: string): Promise<any | null> => {
  const supabase = await createClient();

  let { data: product } = await supabase
    .from('products')
    .select('*, images:product_images(*), category:categories(*)')
    .eq('slug', key)
    .single();

  if (!product) {
    const { data: productById } = await supabase
      .from('products')
      .select('*, images:product_images(*), category:categories(*)')
      .eq('id', key)
      .single();
    if (productById) {
      product = productById;
    }
  }

  if (!product) {
    return null;
  }

  return product;
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Ruhvi',
    };
  }

  const mainImage = product.images?.[0]?.url || '';
  const description =
    product.description ||
    `Buy ${product.name} at Ruhvi. Premium gold-plated & diamond-set fine jewellery with a 6-month color guarantee and free insured shipping.`;

  return {
    title: `${product.name} — Buy Online`,
    description,
    alternates: {
      canonical: `/products/${product.slug || product.id}`,
    },
    openGraph: {
      title: `${product.name} | Ruhvi Fine Jewellery`,
      description,
      url: `https://ruhvi.in/products/${product.slug || product.id}`,
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
  const product = await getProductBySlugOrId(slug);
  const supabase = await createClient();

  if (!product) {
    notFound();
  }

  // Safely fetch 360 viewer if available (without failing the entire page if table is missing)
  if (product && !product.viewer360) {
    try {
      const { data: viewer360Data } = await supabase
        .from('product_360_sets')
        .select('*')
        .eq('product_id', product.id)
        .maybeSingle();
      if (viewer360Data) {
        product.viewer360 = viewer360Data;
      }
    } catch {
      // product_360_sets table might not exist or error, continue safely
    }
  }

  if (!product.images || product.images.length === 0) {
    product.images = [];
  }

  let relatedProducts: any[] = [];
  if (product.category_id) {
    const { data: relDb } = await supabase
      .from('products')
      .select('*, images:product_images(*), category:categories(*)')
      .eq('category_id', product.category_id)
      .neq('id', product.id)
      .neq('status', 'hidden')
      .limit(4);
    if (relDb && relDb.length > 0) {
      relatedProducts = relDb;
    }
  }

  if (!relatedProducts || relatedProducts.length === 0) {
    const { data: anyDbProducts } = await supabase
      .from('products')
      .select('*, images:product_images(*), category:categories(*)')
      .neq('id', product.id)
      .neq('status', 'hidden')
      .limit(4);

    if (anyDbProducts && anyDbProducts.length > 0) {
      relatedProducts = anyDbProducts;
    }
  }

  return (
    <>
      <ProductSchema
        product={{
          id: product.slug || product.id,
          name: product.name,
          description: product.description || '',
          images: product.images?.map((i: any) => i.url) || [],
          price: product.price,
          currency: 'INR',
          sku: product.sku,
          slug: product.slug,
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
            {
              label: product.name,
              url: `/products/${product.slug || product.id}`,
            },
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
