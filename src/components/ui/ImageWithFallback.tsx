'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { getOptimizedImageUrl } from '@/lib/imageService';

interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string;
  fallbackComponent?: React.ReactNode;
}

export function ImageWithFallback({
  src,
  fallbackSrc,
  fallbackComponent,
  alt,
  className = '',
  ...rest
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Luxury jewelry fallback placeholder
  const defaultFallback = (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#F5EFE6] text-[#A38245] ${className}`}
      aria-label={alt || 'Ruhvi Fine Jewellery'}
    >
      <div className="relative z-10 flex flex-col items-center gap-2 p-4 text-center">
        {/* Elegant jewelry diamond crest SVG */}
        <svg
          className="h-10 w-10 text-[#C5A059] opacity-80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          aria-hidden="true"
        >
          <path
            d="M12 2L19.5 8.5L12 22L4.5 8.5L12 2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 8.5H19.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 2L12 8.5L15 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-serif text-[11px] font-medium uppercase tracking-[0.2em] text-[#8C6D2E]">
          Ruhvi Atelier
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#C5A059]/10 to-transparent" />
    </div>
  );

  // If no source is provided at all, show fallback immediately
  if (!src) {
    return fallbackComponent ? <>{fallbackComponent}</> : defaultFallback;
  }

  if (error) {
    if (fallbackSrc) {
      return (
        <Image
          {...rest}
          alt={alt || 'Image'}
          src={fallbackSrc}
          className={className}
          onError={() => setError(true)}
        />
      );
    }
    return fallbackComponent ? <>{fallbackComponent}</> : defaultFallback;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {isLoading && (
        <div
          className="absolute inset-0 z-0 animate-pulse bg-gradient-to-tr from-[#F5EFE6] via-[#FAF6ED] to-[#EFE7D8]"
          aria-hidden="true"
        />
      )}
      <Image
        {...rest}
        alt={alt || 'Image'}
        src={getOptimizedImageUrl(src)}
        className={`${className} transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}
