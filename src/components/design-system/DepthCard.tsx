'use client';

import React, { useCallback, useRef, useState } from 'react';

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
  maxTilt = 8,
  depth = 1,
  glow = false,
  glass = false,
}: DepthCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('');
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({});

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 2 * maxTilt;
      const rotateX = (0.5 - py) * 2 * maxTilt;
      const scale = 1 + depth * 0.015;

      setTransform(
        `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale}) translateZ(${depth * 6}px)`
      );

      setGlareStyle({
        background: `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255, 248, 224, 0.5), rgba(207, 167, 75, 0.1) 45%, transparent 65%)`,
      });
    },
    [maxTilt, depth]
  );

  const onMouseLeave = useCallback(() => {
    setTransform('');
    setGlareStyle({});
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`group relative transition-all duration-300 ease-out will-change-transform ${
        glass
          ? 'border border-gold-200/40 bg-white/45 backdrop-blur-md'
          : 'border border-gold-200/70 bg-cream-50'
      } rounded-2xl ${glow ? 'hover:shadow-xl hover:shadow-gold-500/20 hover:ring-1 hover:ring-gold-400/30' : 'hover:shadow-xl hover:shadow-gold-500/10'} ${className} `}
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl transition-opacity duration-300"
        style={{ ...glareStyle, opacity: transform ? 1 : 0 }}
      />
    </div>
  );
}
