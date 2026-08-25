'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { Product } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface StockNotificationModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function StockNotificationModal({
  product,
  isOpen,
  onClose,
}: StockNotificationModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('stock_notifications')
      .insert({ product_id: product.id, email: email.trim().toLowerCase() });

    setLoading(false);

    if (insertError) {
      setError('Something went wrong. Please try again.');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-stone-400 hover:text-stone-700"
        >
          <X className="h-5 w-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-900">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="mb-1 font-serif text-lg font-bold text-stone-900">
              Notify Me When Available
            </h3>
            <p className="mb-4 text-xs text-stone-500">
              Enter your email address and we&apos;ll notify you immediately
              when{' '}
              <span className="font-semibold text-stone-800">
                {product.name}
              </span>{' '}
              (SKU: {product.sku}) is back in stock.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {error && (
                <p className="-mt-2 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amber-950 py-3 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-amber-900 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Notify Me'}
              </button>
            </form>
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mb-2 font-serif text-lg font-bold text-stone-900">
              Notification Registered!
            </h3>
            <p className="mb-6 text-xs text-stone-600">
              We have noted <span className="font-semibold">{email}</span>. You
              will receive an instant alert when this piece restocks.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-stone-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-800 transition-colors hover:bg-stone-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
