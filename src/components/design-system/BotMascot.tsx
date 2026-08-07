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
      className={`relative inline-flex items-center justify-center ${stateClass} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Ruhvi bot assistant"
    >
      {showGlow && (
        <div
          className="mascot-glow absolute inset-0 rounded-full"
          style={{ width: size, height: size }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-md"
        role="img"
        aria-label="Ruhvi jewellery bot"
      >
        {/* Shine sweep */}
        <g className="mascot-glint">
          <path
            d="M14 22 L30 6 L42 18 L26 34 Z"
            fill="url(#mascot-shine)"
            opacity="0.55"
          />
        </g>

        {/* Ring band */}
        <ellipse
          cx="50"
          cy="58"
          rx="34"
          ry="20"
          fill="none"
          stroke="url(#mascot-gold)"
          strokeWidth="13"
        />
        {/* Band inner highlight */}
        <ellipse
          cx="50"
          cy="58"
          rx="34"
          ry="20"
          fill="none"
          stroke="rgba(255, 251, 232, 0.5)"
          strokeWidth="2.5"
          strokeDasharray="38 150"
          strokeLinecap="round"
          transform="translate(0,-4)"
        />

        {/* Gem setting */}
        <path d="M50 18 L66 40 L50 62 L34 40 Z" fill="url(#mascot-gold)" />
        {/* Gem facets */}
        <path d="M50 18 L50 62 L58 48 Z" fill="rgba(255,255,255,0.28)" />
        <path d="M50 18 L50 62 L42 48 Z" fill="rgba(60,40,5,0.18)" />
        <path d="M50 22 L58 40 L50 58 L42 40 Z" fill="rgba(255,255,255,0.16)" />

        {/* Sparkling star on gem */}
        <g className="mascot-star">
          <path
            d="M50 30 L52.5 36 L58.5 36 L53.8 40 L55.5 46 L50 42.5 L44.5 46 L46.2 40 L41.5 36 L47.5 36 Z"
            fill="#fffbe8"
          />
        </g>

        {/* Face — eyes on band */}
        <g className="mascot-eyes">
          <ellipse cx="41" cy="58" rx="3.2" ry="4.2" fill="#332307" />
          <ellipse cx="59" cy="58" rx="3.2" ry="4.2" fill="#332307" />
          <ellipse cx="42" cy="56.4" rx="1.1" ry="1.4" fill="#fffbe8" />
          <ellipse cx="60" cy="56.4" rx="1.1" ry="1.4" fill="#fffbe8" />
        </g>

        {/* Blush */}
        <ellipse
          cx="36"
          cy="64"
          rx="3.5"
          ry="2"
          fill="#e7b98c"
          opacity="0.55"
        />
        <ellipse
          cx="64"
          cy="64"
          rx="3.5"
          ry="2"
          fill="#e7b98c"
          opacity="0.55"
        />

        {/* Smile */}
        <path
          d="M45 67 Q50 71 55 67"
          fill="none"
          stroke="#332307"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Waving arm (state) */}
        <g className="mascot-arm">
          <path
            d="M82 50 Q90 42 88 30"
            fill="none"
            stroke="url(#mascot-gold)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle cx="87.5" cy="27" r="5.5" fill="url(#mascot-gold)" />
        </g>

        <defs>
          <linearGradient id="mascot-gold" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#f3e8c4" />
            <stop offset="30%" stopColor="#cfa74b" />
            <stop offset="60%" stopColor="#c29831" />
            <stop offset="100%" stopColor="#9e7924" />
          </linearGradient>
          <linearGradient id="mascot-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbe8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fffbe8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
