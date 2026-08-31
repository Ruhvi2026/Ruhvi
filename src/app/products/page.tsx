import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import ProductsCatalogClient from './ProductsCatalogClient';
import { queryCatalogPage } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'All Fine Jewellery & Gold-Plated Collections | Ruhvi',
  description:
    'Explore our complete collection of premium 22K gold-plated and diamond-set fine jewellery. Find rings, necklaces, earrings, and more at Ruhvi.',
  alternates: {
    canonical: '/products',
  },
};

export const dynamic = 'force-dynamic';

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const sp = await searchParams;

  // Initial fetch happens on the server (Suspense streaming below), with the
  // URL filters pushed into the Supabase query itself. Subsequent pages and
  // filter changes are served by /api/products using the same server query.
  const initial = await queryCatalogPage({
    search: sp.search || '',
    category: sp.category || 'all',
    stock: 'all',
    maxPrice: 200000,
    sortBy: 'newest',
    page: 1,
    pageSize: 12,
  });

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 p-12 text-center text-xs text-stone-500">
          <Sparkles className="h-4 w-4 animate-spin text-gold-400" />
          Loading catalog...
        </div>
      }
    >
      <ProductsCatalogClient
        initialProducts={initial.products}
        initialCount={initial.count}
        initialSearch={sp.search || ''}
        initialCategory={sp.category || 'all'}
      />
    </Suspense>
  );
}
