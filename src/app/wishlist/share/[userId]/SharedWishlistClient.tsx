'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Sparkles, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Product } from '@/types/database';

export default function SharedWishlistPage({ userId }: { userId: string }) {
  const [sharedProducts, setSharedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!userId || userId === 'demo-user-ruhvi') {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('wishlist')
          .select(
            'product:products(*, images:product_images(*), category:categories(*))'
          )
          .eq('user_id', userId);

        if (!error && isMounted) {
          setSharedProducts(
            (data ?? [])
              .map((row: any) => row.product)
              .filter(Boolean) as Product[]
          );
        }
      } catch (err) {
        console.error('Failed to load shared wishlist', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Shared Header Banner */}
      <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-r from-charcoal-950 to-charcoal-900 p-8 text-center text-gold-100 shadow-xl sm:p-10">
        <div className="relative z-10 mx-auto max-w-xl space-y-3">
          <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-200">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Shared Jewellery Vault</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Curated Wishlist
          </h1>
          <p className="text-xs font-light leading-relaxed text-charcoal-300 sm:text-sm">
            Viewing a shared collection of handcrafted fine jewellery from
            Ruhvi.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-charcoal-500">
          Loading shared wishlist...
        </p>
      ) : sharedProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sharedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="No Items Shared"
          description="This wishlist is empty or is no longer available. Explore our collections to discover your next favourite piece."
          actionLabel="Explore All Collections"
          actionHref="/products"
        />
      )}

      <div className="mt-12 text-center">
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 rounded-full bg-charcoal-900 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-gold-100 shadow-lg transition-all hover:scale-105 hover:bg-charcoal-800"
        >
          <span>Explore All Collections</span>
          <ShoppingBag className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
