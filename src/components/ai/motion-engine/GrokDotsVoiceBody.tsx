'use client';

import React, { useRef, useEffect } from 'react';

interface GrokDotsVoiceBodyProps {
  audioLevel?: number; // 0..1
  state?: 'idle' | 'listening' | 'speaking' | 'connecting' | 'error';
  className?: string;
  size?: number; // px width & height
}

interface DotParticle {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
  size: number;
  phase: number;
  speed: number;
}

export const GrokDotsVoiceBody: React.FC<GrokDotsVoiceBodyProps> = ({
  audioLevel = 0,
  state = 'idle',
  className = '',
  size = 240,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Generate Grok-inspired spherical lattice of dots
    const DOT_COUNT = 240;
    const RADIUS = size * 0.28;
    const dots: DotParticle[] = [];

    for (let i = 0; i < DOT_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / DOT_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = RADIUS * Math.cos(phi);

      dots.push({
        x,
        y,
        z,
        u: phi,
        v: theta,
        size: 1.2 + (i % 3) * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.5,
      });
    }

    const render = () => {
      time += 0.02;
      const cx = size / 2;
      const cy = size / 2;
      const fov = 300;

      ctx.clearRect(0, 0, size, size);

      // Color scheme based on state
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';
      const isError = state === 'error';

      const baseColor = isSpeaking
        ? '#f59e0b'
        : isListening
        ? '#10b981'
        : isError
        ? '#f43f5e'
        : '#eab308';
      const accentColor = isSpeaking
        ? '#fef08a'
        : isListening
        ? '#a7f3d0'
        : isError
        ? '#fecdd3'
        : '#fde047';

      // 3D rotation angles
      const rotY = time * 0.6;
      const rotX = Math.sin(time * 0.3) * 0.25;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Audio-reactive quantum expansion
      const dynamicExpansion = 1 + audioLevel * 0.7 + Math.sin(time * 2) * 0.05;

      // Draw background halo
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45);
      haloGrad.addColorStop(0, `${baseColor}30`);
      haloGrad.addColorStop(0.7, `${baseColor}08`);
      haloGrad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // Render dots
      dots.forEach((dot) => {
        // Wave perturbation
        const wave =
          Math.sin(time * 3 * dot.speed + dot.phase + audioLevel * 8) *
          (4 + audioLevel * 14);

        const px0 = (dot.x + wave) * dynamicExpansion;
        const py0 = (dot.y + wave) * dynamicExpansion;
        const pz0 = (dot.z + wave) * dynamicExpansion;

        // Rotate Y
        const px1 = px0 * cosY - pz0 * sinY;
        const pz1 = px0 * sinY + pz0 * cosY;
        const py1 = py0;

        // Rotate X
        const py2 = py1 * cosX - pz1 * sinX;
        const pz2 = py1 * sinX + pz1 * cosX;

        // Perspective
        const scale = fov / (fov + pz2 + 100);
        const screenX = cx + px1 * scale;
        const screenY = cy + py2 * scale;
        const dotRadius = Math.max(0.6, dot.size * scale * (pz2 > 0 ? 1.4 : 0.8));

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = pz2 > 0 ? accentColor : `${baseColor}88`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [audioLevel, state, size]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="block pointer-events-none" />
    </div>
  );
};
