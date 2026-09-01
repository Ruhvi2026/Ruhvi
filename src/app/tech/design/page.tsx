'use client';

import React, { useState } from 'react';
import {
  PenTool,
  Image as ImageIcon,
  LayoutTemplate,
  Save,
  Plus,
} from 'lucide-react';

export default function DesignManagerPage() {
  const [activeTab, setActiveTab] = useState('hero');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <PenTool className="h-6 w-6 text-pink-400" />
            Website Design Manager
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Configure homepage banners, hero images, and layout blocks.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-pink-500/20 bg-pink-500/10 px-4 py-2 font-medium text-pink-400 transition-colors hover:bg-pink-500/20">
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-tech-border">
        <button
          onClick={() => setActiveTab('hero')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'hero' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Hero Carousel
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'banners' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Promo Banners
        </button>
        <button
          onClick={() => setActiveTab('thumbnails')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'thumbnails' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Category Thumbnails
        </button>
      </div>

      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-200">
              Main Hero Carousel
            </h2>
            <button className="flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-pink-400 dark:text-slate-400">
              <Plus className="h-4 w-4" /> Add Slide
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-slate-600 dark:border-white/10 dark:bg-tech-card/50 dark:text-slate-400">
            <ImageIcon className="mx-auto mb-3 h-8 w-8 opacity-50" />
            <p>No hero slides configured.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Add a slide with an image, heading, and link to publish it on the
              homepage.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-slate-600 dark:border-white/10 dark:bg-tech-card/50 dark:text-slate-400">
          <LayoutTemplate className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>Promo Banners manager coming soon.</p>
        </div>
      )}

      {activeTab === 'thumbnails' && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-slate-600 dark:border-white/10 dark:bg-tech-card/50 dark:text-slate-400">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>Category Thumbnails manager coming soon.</p>
        </div>
      )}
    </div>
  );
}
