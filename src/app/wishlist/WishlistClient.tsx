'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Share2,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleShareWishlist = () => {
    if (!user?.id) {
      toast.error('Please sign in to share your wishlist');
      return;
    }
    const shareUrl = `${window.location.origin}/wishlist/share/${user.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMoveToCart = (product: any) => {
    addToCart(product, 1);
    removeFromWishlist(product.id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-charcoal-900 sm:text-4xl">
            <Heart className="h-8 w-8 fill-gold-600 text-gold-600" />
            <span>My Wishlist</span>
          </h1>
          <p className="mt-1 text-xs text-charcoal-500 sm:text-sm">
            {items.length} {items.length === 1 ? 'saved piece' : 'saved pieces'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleShareWishlist}
            className="inline-flex items-center space-x-2 rounded-xl border border-gold-200 bg-cream-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-700 transition-all hover:bg-cream-100"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Wishlist Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-gold-700" />
                <span>Share My Wishlist</span>
              </>
            )}
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <div key={product.id} className="group relative">
              <ProductCard product={product} />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleMoveToCart(product)}
                  className="flex flex-1 items-center justify-center space-x-1.5 rounded-lg bg-charcoal-900 py-2 text-xs font-bold uppercase tracking-wider text-gold-100 transition-colors hover:bg-charcoal-800"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Move to Cart</span>
                </button>

                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="rounded-lg bg-taupe-100 px-3 py-2 text-charcoal-500 transition-colors hover:bg-cream-100 hover:text-charcoal-700"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty Wishlist State */
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="Your Wishlist is Empty"
          description="Save your favourite solitaire rings, emerald chokers, and pearl drops to curate your dream jewellery vault."
          actionLabel="Explore Fine Jewellery"
          actionHref="/products"
        />
      )}
    </div>
  );
}
