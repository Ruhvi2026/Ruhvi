'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { Product } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { trackEvent } from '@/lib/analytics';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, items: cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isLiked = isInWishlist(product.id);
  const isInCart = cartItems.some((item) => item.product_id === product.id);

  const mainImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.status !== 'out_of_stock') {
      addToCart(product, 1);
      trackEvent('AddToCart', {
        content_name: product.name,
        content_ids: [product.sku],
        content_type: 'product',
        value: product.price,
        currency: 'INR',
      });
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <Link href={`/products/${product.slug}`}>
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Out of Stock overlay */}
        {product.status === 'out_of_stock' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-stone-900 text-stone-100 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded">
              Out of Stock
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.is_new_arrival && (
            <span className="bg-amber-900 text-amber-100 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
              New
            </span>
          )}
          {product.is_best_seller && (
            <span className="bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
              Best Seller
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md rounded-full text-stone-700 hover:text-rose-600 shadow-md transition-all transform hover:scale-110 z-10"
          title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Quick Add to Cart hover button */}
        {product.status !== 'out_of_stock' && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 p-2.5 bg-amber-950 text-amber-100 hover:bg-amber-900 rounded-full shadow-lg transition-all duration-300 z-10 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 flex items-center space-x-1.5 px-3"
            title="Add to Cart"
          >
            {isInCart ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold tracking-wider">Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold tracking-wider">Add</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Card Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center text-[10px] font-mono text-stone-400 mb-1">
            <span>{product.sku}</span>
            <span className="uppercase text-amber-800 font-sans font-semibold">
              {product.category?.name}
            </span>
          </div>
          <Link href={`/products/${product.slug}`}>
            <h3 className="text-sm font-semibold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold text-amber-950">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.mrp > product.price && (
              <span className="text-xs text-stone-400 line-through">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {product.status !== 'out_of_stock' && product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity < 10 && (
            <span className="text-[10px] font-bold text-rose-600">
              Only {product.stock_quantity} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
