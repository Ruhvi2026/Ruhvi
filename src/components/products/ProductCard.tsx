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
import { TiltCard } from '@/components/ui/TiltCard';

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
    <TiltCard maxTilt={6} scale={1.02} className="group h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-gold-200/80 bg-gradient-to-b from-cream-50 to-cream-100 shadow-sm transition-all duration-300 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/15">
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-gold-50/60">
          <Link
            href={`/products/${product.slug}`}
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
          >
            <ImageWithFallback
              src={mainImage}
              alt={`${product.name} - ${product.category?.name || 'Fine Jewellery'} | Ruhvi`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>

          {/* Out of Stock overlay */}
          {product.status === 'out_of_stock' && (
            <div className="absolute inset-0 flex items-center justify-center bg-cream-100/70 backdrop-blur-[2px]">
              <span className="rounded bg-charcoal-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-200">
                Out of Stock
              </span>
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
            {product.is_new_arrival && (
              <span className="rounded bg-gold-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                New
              </span>
            )}
            {product.is_best_seller && (
              <span className="rounded bg-charcoal-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-200 shadow">
                Best Seller
              </span>
            )}
          </div>

          {/* Wishlist Heart Button */}
          <button
            onClick={handleToggleWishlist}
            className="absolute right-2 top-2 z-10 transform rounded-full bg-white/90 p-3 text-slate-400 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:text-gold-600 sm:p-2"
            title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart
              className={`h-4 w-4 sm:h-4 sm:w-4 ${isLiked ? 'fill-gold-500 text-gold-500' : ''}`}
            />
          </button>

          {/* Quick Add to Cart hover button */}
          {product.status !== 'out_of_stock' && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-3 right-3 z-10 flex translate-y-0 transform items-center space-x-1.5 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 p-3 px-4 text-white opacity-100 shadow-lg shadow-gold-500/30 transition-all duration-300 hover:from-gold-500 hover:to-gold-800 sm:translate-y-2 sm:p-2.5 sm:px-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
              title="Add to Cart"
            >
              {isInCart ? (
                <>
                  <Check className="h-3.5 w-3.5 text-gold-100" />
                  <span className="text-[10px] font-semibold tracking-wider">
                    Added
                  </span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold tracking-wider">
                    Add
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Card Info */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span>{product.sku}</span>
              <span className="font-sans font-semibold uppercase text-gold-700">
                {product.category?.name}
              </span>
            </div>
            <Link
              href={`/products/${product.slug}`}
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
            >
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 transition-colors group-hover:text-gold-700">
                {product.name}
              </h3>
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-base font-bold text-charcoal-900">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.mrp > product.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {product.status !== 'out_of_stock' &&
              product.stock_quantity !== undefined &&
              product.stock_quantity > 0 &&
              product.stock_quantity < 10 && (
                <span className="text-[10px] font-bold text-gold-600">
                  Only {product.stock_quantity} left
                </span>
              )}
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
