'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { ImageOff } from 'lucide-react';

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
      <div className={`bg-stone-100 flex items-center justify-center text-stone-300 ${className}`}>
        {fallbackComponent || <ImageOff className="w-8 h-8 opacity-50" />}
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
      <div className={`bg-stone-100 flex items-center justify-center text-stone-300 ${className}`}>
        {fallbackComponent || <ImageOff className="w-8 h-8 opacity-50" />}
      </div>
    );
  }

  return (
    <Image
      {...rest}
      alt={alt || 'Image'}
      src={src}
      className={className}
      onError={() => setError(true)}
    />
  );
}
