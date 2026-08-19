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
  // Use existing bobbing/floating state animations
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
      aria-label="Ruhvi Genie assistant"
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
        aria-label="Ruhvi Genie"
      >
        {/* Floating Smoke Tail */}
        <path
          d="M 50,68 C 50,68 38,76 43,84 C 48,92 56,92 50,98 C 45,95 48,88 52,84 C 55,80 50,68 50,68 Z"
          fill="url(#genie-smoke)"
        />
        <circle
          cx="44"
          cy="86"
          r="4.5"
          fill="url(#genie-smoke)"
          opacity="0.8"
        />
        <circle cx="53" cy="93" r="3" fill="url(#genie-smoke)" opacity="0.6" />

        {/* Crossed Arms */}
        <path
          d="M 32,68 C 42,75 58,75 68,68"
          fill="none"
          stroke="url(#genie-skin-dark)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Gold Bracelets on Crossed Arms */}
        <path
          d="M 33,68 L 36,70"
          stroke="url(#genie-gold)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 67,68 L 64,70"
          stroke="url(#genie-gold)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Genie Body/Vest */}
        <path
          d="M 34,58 C 34,58 36,71 50,71 C 64,71 66,58 66,58 Z"
          fill="url(#genie-skin)"
        />

        {/* Open Gold Vest */}
        <path
          d="M 34,58 C 34,58 38,69 46,69 C 41,66 38,62 34,58"
          fill="url(#genie-gold)"
        />
        <path
          d="M 66,58 C 66,58 62,69 54,69 C 59,66 62,62 66,58"
          fill="url(#genie-gold)"
        />

        {/* Gold Collar/Necklace */}
        <path
          d="M 39,58 C 44,64 56,64 61,58"
          fill="none"
          stroke="url(#genie-gold)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Head/Face */}
        <path
          d="M 33,36 C 33,36 28,45 30,52 C 32,59 50,62 50,62 C 50,62 68,59 70,52 C 72,45 67,36 67,36 Z"
          fill="url(#genie-skin)"
        />

        {/* Gold Hoop Earrings */}
        <circle
          cx="29"
          cy="46"
          r="5"
          fill="none"
          stroke="url(#genie-gold)"
          strokeWidth="2"
        />
        <circle
          cx="71"
          cy="46"
          r="5"
          fill="none"
          stroke="url(#genie-gold)"
          strokeWidth="2"
        />

        {/* Eyes */}
        <g className="mascot-eyes">
          <ellipse cx="43" cy="45" rx="2.8" ry="3.8" fill="#1e293b" />
          <ellipse cx="57" cy="45" rx="2.8" ry="3.8" fill="#1e293b" />
          <ellipse cx="44" cy="44" rx="1" ry="1.4" fill="#ffffff" />
          <ellipse cx="58" cy="44" rx="1" ry="1.4" fill="#ffffff" />
        </g>

        {/* Expressive Eyebrows */}
        <path
          d="M 38,39 Q 43,37 47,40"
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M 62,39 Q 57,37 53,40"
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Smile */}
        <path
          d="M 45,51 Q 50,55 55,51"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Cute Blush Cheeks */}
        <ellipse
          cx="37"
          cy="49"
          rx="2.5"
          ry="1.5"
          fill="#f472b6"
          opacity="0.4"
        />
        <ellipse
          cx="63"
          cy="49"
          rx="2.5"
          ry="1.5"
          fill="#f472b6"
          opacity="0.4"
        />

        {/* Royal Sapphire Turban */}
        <path
          d="M 33,36 C 33,22 67,22 67,36 C 67,41 33,41 33,36 Z"
          fill="url(#genie-turban-grad)"
        />
        {/* Turban Folds/Details */}
        <path
          d="M 32,36 C 38,33 50,40 50,40 C 50,40 37,42 32,36 Z"
          fill="rgba(255, 255, 255, 0.15)"
        />
        <path
          d="M 68,36 C 62,33 50,40 50,40 C 50,40 63,42 68,36 Z"
          fill="rgba(0, 0, 0, 0.15)"
        />

        {/* Center Jewel Setting */}
        <path d="M 50,26 L 54,34 L 50,42 L 46,34 Z" fill="url(#genie-gold)" />
        {/* Ruby Gem in center */}
        <ellipse cx="50" cy="34" rx="2.2" ry="3.2" fill="#ef4444" />
        <circle cx="49" cy="33" r="0.6" fill="#ffffff" />

        {/* Feathers on Turban */}
        <path
          d="M 50,26 C 48,16 50,9 50,9 C 50,9 52,16 50,26"
          fill="#f8fafc"
          opacity="0.9"
        />

        <defs>
          {/* Shiny Gold Gradient */}
          <linearGradient id="genie-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          {/* Magical Celestial Blue Skin */}
          <linearGradient id="genie-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Darker Skin for Shadow/Contrast */}
          <linearGradient id="genie-skin-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Rich Turban Gradient */}
          <linearGradient id="genie-turban-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="50%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          {/* Magical Smoke/Cloud Gradient */}
          <linearGradient id="genie-smoke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
