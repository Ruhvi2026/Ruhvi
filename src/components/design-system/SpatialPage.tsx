'use client';

import React from 'react';
import { FloatingParticles } from './FloatingParticles';
import { GoldOrb } from './GoldOrb';

interface SpatialPageProps {
  children: React.ReactNode;
  className?: string;
  showParticles?: boolean;
  showOrbs?: boolean;
  noBg?: boolean;
}

export function SpatialPage({
  children,
  className = '',
  showParticles = true,
  showOrbs = true,
  noBg = false,
}: SpatialPageProps) {
  return (
    <div
      className={`relative min-h-screen ${noBg ? '' : 'bg-cream-100'} overflow-hidden ${className}`}
    >
      {showOrbs && (
        <>
          <GoldOrb size={320} top="-10%" left="10%" delay={0} opacity={0.12} />
          <GoldOrb size={260} top="40%" right="-5%" delay={2} opacity={0.1} />
          <GoldOrb size={200} bottom="5%" left="25%" delay={4} opacity={0.08} />
        </>
      )}
      {showParticles && (
        <FloatingParticles count={20} className="z-0 opacity-60" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
