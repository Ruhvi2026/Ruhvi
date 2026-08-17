'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product360Set } from '@/types/database';

interface Product360ViewerProps {
  viewer360: Product360Set;
}

export function Product360Viewer({ viewer360 }: Product360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedFrames, setLoadedFrames] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isZooming, setIsZooming] = useState(false);

  const frames = viewer360.frames;
  const frameCount = frames.length;

  // Preload logic
  useEffect(() => {
    if (frameCount === 0) return;

    const preloadFrame = (index: number) => {
      if (loadedFrames.has(index)) return;
      const img = new Image();
      img.src = frames[index].url;
      img.onload = () => {
        setLoadedFrames((prev) => new Set(prev).add(index));
      };
    };

    // Preload current, then adjacent, then all
    preloadFrame(currentIndex);

    const loadAdjacent = () => {
      for (let i = 1; i <= Math.ceil(frameCount / 2); i++) {
        const next = (currentIndex + i) % frameCount;
        const prev = (currentIndex - i + frameCount) % frameCount;
        preloadFrame(next);
        preloadFrame(prev);
      }
    };

    const timer = setTimeout(loadAdjacent, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, frames, frameCount, loadedFrames]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.isPrimary) {
      if (scale > 1) {
        setIsZooming(true);
      } else {
        setIsDragging(true);
      }
      setStartX(e.clientX);
      containerRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;

    if (isDragging && scale === 1) {
      const deltaX = e.clientX - startX;
      const sensitivity = 5; // Pixels per frame
      if (Math.abs(deltaX) >= sensitivity) {
        const framesToMove = Math.floor(Math.abs(deltaX) / sensitivity);
        const direction = Math.sign(deltaX); // Drag right => positive delta => rotate left

        // Dragging right makes it rotate left (like turning a real object)
        let nextIndex = (currentIndex - direction * framesToMove) % frameCount;
        if (nextIndex < 0) nextIndex += frameCount;

        setCurrentIndex(nextIndex);
        setStartX(e.clientX);
      }
    } else if (isZooming && scale > 1) {
      setTranslateX((prev) => prev + e.movementX);
      setTranslateY((prev) => prev + e.movementY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsZooming(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      const newScale = Math.min(Math.max(1, prev - e.deltaY * 0.01), 4);
      if (newScale === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return newScale;
    });
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const zoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return newScale;
    });
  };
  const resetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  if (!frames || frames.length === 0) return null;

  const currentFrame = frames[currentIndex];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-white">
      {/* Zoom controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white/80 p-2 shadow-sm backdrop-blur-sm">
        <button
          onClick={zoomIn}
          aria-label="Zoom in"
          className="rounded p-2 text-neutral-700 hover:bg-neutral-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={resetZoom}
          aria-label="Reset zoom"
          className="rounded p-2 text-neutral-700 hover:bg-neutral-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          aria-label="Zoom out"
          className="rounded p-2 text-neutral-700 hover:bg-neutral-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className={`flex h-full w-full touch-none items-center justify-center ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-move' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <img
          src={currentFrame.url}
          alt={currentFrame.alt || `Product 360 view frame ${currentIndex + 1}`}
          className="pointer-events-none max-h-full max-w-full select-none object-contain transition-transform duration-75"
          style={{
            transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
          }}
          draggable={false}
        />
        {!loadedFrames.has(currentIndex) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800"></div>
          </div>
        )}
      </div>

      {scale === 1 && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-neutral-500 shadow-sm backdrop-blur">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span>Drag to rotate</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </div>
      )}
    </div>
  );
}
