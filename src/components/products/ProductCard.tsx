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
    <div className="group flex h-full flex-col gap-4">
      {/* Image container */}
      <div className="card-lift relative aspect-[3/4] w-full overflow-hidden rounded-[4px] bg-[var(--cream-deep)]">
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
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5">
            {product.is_new_arrival && (
              <span className="rounded bg-[var(--gold)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink)] shadow-sm">
                New
              </span>
            )}
            {product.is_best_seller && (
              <span className="rounded bg-[var(--ink)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-sm">
                Best Seller
              </span>
            )}
          </div>
        )}

        {/* Out of Stock overlay */}
        {product.status === 'out_of_stock' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
            <span className="bg-[var(--ink)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Sold Out
            </span>
          </div>
        )}

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isLiked}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/30 p-2 text-slate-400 backdrop-blur-sm transition-colors hover:text-[var(--ink)]"
          title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`h-4 w-4 ${isLiked ? 'fill-[var(--ink)] text-[var(--ink)]' : ''}`}
            strokeWidth={1.5}
          />
        </button>

        {/* Add to Cart button */}
        {product.status !== 'out_of_stock' && (
          <button
            onClick={handleAddToCart}
            className="bg-[var(--cream-deep)]/90 absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink)] shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--gold)] hover:text-white"
            title="Add to Cart"
          >
            {isInCart ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Card Info */}
      <div className="flex flex-col items-center text-center">
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
          <h3 className="line-clamp-1 font-sans text-[15px] font-medium tracking-wide text-[var(--ink)] transition-colors hover:text-[var(--gold)]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-1 flex items-baseline space-x-2">
          <span className="text-[14.5px] text-[var(--ink-soft)]">
            ₹{(product.price ?? 0).toLocaleString('en-IN')}
          </span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-[var(--ink-soft)]/50 text-xs line-through">
              ₹{product.mrp.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
