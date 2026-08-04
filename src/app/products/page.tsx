import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductsCatalogClient from './ProductsCatalogClient';

export const metadata: Metadata = {
  title: 'All Fine Jewellery & Certified Gold Collections | Ruhvi',
  description: 'Explore our complete collection of certified 22K Gold and Diamond fine jewellery. Find rings, necklaces, earrings, and more at Ruhvi.',
  alternates: {
    canonical: '/products',
  },
};

export default function ProductsCatalogPage() {
  return <ProductsCatalogClient />;
}
