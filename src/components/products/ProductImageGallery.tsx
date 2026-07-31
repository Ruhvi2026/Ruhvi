'use client';

import React, { useState } from 'react';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Sparkles, ZoomIn } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { ProductImage } from '@/types/database';
import { getProductImage, getZoomImage, getThumbnailImage } from '@/lib/imageService';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // If no images, provide a fallback
  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
        <Sparkles className="w-10 h-10" />
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
        <div className="relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
          {currentImage.type === '360' ? (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center z-10">
              <Sparkles className="w-10 h-10 text-fuchsia-400 mb-2 animate-bounce" />
              <h4 className="font-serif text-lg font-bold">Interactive 360° View Coming Soon</h4>
              <p className="text-xs text-slate-300 mt-1">Our studio team is crafting the 3D model for this piece.</p>
            </div>
          ) : (
            <Item
              original={getZoomImage(currentImage.url)}
              thumbnail={getThumbnailImage(currentImage.url)}
              width="1600" // Estimated large size for PhotoSwipe layout calculation
              height="1600"
              alt={productName}
            >
              {({ ref, open }) => (
                <div className="w-full h-full cursor-zoom-in relative" ref={ref as React.RefCallback<HTMLDivElement>} onClick={open}>
                  <img
                    src={getProductImage(currentImage.url)}
                    alt={productName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-md text-xs flex items-center space-x-1 transition-colors">
                    <ZoomIn className="w-4 h-4" />
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
                  <img ref={ref as React.RefCallback<HTMLImageElement>} src={getProductImage(img.url)} style={{ display: 'none' }} onClick={open} alt="" />
                )}
              </Item>
            );
          })}
        </div>
      </Gallery>

      {/* Thumbnails Navigation */}
      {images.length > 1 && (
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setActiveImageIndex(idx)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                activeImageIndex === idx 
                  ? 'border-fuchsia-600 ring-2 ring-fuchsia-500/20 shadow-md' 
                  : 'border-slate-200 hover:border-fuchsia-300'
              }`}
            >
              <img src={getThumbnailImage(img.url)} alt={`${productName} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] uppercase tracking-wider text-center py-0.5 backdrop-blur-sm">
                {img.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
