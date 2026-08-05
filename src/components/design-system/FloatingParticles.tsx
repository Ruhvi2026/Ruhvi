'use client';

import React, { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  phase: number;
  phaseSpeed: number;
}

interface FloatingParticlesProps {
  count?: number;
  color?: string;
  className?: string;
}

export function FloatingParticles({
  count = 30,
  color = '#cfa74b',
  className = '',
}: FloatingParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2.5 + 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -(Math.random() * 0.25 + 0.08),
        opacity: Math.random() * 0.45 + 0.1,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.008 + 0.003,
      }));
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.speedX + Math.sin(p.phase) * 0.15;
        p.y += p.speedY;
        p.phase += p.phaseSpeed;

        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const currentOpacity = p.opacity * (0.7 + Math.sin(p.phase) * 0.3);
        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size * 2
        );
        gradient.addColorStop(
          0,
          color +
            Math.round(currentOpacity * 255)
              .toString(16)
              .padStart(2, '0')
        );
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [count, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
