'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { ImageOff } from 'lucide-react';
import { getOptimizedImageUrl } from '@/services/cloudinaryService';

interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string;
  fallbackComponent?: React.ReactNode;
}

export function ImageWithFallback({
  src,
  fallbackSrc = '/images/placeholder.png',
  fallbackComponent,
  alt,
  className,
  ...rest
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  // If no source is provided at all, show fallback immediately
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-stone-300 ${className}`}
      >
        {fallbackComponent || <ImageOff className="h-8 w-8 opacity-50" />}
      </div>
    );
  }

  if (error) {
    if (fallbackSrc) {
      return (
        <Image
          {...rest}
          alt={alt || 'Image'}
          src={fallbackSrc}
          className={className}
        />
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-stone-300 ${className}`}
      >
        {fallbackComponent || <ImageOff className="h-8 w-8 opacity-50" />}
      </div>
    );
  }

  return (
    <Image
      {...rest}
      alt={alt || 'Image'}
      src={getOptimizedImageUrl(src)}
      className={className}
      onError={() => setError(true)}
    />
  );
}
