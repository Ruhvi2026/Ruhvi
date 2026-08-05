'use client';

import React, { useCallback, useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  scale?: number;
}

export function TiltCard({
  children,
  className = '',
  maxTilt = 8,
  glare = true,
  scale = 1.015,
}: TiltCardProps) {
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

      setTransform(
        `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        setGlareStyle({
          background: `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255, 248, 224, 0.55), rgba(207, 167, 75, 0.12) 40%, transparent 65%)`,
        });
      }
    },
    [maxTilt, glare, scale]
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
      className={`relative transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{ transform }}
    >
      {children}
      {glare && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ ...glareStyle, opacity: transform ? 1 : 0 }}
        />
      )}
    </div>
  );
}
