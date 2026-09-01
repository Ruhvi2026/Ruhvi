'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateStoreBanner } from '../actions';
import { Megaphone, Save, Loader2, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CMSBannersPage() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Banner State
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerColor, setBannerColor] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  useEffect(() => {
    fetchBannerData();
  }, []);

  const fetchBannerData = async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch Banner
    const { data: settings } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'global')
      .single();
    if (settings) {
      setBannerEnabled(settings.banner_enabled);
      setBannerText(settings.banner_text || '');
      setBannerColor(settings.banner_color || '');
      setBannerLink(settings.banner_link || '');
    }

    setLoading(false);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('banner_enabled', bannerEnabled ? 'on' : 'off');
    formData.append('banner_text', bannerText);
    formData.append('banner_color', bannerColor);
    formData.append('banner_link', bannerLink);

    startTransition(async () => {
      const result = await updateStoreBanner(formData);
      if (result.error) toast.error(result.error);
      else toast.success('Top banner updated successfully!');
    });
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">Loading CMS Data...</div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Banners & Hero</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage the promotional banners displayed across the storefront.
        </p>
      </div>

      {/* Top Banner Management */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <Megaphone className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">
            Top Promotional Banner
          </h2>
        </div>
        <form onSubmit={handleSaveBanner} className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={bannerEnabled}
                onChange={(e) => setBannerEnabled(e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500"></div>
              <span className="ml-3 text-sm font-medium text-slate-300">
                Enable Banner
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Banner Text
                </label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Background Tailwind Classes
                </label>
                <input
                  type="text"
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., bg-gradient-to-r from-indigo-600 to-purple-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Target Link (Optional)
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 py-2.5 pl-9 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="/categories/sale"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Live Preview
              </label>
              <div className="relative mt-2 flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                {bannerEnabled ? (
                  <div
                    className={`absolute inset-x-0 top-0 w-full px-4 py-2 text-center text-sm font-medium text-white ${bannerColor}`}
                  >
                    {bannerText}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-500">
                    Banner is disabled
                  </p>
                )}
                <div className="mt-8 flex h-12 w-3/4 items-center justify-center rounded-lg border-2 border-dashed border-slate-700">
                  <span className="text-xs text-slate-600">
                    Storefront Header
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Banner Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
