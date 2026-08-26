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
  size = 300,
  top,
  left,
  right,
  bottom,
  delay = 0,
  blur = '40px',
  opacity = 0.6,
  className = '',
}: GoldOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-float-soft pointer-events-none absolute ${className}`}
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        background:
          'radial-gradient(circle at 30% 30%, rgba(214,179,106,0.9), rgba(176,138,58,0.4) 45%, transparent 70%)',
        borderRadius: '9999px',
        filter: `blur(${blur})`,
        opacity,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
