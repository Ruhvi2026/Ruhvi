import React from 'react';
import type { Metadata } from 'next';
import {
  ShieldCheck,
  Sparkles,
  Droplets,
  Sun,
  Box,
  HeartHandshake,
} from 'lucide-react';
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
      name: '22K Gold Plated',
      tips: [
        'The plated finish is delicate; handle intricate filigree with care.',
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
    <div className="min-h-screen bg-stone-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-950 to-stone-900 p-8 text-center text-white shadow-2xl sm:p-12">
          <div className="relative z-10 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Preserving Timeless Beauty
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl">
              Jewelry Care & Maintenance Guide
            </h1>
            <p className="mx-auto max-w-xl text-sm font-light leading-relaxed text-stone-300">
              Every piece of Ruhvi jewellery is handcrafted with certified
              metals and gemstones designed to last generations. Follow these
              simple tips to maintain their pristine sparkle.
            </p>
          </div>
        </div>

        {/* 4 Golden Rules */}
        <div className="space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              The 4 Golden Rules of Fine Jewelry Care
            </h2>
            <p className="text-xs text-stone-500">
              Simple habits to keep your treasures looking new
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {careTips.map((tip) => (
              <div
                key={tip.title}
                className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                  <tip.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-stone-900">
                  {tip.title}
                </h3>
                <p className="text-xs font-light leading-relaxed text-stone-600">
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Specific Material Care */}
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="border-b border-stone-100 pb-4 font-serif text-xl font-bold text-stone-900">
            Care Instructions by Material
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {materialCare.map((mat) => (
              <div key={mat.name} className="space-y-3">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-amber-950">
                  {mat.name}
                </h3>
                <ul className="space-y-2">
                  {mat.tips.map((t, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-stone-600"
                    >
                      <span className="font-bold text-amber-600">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Lifetime Support Banner */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-900/20 bg-amber-900/10 p-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-950 text-white">
              <ShieldCheck className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Ruhvi Lifetime Polish & Maintenance
              </h3>
              <p className="text-xs text-stone-600">
                All Ruhvi fine jewellery comes with complimentary annual
                professional cleaning and inspection.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 rounded-xl bg-amber-950 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-amber-900"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
