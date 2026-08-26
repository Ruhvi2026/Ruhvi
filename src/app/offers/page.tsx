import type { Metadata } from 'next';
import OffersPage from './OffersClient';

export const metadata: Metadata = {
  title: 'Offers & Coupons | Ruhvi Jewels',
  description:
    'Exclusive offers, flash sales, and coupon codes for handcrafted 22K gold-plated jewellery at Ruhvi.',
  alternates: { canonical: '/offers' },
};

export default function Page() {
  return <OffersPage />;
}
