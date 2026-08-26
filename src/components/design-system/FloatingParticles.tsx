import React from 'react';

interface FloatingParticlesProps {
  count?: number;
  color?: string;
  className?: string;
  delay?: number;
}

export function FloatingParticles({
  count = 14,
  color = '#d6b36a',
  className = '',
  delay = 0,
}: FloatingParticlesProps) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: 5 + Math.abs(Math.sin(i * 12.9898)) * 90,
    top: 5 + Math.abs(Math.sin(i * 78.233)) * 90,
    size: 4 + (i % 3),
    opacity: 0.4 + (i % 4) * 0.1,
    duration: 4 + (i % 5),
    animationDelay: delay + (i % 10) * 0.35,
  }));

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {particles.map((particle, i) => (
        <span
          key={i}
          className="animate-float-soft absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            backgroundColor: color,
            opacity: particle.opacity,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.animationDelay}s`,
          }}
        />
      ))}
    </div>
  );
}
