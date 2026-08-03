'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Trash2, Share2, Check, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [copied, setCopied] = useState(false);

  const handleShareWishlist = () => {
    const shareUrl = `${window.location.origin}/wishlist/share/demo-user-ruhvi`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMoveToCart = (product: any) => {
    addToCart(product, 1);
    removeFromWishlist(product.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-6 mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 flex items-center space-x-3">
            <Heart className="w-8 h-8 text-rose-600 fill-rose-600" />
            <span>My Wishlist</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            {items.length} {items.length === 1 ? 'saved piece' : 'saved pieces'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleShareWishlist}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Wishlist Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-amber-800" />
                <span>Share My Wishlist</span>
              </>
            )}
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleMoveToCart(product)}
                  className="flex-1 py-2 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Move to Cart</span>
                </button>

                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="px-3 py-2 bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-lg transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty Wishlist State */
        <EmptyState
          icon={<Heart className="w-8 h-8" />}
          title="Your Wishlist is Empty"
          description="Save your favourite solitaire rings, emerald chokers, and pearl drops to curate your dream jewellery vault."
          actionLabel="Explore Fine Jewellery"
          actionHref="/products"
        />
      )}
    </div>
  );
}
