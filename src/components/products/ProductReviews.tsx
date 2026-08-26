'use client';

import React, { useEffect, useState } from 'react';
import { Star, ShieldCheck, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  is_verified_purchase: boolean;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

function Stars({
  rating,
  size = 'h-4 w-4',
}: {
  rating: number;
  size?: string;
}) {
  return (
    <div
      className="flex space-x-0.5 text-amber-500"
      aria-label={`${rating} out of 5 stars`}
    >
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${size} ${i < rating ? 'fill-current' : 'text-amber-200'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function ProductReviews({
  productId,
  productName,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('testimonials')
          .select(
            'id, customer_name, rating, review_text, is_verified_purchase, created_at'
          )
          .eq('status', 'approved')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (!cancelled && !error && data) {
          setReviews(data as Review[]);
        }
      } catch {
        // testimonials table or product_id column may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const total = reviews.length;
  const average =
    total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const verifiedCount = reviews.filter((r) => r.is_verified_purchase).length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section aria-labelledby="reviews-heading">
      <h2
        id="reviews-heading"
        className="mb-6 font-serif text-2xl font-bold text-charcoal-900"
      >
        Customer Reviews
      </h2>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gold-200/50 bg-white p-6"
            >
              <div className="h-4 w-28 rounded bg-gold-100" />
              <div className="mt-3 h-3 w-full rounded bg-cream-100" />
              <div className="mt-2 h-3 w-2/3 rounded bg-cream-100" />
              <div className="mt-4 h-3 w-24 rounded bg-gold-100" />
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-gold-200/50 bg-white p-10 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-gold-400" />
          <h3 className="mt-4 font-serif text-lg font-bold text-charcoal-900">
            No reviews yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Be the first to share your experience with {productName} and help
            the Ruhvi family discover this piece.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-6 rounded-2xl border border-gold-200/50 bg-white p-6 sm:grid-cols-2 sm:p-8">
            <div className="flex flex-col items-center justify-center border-b border-gold-200/40 pb-6 text-center sm:border-b-0 sm:border-r sm:pb-0">
              <div className="font-serif text-5xl font-bold text-charcoal-900">
                {average.toFixed(1)}
              </div>
              <Stars rating={Math.round(average)} size="h-5 w-5" />
              <p className="mt-2 text-xs text-slate-500">
                Based on {total} {total === 1 ? 'review' : 'reviews'}
              </p>
              {verifiedCount > 0 && (
                <p className="mt-1 flex items-center space-x-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {verifiedCount}{' '}
                    {verifiedCount === 1
                      ? 'verified purchase'
                      : 'verified purchases'}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col justify-center space-y-2">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="w-4 text-right text-xs text-slate-500">
                    {d.star}
                  </span>
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(d.count / total) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-xs text-slate-500">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review list */}
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-2xl border border-gold-200/50 bg-white p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars rating={review.rating} />
                  {review.is_verified_purchase && (
                    <span className="flex items-center space-x-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verified Purchase</span>
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-light leading-relaxed text-slate-600">
                  "{review.review_text}"
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-gold-200/40 pt-3">
                  <span className="text-xs font-semibold text-charcoal-900">
                    {review.customer_name || 'Ruhvi Customer'}
                  </span>
                  <time className="text-xs text-slate-400">
                    {formatDate(review.created_at)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
