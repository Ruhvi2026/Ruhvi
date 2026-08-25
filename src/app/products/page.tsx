import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductsCatalogClient from './ProductsCatalogClient';

export const metadata: Metadata = {
  title: 'All Fine Jewellery & Gold-Plated Collections | Ruhvi',
  description:
    'Explore our complete collection of premium 22K gold-plated and diamond-set fine jewellery. Find rings, necklaces, earrings, and more at Ruhvi.',
  alternates: {
    canonical: '/products',
  },
};

export default function ProductsCatalogPage() {
  return <ProductsCatalogClient />;
}
