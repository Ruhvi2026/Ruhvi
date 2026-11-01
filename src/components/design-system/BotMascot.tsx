'use client';

import React from 'react';

type BotMascotState = 'idle' | 'thinking' | 'happy' | 'waving';

interface BotMascotProps {
  size?: number;
  state?: BotMascotState;
  className?: string;
  showGlow?: boolean;
}

export default function BotMascot({
  size = 44,
  state = 'idle',
  className = '',
  showGlow = true,
}: BotMascotProps) {
  const stateClass =
    state === 'thinking'
      ? 'mascot-thinking'
      : state === 'happy'
        ? 'mascot-happy'
        : state === 'waving'
          ? 'mascot-waving'
          : 'mascot-bob';

  return (
    <div
      className={`relative inline-flex select-none items-center justify-center ${stateClass} ${className}`}
      style={{ width: size, height: size }}
      aria-label="GIA - Ruhvi Luxury Jewellery Concierge"
    >
      {showGlow && (
        <div
          className="mascot-glow pointer-events-none absolute -inset-1 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(197, 160, 89, 0.45) 0%, rgba(197, 160, 89, 0.15) 50%, transparent 70%)',
          }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-lg"
        role="img"
        aria-label="GIA Concierge"
      >
        <defs>
          {/* Luxury Metallic Gold Gradient */}
          <linearGradient
            id="gia-gold-metallic"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FFF3D1" />
            <stop offset="25%" stopColor="#E5C07B" />
            <stop offset="50%" stopColor="#C5A059" />
            <stop offset="75%" stopColor="#9E7A36" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>

          {/* Deep Royal Velvet Gradient for Base */}
          <radialGradient id="gia-velvet-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2E1B20" />
            <stop offset="55%" stopColor="#1C1014" />
            <stop offset="100%" stopColor="#0F090B" />
          </radialGradient>

          {/* Inner Rim Gold Shimmer */}
          <linearGradient id="gia-gold-rim" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8C6721" />
            <stop offset="30%" stopColor="#E5C07B" />
            <stop offset="70%" stopColor="#C5A059" />
            <stop offset="100%" stopColor="#FBF2DB" />
          </linearGradient>

          {/* Gemstone Facet Sheen */}
          <linearGradient
            id="gia-gem-sheen"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#F5DFAB" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#C5A059" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Outer Circular Medallion */}
        <circle cx="50" cy="50" r="47" fill="url(#gia-gold-metallic)" />
        <circle cx="50" cy="50" r="45" fill="#0F090B" />
        <circle
          cx="50"
          cy="50"
          r="43.5"
          fill="url(#gia-velvet-bg)"
          stroke="url(#gia-gold-rim)"
          strokeWidth="1"
        />

        {/* Subtle Decorative Concentric Beaded Halo */}
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="url(#gia-gold-rim)"
          strokeWidth="0.6"
          strokeDasharray="1.5 2"
          opacity="0.6"
        />

        {/* Solitaire Gemstone Crown */}
        <g transform="translate(50, 29) scale(0.72)">
          {/* Faceted Solitaire Diamond */}
          <polygon
            points="0,-13 11,-4 0,13 -11,-4"
            fill="url(#gia-gem-sheen)"
            stroke="url(#gia-gold-metallic)"
            strokeWidth="1"
          />
          <polygon
            points="0,-13 0,13 11,-4"
            fill="#C5A059"
            fillOpacity="0.35"
          />
          <polygon
            points="0,-13 0,13 -11,-4"
            fill="#FFF8E7"
            fillOpacity="0.45"
          />
          {/* Brilliant Center Point Accent */}
          <circle cx="0" cy="-4" r="1.5" fill="#FFFFFF" />
        </g>

        {/* "GIA" Luxury Monogram / Typography */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontFamily="var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="3"
          fill="url(#gia-gold-metallic)"
          className="drop-shadow-sm"
        >
          GIA
        </text>

        {/* "CONCIERGE" Subtitle in Fine Luxury Sans */}
        <text
          x="50"
          y="73"
          textAnchor="middle"
          fontFamily="var(--font-jost), 'Jost', sans-serif"
          fontSize="7"
          fontWeight="600"
          letterSpacing="3.2"
          fill="#E5C07B"
          opacity="0.9"
        >
          CONCIERGE
        </text>

        {/* Fine Underline Accent with Tiny Diamond Bead */}
        <line
          x1="32"
          y1="78"
          x2="46"
          y2="78"
          stroke="url(#gia-gold-metallic)"
          strokeWidth="0.8"
          opacity="0.7"
        />
        <circle cx="50" cy="78" r="1" fill="#FFF3D1" />
        <line
          x1="54"
          y1="78"
          x2="68"
          y2="78"
          stroke="url(#gia-gold-metallic)"
          strokeWidth="0.8"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}
