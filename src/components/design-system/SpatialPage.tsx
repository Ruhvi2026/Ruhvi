'use client';

import React from 'react';

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
  noBg = false,
}: SpatialPageProps) {
  return (
    <div
      className={`relative min-h-screen ${noBg ? '' : 'bg-cream-100'} ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
