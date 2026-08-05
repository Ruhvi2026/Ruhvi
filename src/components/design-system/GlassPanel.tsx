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
    light: 'bg-white/40 backdrop-blur-sm',
    medium: 'bg-white/55 backdrop-blur-md',
    heavy: 'bg-white/70 backdrop-blur-lg',
  };

  const depthShadows = [
    'shadow-sm',
    'shadow-md shadow-gold-500/5',
    'shadow-lg shadow-gold-500/10',
    'shadow-xl shadow-gold-500/15',
  ];

  return (
    <div
      className={` ${intensityStyles[intensity]} rounded-2xl border border-gold-200/50 ${depthShadows[Math.min(depth, 3)]} ${glow ? 'shadow-lg shadow-gold-400/20 ring-1 ring-gold-400/30' : ''} ${className} `}
      style={{ transform: `translateZ(${depth * 8}px)` }}
    >
      {children}
    </div>
  );
}
