import React from 'react';
import type { Metadata } from 'next';
import { Award, Sparkles, HeartHandshake } from 'lucide-react';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'About Us — The Ruhvi Story | Ruhvi Fine Jewellery',
  description:
    'Discover the story behind Ruhvi — handcrafted 22K premium gold-plated jewellery, master craftsmanship, and transparent pricing for the modern connoisseur.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Ruhvi | Crafting Timeless Heritage',
    description:
      'Discover the story behind Ruhvi — handcrafted 22K premium gold-plated jewellery with certified quality.',
    url: '/about',
    siteName: 'Ruhvi Fine Jewellery',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Home', url: '/' },
          { label: 'About Us', url: '/about' },
        ]}
      />

      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-gold-700">
          Our Story
        </span>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900 sm:text-5xl">
          Crafting Timeless Heritage
        </h1>
        <p className="text-sm font-light leading-relaxed text-charcoal-600">
          Ruhvi was born out of a passion for reimagining classic Indian
          goldsmithing for the modern connoisseur. Every piece embodies purity,
          certified quality, and soul.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-taupe-200 bg-white p-6 shadow-sm">
          <Award className="mx-auto h-8 w-8 text-gold-600" />
          <h3 className="font-serif text-base font-bold text-charcoal-900">
            22K Premium Gold Plated
          </h3>
          <p className="text-xs text-charcoal-500">
            Crafted with thick 22K gold layer plating, backed by a 6-month color
            guarantee, anti-tarnish protection, and hypoallergenic water
            resistance.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-taupe-200 bg-white p-6 shadow-sm">
          <Sparkles className="mx-auto h-8 w-8 text-gold-600" />
          <h3 className="font-serif text-base font-bold text-charcoal-900">
            Master Craftsmanship
          </h3>
          <p className="text-xs text-charcoal-500">
            Hand-finished by expert artisans with perfection in Kundan, CZ
            stones, and anti-tarnish polishing.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-taupe-200 bg-white p-6 shadow-sm">
          <HeartHandshake className="mx-auto h-8 w-8 text-gold-600" />
          <h3 className="font-serif text-base font-bold text-charcoal-900">
            Transparent Pricing
          </h3>
          <p className="text-xs text-charcoal-500">
            Affordable everyday luxury with complete price transparency and
            instant GST invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
