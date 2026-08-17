'use client';

import React from 'react';
import { Product360Set } from '@/types/database';

interface Product360ButtonProps {
  viewer360: Product360Set;
  onClick: () => void;
  className?: string;
}

export function Product360Button({
  viewer360,
  onClick,
  className = '',
}: Product360ButtonProps) {
  if (
    !viewer360 ||
    !viewer360.enabled ||
    !viewer360.frames ||
    viewer360.frames.length === 0
  ) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-neutral-800 shadow-sm backdrop-blur-sm transition-all hover:bg-neutral-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${className}`}
      aria-label="View product in 360 degrees"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 2a10 10 0 0 0 10 10" />
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      </svg>
      <span className="text-sm font-medium">360° View</span>
    </button>
  );
}
