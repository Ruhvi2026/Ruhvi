'use client';

import React, { useState } from 'react';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Sparkles, ZoomIn } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { ProductImage } from '@/types/database';
import {
  getProductImage,
  getZoomImage,
  getThumbnailImage,
} from '@/lib/imageService';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // If no images, provide a fallback
  if (!images || images.length === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gold-200/70 bg-cream-50 text-slate-400 shadow-sm">
        <Sparkles className="h-10 w-10" />
      </div>
    );
  }

  const currentImage = images[activeImageIndex];

  return (
    <div className="space-y-4">
      {/* Main Image Gallery */}
      <Gallery
        options={{
          arrowPrev: true,
          arrowNext: true,
          zoom: true,
          close: true,
          counter: false,
          bgOpacity: 0.9,
        }}
      >
        <div className="group relative aspect-square overflow-hidden rounded-2xl border border-gold-200/70 bg-gold-50/60 shadow-sm">
          {currentImage.type === '360' ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 p-6 text-center text-white backdrop-blur-sm">
              <Sparkles className="mb-2 h-10 w-10 animate-bounce text-gold-400" />
              <h4 className="font-serif text-lg font-bold">
                Interactive 360° View Coming Soon
              </h4>
              <p className="mt-1 text-xs text-slate-300">
                Our studio team is crafting the 3D model for this piece.
              </p>
            </div>
          ) : (
            <Item
              original={getZoomImage(currentImage.url)}
              thumbnail={getThumbnailImage(currentImage.url)}
              width="1600" // Estimated large size for PhotoSwipe layout calculation
              height="1600"
              alt={`${productName} | Ruhvi Fine Jewellery`}
            >
              {({ ref, open }) => (
                <div
                  className="relative h-full w-full cursor-zoom-in"
                  ref={ref as React.RefCallback<HTMLDivElement>}
                  onClick={open}
                >
                  <img
                    src={getProductImage(currentImage.url)}
                    alt={`${productName} | Ruhvi Fine Jewellery`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center space-x-1 rounded-full bg-white/90 p-2 text-xs text-slate-800 shadow-md transition-colors hover:bg-white">
                    <ZoomIn className="h-4 w-4" />
                    <span>Zoom</span>
                  </div>
                </div>
              )}
            </Item>
          )}

          {/* Hidden items for the rest of the gallery so they can be swiped through in fullscreen */}
          {images.map((img, idx) => {
            if (idx === activeImageIndex || img.type === '360') return null;
            return (
              <Item
                key={img.id || idx}
                original={getZoomImage(img.url)}
                thumbnail={getThumbnailImage(img.url)}
                width="1600"
                height="1600"
                alt={`${productName} - View ${idx + 1}`}
              >
                {({ ref, open }) => (
                  <img
                    ref={ref as React.RefCallback<HTMLImageElement>}
                    src={getProductImage(img.url)}
                    style={{ display: 'none' }}
                    onClick={open}
                    alt=""
                  />
                )}
              </Item>
            );
          })}
        </div>
      </Gallery>

      {/* Thumbnails Navigation */}
      {images.length > 1 && (
        <div className="scrollbar-hide flex items-center space-x-3 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setActiveImageIndex(idx)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                activeImageIndex === idx
                  ? 'border-gold-500 shadow-md ring-2 ring-gold-500/20'
                  : 'border-gold-200/70 hover:border-gold-400'
              }`}
            >
              <img
                src={getThumbnailImage(img.url)}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-slate-900/80 py-0.5 text-center text-[9px] uppercase tracking-wider text-white backdrop-blur-sm">
                {img.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
