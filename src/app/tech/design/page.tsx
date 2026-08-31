'use client';

import React, { useState } from 'react';
import {
  PenTool,
  Image as ImageIcon,
  LayoutTemplate,
  Smartphone,
  Monitor,
  Save,
  Plus,
} from 'lucide-react';

export default function DesignManagerPage() {
  const [activeTab, setActiveTab] = useState('hero');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-2xl font-bold text-slate-100">
            <PenTool className="h-6 w-6 text-pink-400" />
            Website Design Manager
          </h1>
          <p className="mt-1 text-slate-400">
            Configure homepage banners, hero images, and layout blocks.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-pink-500/20 bg-pink-500/10 px-4 py-2 font-medium text-pink-400 transition-colors hover:bg-pink-500/20">
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('hero')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'hero' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Hero Carousel
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'banners' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Promo Banners
        </button>
        <button
          onClick={() => setActiveTab('thumbnails')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'thumbnails' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Category Thumbnails
        </button>
      </div>

      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-200">
              Main Hero Carousel
            </h2>
            <button className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-pink-400">
              <Plus className="h-4 w-4" /> Add Slide
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Slide 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-400">
                  <Monitor className="h-4 w-4" /> Slide 1 (Active)
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  Published
                </span>
              </div>

              <div className="group relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1599643478514-4a720230ed5a?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-50"></div>
                <div className="absolute relative inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-md hover:bg-white/20">
                    <ImageIcon className="h-4 w-4" /> Change Image
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Heading
                  </label>
                  <input
                    type="text"
                    defaultValue="The Summer Collection"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Subheading
                  </label>
                  <input
                    type="text"
                    defaultValue="Discover our new handcrafted pieces."
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-300"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-slate-500">
                      Button Text
                    </label>
                    <input
                      type="text"
                      defaultValue="Shop Now"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-300"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-slate-500">
                      Link URL
                    </label>
                    <input
                      type="text"
                      defaultValue="/collections/summer"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 2 */}
            <div className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border border-2 border-dashed border-slate-800 bg-slate-900 p-5 text-slate-500 transition-all hover:border-pink-500/30 hover:bg-pink-500/5 hover:text-pink-400">
              <Plus className="mb-2 h-8 w-8" />
              <p className="text-sm font-medium">Add New Slide</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-12 text-center text-slate-400">
          <LayoutTemplate className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>Promo Banners manager coming soon.</p>
        </div>
      )}

      {activeTab === 'thumbnails' && (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-12 text-center text-slate-400">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>Category Thumbnails manager coming soon.</p>
        </div>
      )}
    </div>
  );
}
