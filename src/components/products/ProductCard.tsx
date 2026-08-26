'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { Product } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { trackEvent } from '@/lib/analytics';
import { ecommerceEvent } from '@/lib/gtag';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, items: cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isLiked = isInWishlist(product.id);
  const isInCart = cartItems.some((item) => item.product_id === product.id);

  const mainImage =
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';

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
    <div className="group flex h-full flex-col bg-white">
      {/* Image container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-champagne-50">
        <Link
          href={`/products/${product.slug || product.id}`}
          onClick={() => {
            ecommerceEvent('select_item', {
              items: [
                {
                  item_id: product.id,
                  item_name: product.name,
                  price: product.price,
                  item_category: product.category?.name || undefined,
                },
              ],
            });
          }}
          className="block h-full w-full"
        >
          <ImageWithFallback
            src={mainImage}
            alt={`${product.name} - ${product.category?.name || 'Fine Jewellery'} | Ruhvi`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>

        {/* New Arrival / Best Seller badges */}
        {(product.is_new_arrival || product.is_best_seller) && (
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
            {product.is_new_arrival && (
              <span className="bg-gold-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-sm">
                New Arrival
              </span>
            )}
            {product.is_best_seller && (
              <span className="bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-sm">
                Best Seller
              </span>
            )}
          </div>
        )}

        {/* Out of Stock overlay */}
        {product.status === 'out_of_stock' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
            <span className="bg-charcoal-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Sold Out
            </span>
          </div>
        )}

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute right-2 top-2 z-10 rounded-full p-2.5 text-slate-400 transition-colors hover:text-charcoal-900"
          title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`h-5 w-5 ${isLiked ? 'fill-charcoal-900 text-charcoal-900' : ''}`}
            strokeWidth={1.5}
          />
        </button>

        {/* Quick Add to Cart button */}
        {product.status !== 'out_of_stock' && (
          <div className="absolute inset-x-0 bottom-0 translate-y-0 p-4 opacity-100 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
            <button
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center space-x-2 bg-charcoal-900/95 py-3 text-white backdrop-blur-sm transition-colors hover:bg-charcoal-900"
              title="Add to Cart"
            >
              {isInCart ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                    Added
                  </span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                    Add to Cart
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="flex flex-col pt-4">
        <Link
          href={`/products/${product.slug || product.id}`}
          onClick={() => {
            ecommerceEvent('select_item', {
              items: [
                {
                  item_id: product.id,
                  item_name: product.name,
                  price: product.price || 0,
                  item_category: product.category?.name || undefined,
                },
              ],
            });
          }}
        >
          <h3 className="line-clamp-1 text-sm font-medium tracking-wide text-charcoal-900 transition-colors group-hover:text-gold-600">
            {product.name}
          </h3>
        </Link>

        <div className="mt-1.5 flex items-baseline space-x-2">
          <span className="text-sm font-semibold text-charcoal-900">
            ₹{(product.price ?? 0).toLocaleString('en-IN')}
          </span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-slate-400 line-through">
              ₹{product.mrp.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
