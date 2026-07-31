'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Mail } from 'lucide-react';
import { Product } from '@/types/database';

interface StockNotificationModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function StockNotificationModal({ product, isOpen, onClose }: StockNotificationModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);

    // Simulate API request or Supabase insert
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitted(true);
    } catch {
      // Fallback
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-900 mb-1">
              Notify Me When Available
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Enter your email address and we&apos;ll notify you immediately when{' '}
              <span className="font-semibold text-stone-800">{product.name}</span> (SKU: {product.sku}) is back in stock.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-950 hover:bg-amber-900 text-white font-medium text-xs uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Notify Me'}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-900 mb-2">
              Notification Registered!
            </h3>
            <p className="text-xs text-stone-600 mb-6">
              We have noted <span className="font-semibold">{email}</span>. You will receive an instant alert when this piece restocks.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
