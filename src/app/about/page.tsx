import React from 'react';
import { Award, Sparkles, HeartHandshake } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs uppercase tracking-widest text-amber-800 font-semibold">Our Story</span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900">Crafting Timeless Heritage</h1>
        <p className="text-stone-600 text-sm font-light leading-relaxed">
          Ruhvi was born out of a passion for reimagining classic Indian goldsmithing for the modern connoisseur. Every piece embodies purity, certified quality, and soul.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <Award className="w-8 h-8 text-amber-700 mx-auto" />
          <h3 className="font-serif font-bold text-stone-900 text-base">22K Premium Gold Plated</h3>
          <p className="text-xs text-stone-500">
            Crafted with thick 22K gold layer plating, backed by a 6-month color guarantee, anti-tarnish protection, and hypoallergenic water resistance.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <Sparkles className="w-8 h-8 text-amber-700 mx-auto" />
          <h3 className="font-serif font-bold text-stone-900 text-base">Master Craftsmanship</h3>
          <p className="text-xs text-stone-500">
            Hand-finished by expert artisans with perfection in Kundan, CZ stones, and anti-tarnish polishing.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <HeartHandshake className="w-8 h-8 text-amber-700 mx-auto" />
          <h3 className="font-serif font-bold text-stone-900 text-base">Transparent Pricing</h3>
          <p className="text-xs text-stone-500">
            Affordable everyday luxury with complete price transparency and instant GST invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
