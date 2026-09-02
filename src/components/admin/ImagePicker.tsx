'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { uploadProductImage } from '@/lib/imageService';
import { toast } from 'react-hot-toast';

interface ImagePickerProps {
  onSelect: (url: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
}

export function ImagePicker({
  onSelect,
  buttonLabel = 'Choose Image',
  buttonClassName = 'rounded bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-300',
}: ImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const fetchGallery = useCallback(async () => {
    setIsLoadingGallery(true);
    setGalleryError(null);
    try {
      const res = await fetch('/api/admin/cloudinary/gallery');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch gallery');
      }

      setGalleryImages(data.resources || []);
    } catch (err: any) {
      setGalleryError(err.message);
    } finally {
      setIsLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'gallery' && galleryImages.length === 0) {
      fetchGallery();
    }
  }, [isOpen, activeTab, fetchGallery, galleryImages.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadResult = await uploadProductImage(file);
      onSelect(uploadResult.secure_url);
      setIsOpen(false);
    } catch (error: any) {
      toast.error('Cloudinary upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      if (e.target) {
        e.target.value = ''; // Reset input
      }
    }
  };

  const handleSelectGalleryImage = (url: string) => {
    onSelect(url);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Select Image
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-200">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex flex-1 items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-amber-900 text-amber-950'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Upload New</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`flex flex-1 items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'gallery'
                    ? 'border-b-2 border-amber-900 text-amber-950'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Cloudinary Gallery</span>
              </button>
            </div>

            {/* Content */}
            <div className="h-[60vh] min-h-[400px] overflow-y-auto bg-stone-50/30 p-6">
              {activeTab === 'upload' ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                  <div className="mb-4 rounded-full bg-stone-200 p-4">
                    <Upload className="h-8 w-8 text-stone-500" />
                  </div>
                  <h4 className="mb-1 font-semibold text-stone-900">
                    Upload an Image
                  </h4>
                  <p className="mb-6 max-w-sm text-sm text-stone-500">
                    Select a high-quality image from your local device to upload
                    it to Cloudinary.
                  </p>
                  <label className="relative cursor-pointer rounded-lg bg-amber-950 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900">
                    {isUploading ? (
                      <span className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    ) : (
                      <span>Browse Files</span>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              ) : (
                <div className="h-full">
                  {isLoadingGallery ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-900" />
                      <p className="text-sm text-stone-500">
                        Loading gallery...
                      </p>
                    </div>
                  ) : galleryError ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
                      <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                        <X className="h-6 w-6" />
                      </div>
                      <p className="max-w-md text-sm text-rose-600">
                        {galleryError}
                      </p>
                      <button
                        onClick={fetchGallery}
                        className="mt-2 flex items-center space-x-1 text-sm font-medium text-amber-900 hover:underline"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Try Again</span>
                      </button>
                    </div>
                  ) : galleryImages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
                      <ImageIcon className="h-10 w-10 text-stone-300" />
                      <p className="text-sm text-stone-500">
                        No images found in your Cloudinary gallery.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {galleryImages.map((img) => (
                        <button
                          key={img.asset_id}
                          onClick={() =>
                            handleSelectGalleryImage(img.secure_url)
                          }
                          className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                        >
                          <img
                            src={img.secure_url}
                            alt="Gallery Image"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-900 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                              Select
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
