import type { Metadata } from 'next';
import GiftGuidePage from './GiftGuideClient';

export const metadata: Metadata = {
  title: 'Gift Guide | Ruhvi Jewels',
  description:
    'Find the perfect jewellery gift — for her, for anniversaries, and under ₹15,000. Curated gift ideas from Ruhvi.',
  alternates: { canonical: '/gift-guide' },
};

export default function Page() {
  return <GiftGuidePage />;
}
