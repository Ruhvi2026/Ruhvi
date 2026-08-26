import type { Metadata } from 'next';
import SharedWishlistPage from './SharedWishlistClient';

export const metadata: Metadata = {
  title: 'Shared Wishlist | Ruhvi Jewels',
  description:
    'A curated wishlist of handcrafted gold-plated jewellery from Ruhvi, shared by a friend.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/wishlist/share' },
};

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <SharedWishlistPage userId={userId} />;
}
