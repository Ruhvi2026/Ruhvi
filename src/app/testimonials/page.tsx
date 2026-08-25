import React from 'react';
import type { Metadata } from 'next';
import { Star, ShieldCheck, PlayCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Customer Testimonials | Ruhvi Fine Jewellery',
  description:
    'Real stories and reviews from our beautiful community across India.',
};

interface Testimonial {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  video_url: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export default async function TestimonialsPage() {
  const supabase = await createClient();

  const { data: testimonials, error } = await supabase
    .from('testimonials')
    .select(
      'id, customer_name, rating, review_text, video_url, is_verified_purchase, created_at'
    )
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#FAF6ED]">
      {/* Header */}
      <div className="bg-stone-900 px-4 py-16 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold text-white sm:text-5xl">
          The Ruhvi Family
        </h1>
        <p className="mx-auto max-w-2xl text-stone-300">
          Real stories and reviews from our beautiful community across India.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-800">
              Unable to load testimonials.
            </p>
            <p className="mt-1 text-sm text-red-600">Please try again later.</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && (!testimonials || testimonials.length === 0) && (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center">
            <p className="text-lg text-stone-500">No testimonials yet.</p>
            <p className="mt-2 text-sm text-stone-400">
              Check back soon for reviews from our community.
            </p>
          </div>
        </div>
      )}

      {/* Masonry Grid */}
      {testimonials && testimonials.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="columns-1 gap-8 space-y-8 md:columns-2 lg:columns-3">
            {testimonials.map((testimonial: Testimonial) => (
              <div
                key={testimonial.id}
                className="break-inside-avoid rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                {/* Video Attachment */}
                {testimonial.video_url && (
                  <div className="group relative mb-6 aspect-[4/5] overflow-hidden rounded-2xl bg-stone-900">
                    <video
                      src={testimonial.video_url}
                      className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-white/80 transition-transform group-hover:scale-110" />
                    </div>
                  </div>
                )}

                {/* Rating */}
                <div className="mb-4 flex space-x-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < testimonial.rating ? 'fill-current' : 'text-stone-300'}`}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="mb-6 italic leading-relaxed text-stone-700">
                  "{testimonial.review_text}"
                </p>

                {/* Customer Info */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                  <div>
                    <p className="font-bold text-stone-900">
                      {testimonial.customer_name}
                    </p>
                  </div>

                  {testimonial.is_verified_purchase && (
                    <div className="flex items-center space-x-1 rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Verified
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
