'use client';

import React from 'react';
import { Star, ShieldCheck, PlayCircle } from 'lucide-react';
import Image from 'next/image';

const MOCK_TESTIMONIALS = [
  {
    id: 't1',
    customer_name: 'Priya Desai',
    rating: 5,
    review_text: "Absolutely stunning craftsmanship! The ring looks even better in person than it did on the website. The packaging felt so premium, and the delivery was incredibly fast.",
    is_verified_purchase: true,
    video_url: null,
    image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 't2',
    customer_name: 'Ananya Sharma',
    rating: 5,
    review_text: "I was hesitant to buy gold jewellery online, but Ruhvi's hallmarking and insurance gave me peace of mind. Will definitely be purchasing my anniversary gifts from here.",
    is_verified_purchase: true,
    video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', // Mock UGC video
    image_url: null,
  },
  {
    id: 't3',
    customer_name: 'Neha Kapoor',
    rating: 4,
    review_text: "Beautiful design and great customer service. The only reason for 4 stars is that the delivery took an extra day due to weather, but the team kept me updated throughout.",
    is_verified_purchase: true,
    video_url: null,
    image_url: null,
  },
  {
    id: 't4',
    customer_name: 'Sanya Malhotra',
    rating: 5,
    review_text: "The celestial pearl earrings are my new favorite! So lightweight and elegant. The authenticity certificate included in the box is a great touch.",
    is_verified_purchase: true,
    video_url: null,
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 't5',
    customer_name: 'Rohan Mehta',
    rating: 5,
    review_text: "Bought a pendant for my wife's birthday. The curated gift guide made it so easy to choose. She loved it!",
    is_verified_purchase: true,
    video_url: null,
    image_url: null,
  }
];

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-[#FAF6ED]">
      {/* Header */}
      <div className="bg-stone-900 py-16 text-center px-4">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-4">
          The Ruhvi Family
        </h1>
        <p className="text-stone-300 max-w-2xl mx-auto">
          Real stories and reviews from our beautiful community across India.
        </p>
      </div>

      {/* Masonry Grid Simulation (using Columns) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {MOCK_TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.id} className="break-inside-avoid bg-white rounded-3xl p-6 shadow-sm border border-stone-200 hover:shadow-xl transition-shadow duration-300">
              
              {/* Media Attachment (Video or Image) */}
              {testimonial.video_url ? (
                <div className="relative aspect-[4/5] bg-stone-900 rounded-2xl mb-6 overflow-hidden group">
                  <video 
                    src={testimonial.video_url} 
                    className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                    muted 
                    loop 
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white/80 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              ) : testimonial.image_url ? (
                <div className="relative aspect-square bg-stone-100 rounded-2xl mb-6 overflow-hidden">
                  <Image 
                    src={testimonial.image_url} 
                    alt="Customer photo"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : null}

              {/* Rating */}
              <div className="flex space-x-1 mb-4 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'fill-current' : 'text-stone-300'}`} />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-stone-700 italic leading-relaxed mb-6">
                "{testimonial.review_text}"
              </p>

              {/* Customer Info */}
              <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-stone-900">{testimonial.customer_name}</p>
                </div>
                
                {testimonial.is_verified_purchase && (
                  <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
