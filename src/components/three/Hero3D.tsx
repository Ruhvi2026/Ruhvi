'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const HeroRingScene = dynamic(() => import('./HeroRingScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="gold-ring relative h-44 w-44 overflow-hidden rounded-full border-2 border-gold-400/60 sm:h-56 sm:w-56">
        <Image
          src="/images/categories/necklaces.jpg"
          alt="Ruhvi Fine Jewellery"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 176px, 224px"
        />
      </div>
    </div>
  ),
});

export default function Hero3D() {
  return <HeroRingScene />;
}
