'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createHeroSlide, updateHeroSlide, deleteHeroSlide } from '../actions';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function CMSHomepagePage() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Hero State
  const [slides, setSlides] = useState<any[]>([]);
  const [editingSlide, setEditingSlide] = useState<any | null>(null);

  // New Slide Form State
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    button_text: '',
    button_link: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchCMSData();
  }, []);

  const fetchCMSData = async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch Slides
    const { data: heroSlides } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true });
    if (heroSlides) {
      setSlides(heroSlides);
    }

    setLoading(false);
  };

  const handleSaveSlide = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', slideForm.title);
    formData.append('subtitle', slideForm.subtitle);
    formData.append('image_url', slideForm.image_url);
    formData.append('button_text', slideForm.button_text);
    formData.append('button_link', slideForm.button_link);
    formData.append('sort_order', slideForm.sort_order.toString());
    formData.append('is_active', slideForm.is_active ? 'on' : 'off');

    startTransition(async () => {
      let result;
      if (editingSlide) {
        result = await updateHeroSlide(editingSlide.id, formData);
      } else {
        result = await createHeroSlide(formData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Slide ${editingSlide ? 'updated' : 'created'} successfully!`
        );
        setIsAddingSlide(false);
        setEditingSlide(null);
        setSlideForm({
          title: '',
          subtitle: '',
          image_url: '',
          button_text: '',
          button_link: '',
          sort_order: 0,
          is_active: true,
        });
        fetchCMSData();
      }
    });
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    startTransition(async () => {
      const result = await deleteHeroSlide(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Slide deleted');
        fetchCMSData();
      }
    });
  };

  const toggleSlideStatus = async (slide: any) => {
    const formData = new FormData();
    formData.append('title', slide.title);
    formData.append('subtitle', slide.subtitle || '');
    formData.append('image_url', slide.image_url);
    formData.append('button_text', slide.button_text || '');
    formData.append('button_link', slide.button_link || '');
    formData.append('sort_order', slide.sort_order.toString());
    formData.append('is_active', slide.is_active ? 'off' : 'on'); // Toggle

    startTransition(async () => {
      const result = await updateHeroSlide(slide.id, formData);
      if (result.error) toast.error(result.error);
      else fetchCMSData();
    });
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">Loading CMS Data...</div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Homepage Structure</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage the promotional hero sections shown on the storefront homepage.
        </p>
      </div>

      {/* Hero Carousel Management */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              Homepage Hero Carousel
            </h2>
          </div>
          <button
            onClick={() => {
              setEditingSlide(null);
              setSlideForm({
                title: '',
                subtitle: '',
                image_url: '',
                button_text: '',
                button_link: '',
                sort_order: slides.length + 1,
                is_active: true,
              });
              setIsAddingSlide(true);
            }}
            className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            <Plus className="h-3 w-3" /> Add Slide
          </button>
        </div>

        {/* Form Modal for Slides */}
        {isAddingSlide && (
          <div className="border-b border-white/10 bg-black/40 p-6">
            <form onSubmit={handleSaveSlide} className="space-y-4">
              <h3 className="text-md font-bold text-white">
                {editingSlide ? 'Edit Slide' : 'New Slide'}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Headline *
                  </label>
                  <input
                    required
                    type="text"
                    value={slideForm.title}
                    onChange={(e) =>
                      setSlideForm({ ...slideForm, title: e.target.value })
                    }
                    className="w-full rounded bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={slideForm.subtitle}
                    onChange={(e) =>
                      setSlideForm({ ...slideForm, subtitle: e.target.value })
                    }
                    className="w-full rounded bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-400">
                    Image URL * (High Res)
                  </label>
                  <input
                    required
                    type="url"
                    value={slideForm.image_url}
                    onChange={(e) =>
                      setSlideForm({ ...slideForm, image_url: e.target.value })
                    }
                    className="w-full rounded bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={slideForm.button_text}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        button_text: e.target.value,
                      })
                    }
                    className="w-full rounded bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={slideForm.button_link}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        button_link: e.target.value,
                      })
                    }
                    className="w-full rounded bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    required
                    value={slideForm.sort_order}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        sort_order: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSlide(false)}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Slide'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Slides List */}
        <div className="p-0">
          {slides.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hero slides configured.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {slides.map((slide) => (
                <li
                  key={slide.id}
                  className={`flex items-center gap-4 p-4 transition-colors hover:bg-white/5 ${!slide.is_active && 'opacity-50'}`}
                >
                  <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                    <Image
                      src={slide.image_url}
                      alt={slide.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">
                      {slide.title}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {slide.subtitle}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-500">
                      <span>Order: {slide.sort_order}</span>
                      {slide.button_link && (
                        <span>Link: {slide.button_link}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSlideStatus(slide)}
                      className={`rounded p-2 transition-colors ${slide.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/10'}`}
                      title={
                        slide.is_active ? 'Click to Disable' : 'Click to Enable'
                      }
                    >
                      {slide.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingSlide(slide);
                        setSlideForm(slide);
                        setIsAddingSlide(true);
                      }}
                      className="rounded p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="rounded p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
