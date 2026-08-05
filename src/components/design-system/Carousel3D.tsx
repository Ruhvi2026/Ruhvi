'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface Carousel3DProps {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export function Carousel3D({
  title,
  viewAllHref,
  children,
  className = '',
}: Carousel3DProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="font-serif text-2xl font-bold text-charcoal-900 sm:text-3xl">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group mr-2 flex items-center space-x-1 text-xs font-semibold uppercase tracking-wider text-gold-700 hover:text-gold-500"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          <button
            onClick={() => scroll('left')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-300/70 bg-cream-50 text-gold-700 transition-colors hover:bg-gold-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-300/70 bg-cream-50 text-gold-700 transition-colors hover:bg-gold-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-5 overflow-x-auto pb-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </div>
  );
}
