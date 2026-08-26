'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export default function AdminGalleryPage() {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGallery = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cloudinary/gallery');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch gallery');
      }

      setImages(data.resources || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Media Gallery
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            View all images uploaded to your Cloudinary storage.
          </p>
        </div>

        <button
          onClick={fetchGallery}
          className="flex items-center space-x-2 rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-900" />
            <p className="font-medium text-stone-500">Loading gallery...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
            <div className="rounded-full bg-rose-100 p-4 text-rose-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <p className="max-w-xl font-medium text-stone-700">{error}</p>
            <p className="max-w-xl text-sm text-stone-500">
              Check your Cloudinary API Key and Secret in .env.local
            </p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
            <ImageIcon className="h-16 w-16 text-stone-300" />
            <p className="font-medium text-stone-500">No images found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((img) => (
              <div
                key={img.asset_id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
              >
                <img
                  src={img.secure_url}
                  alt={img.public_id}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p
                    className="truncate text-xs font-medium text-white"
                    title={img.public_id}
                  >
                    {img.public_id.split('/').pop()}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-300">
                    {img.width}x{img.height} • {(img.bytes / 1024).toFixed(1)}{' '}
                    KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
