'use client';

import React from 'react';

interface DepthCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  depth?: number;
  glow?: boolean;
  glass?: boolean;
}

export function DepthCard({
  children,
  className = '',
  glow = false,
}: DepthCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border border-gold-200/50 bg-white shadow-sm transition-shadow hover:border-gold-400 hover:shadow-lg ${glow ? 'ring-1 ring-gold-400/30' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
