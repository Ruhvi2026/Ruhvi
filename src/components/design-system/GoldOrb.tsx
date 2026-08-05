'use client';

import React from 'react';

interface GoldOrbProps {
  size?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
  blur?: string;
  opacity?: number;
  className?: string;
}

export function GoldOrb({
  size = 200,
  top,
  left,
  right,
  bottom,
  delay = 0,
  blur = '60px',
  opacity = 0.15,
  className = '',
}: GoldOrbProps) {
  return (
    <div
      className={`animate-float-soft pointer-events-none absolute ${className}`}
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        animationDelay: `${delay}s`,
        animationDuration: `${6 + delay * 2}s`,
      }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(207, 167, 75, ${opacity}), rgba(194, 152, 49, ${opacity * 0.5}) 50%, transparent 70%)`,
          filter: `blur(${blur})`,
        }}
      />
    </div>
  );
}
