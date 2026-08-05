'use client';

import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'medium' | 'heavy';
  glow?: boolean;
  depth?: number;
}

export function GlassPanel({
  children,
  className = '',
  intensity = 'medium',
  glow = false,
  depth = 0,
}: GlassPanelProps) {
  const intensityStyles = {
    light: 'bg-cream-50',
    medium: 'bg-cream-100',
    heavy: 'bg-white',
  };

  const depthShadows = ['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl'];

  return (
    <div
      className={` ${intensityStyles[intensity]} rounded-2xl border border-gold-200/50 ${depthShadows[Math.min(depth, 3)]} ${glow ? 'ring-1 ring-gold-400/30' : ''} ${className} `}
    >
      {children}
    </div>
  );
}
