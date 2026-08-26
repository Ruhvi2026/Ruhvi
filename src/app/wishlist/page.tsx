import type { Metadata } from 'next';
import WishlistPage from './WishlistClient';

export const metadata: Metadata = {
  title: 'My Wishlist | Ruhvi Jewels',
  description:
    'Your saved jewellery pieces. Review your Ruhvi wishlist and move favourites to your cart.',
  alternates: { canonical: '/wishlist' },
};

export default function Page() {
  return <WishlistPage />;
}
