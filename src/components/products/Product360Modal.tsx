'use client';

import React, { useEffect, useRef } from 'react';
import { Product360Set } from '@/types/database';
import { Product360Viewer } from './Product360Viewer';

interface Product360ModalProps {
  viewer360: Product360Set;
  isOpen: boolean;
  onClose: () => void;
}

export function Product360Modal({
  viewer360,
  isOpen,
  onClose,
}: Product360ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus management
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="360 degree product viewer"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl outline-none md:h-[90vh] md:w-[90vw] md:max-w-6xl md:rounded-2xl"
      >
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4">
          <h2 className="text-lg font-medium text-white drop-shadow-md">
            360° View
          </h2>
          <button
            onClick={onClose}
            className="pointer-events-auto rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close 360 degree viewer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="relative h-full w-full flex-1">
          <Product360Viewer viewer360={viewer360} />
        </div>
      </div>
    </div>
  );
}
