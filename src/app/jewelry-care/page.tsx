import React from 'react';
import type { Metadata } from 'next';
import { ShieldCheck, Sparkles, Droplets, Sun, Box, HeartHandshake } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Jewelry Care Guide — How to Clean & Protect Your Gold & Diamonds',
  description:
    'Essential care instructions for 22K Gold, Solitaire Diamonds, Pearls, and Gemstone Fine Jewellery from Ruhvi. Keep your pieces sparkling for a lifetime.',
  openGraph: {
    title: 'Jewelry Care Guide | Ruhvi Fine Jewellery',
    description:
      'Learn how to clean, store, and preserve handcrafted gold and diamond fine jewellery.',
    url: 'https://ruhvi.in/jewelry-care',
  },
};

export default function JewelryCarePage() {
  const careTips = [
    {
      icon: Droplets,
      title: 'Avoid Water & Harsh Chemicals',
      description:
        'Always remove your fine jewelry before swimming, bathing, or applying perfumes, lotions, and hairsprays to prevent tarnishing and chemical erosion.',
    },
    {
      icon: Box,
      title: 'Store Each Piece Separately',
      description:
        'Store your jewelry in individual plush pouches or velvet-lined boxes. Diamonds can scratch other gemstones and metals if kept together.',
    },
    {
      icon: Sun,
      title: 'Protect From Extreme Sunlight',
      description:
        'Prolonged exposure to direct heat and UV light can cause natural gemstones like emeralds and amethysts to fade over time.',
    },
    {
      icon: Sparkles,
      title: 'Gentle Cleaning Routine',
      description:
        'Clean 22K gold and diamonds with warm water, mild soap, and a soft-bristled toothbrush. Gently wipe dry with a microfiber cloth.',
    },
  ];

  const materialCare = [
    {
      name: '22K & 22K Solid Gold',
      tips: [
        'Pure gold is soft; handle intricate filigree with care.',
        'Polish with a specialized gold polishing cloth to restore natural lustre.',
        'Avoid abrasive household cleaners.',
      ],
    },
    {
      name: 'Natural & Solitaire Diamonds',
      tips: [
        'Soak in warm soapy water for 10-15 minutes once a month.',
        'Clean behind diamond settings where oil and dust accumulate.',
        'Have prongs checked annually by a certified jeweler.',
      ],
    },
    {
      name: 'Pearls & Soft Gemstones',
      tips: [
        'Last item to put on in the morning, first item to take off at night.',
        'Wipe pearls with a damp soft cloth after wearing to remove skin oils.',
        'Never soak pearls in liquid or use ultrasonic cleaners.',
      ],
    },
  ];

  return (
    <div className="bg-stone-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-950 to-stone-900 text-white rounded-3xl p-8 sm:p-12 text-center border border-amber-500/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <span className="text-amber-400 font-semibold uppercase tracking-widest text-xs">
              Preserving Timeless Beauty
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
              Jewelry Care & Maintenance Guide
            </h1>
            <p className="text-stone-300 text-sm max-w-xl mx-auto font-light leading-relaxed">
              Every piece of Ruhvi jewellery is handcrafted with certified metals and gemstones designed to last generations. Follow these simple tips to maintain their pristine sparkle.
            </p>
          </div>
        </div>

        {/* 4 Golden Rules */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              The 4 Golden Rules of Fine Jewelry Care
            </h2>
            <p className="text-stone-500 text-xs">Simple habits to keep your treasures looking new</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {careTips.map((tip) => (
              <div
                key={tip.title}
                className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-900 border border-amber-200">
                  <tip.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-stone-900">{tip.title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed font-light">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Specific Material Care */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-4">
            Care Instructions by Material
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materialCare.map((mat) => (
              <div key={mat.name} className="space-y-3">
                <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide font-mono">
                  {mat.name}
                </h3>
                <ul className="space-y-2">
                  {mat.tips.map((t, idx) => (
                    <li key={idx} className="text-xs text-stone-600 flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Lifetime Support Banner */}
        <div className="bg-amber-900/10 border border-amber-900/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-950 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Ruhvi Lifetime Polish & Maintenance</h3>
              <p className="text-xs text-stone-600">
                All Ruhvi fine jewellery comes with complimentary annual professional cleaning and inspection.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="px-5 py-2.5 bg-amber-950 text-white text-xs font-semibold rounded-xl hover:bg-amber-900 transition-colors flex-shrink-0"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
