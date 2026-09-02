'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types/database';
import toast from 'react-hot-toast';
import posthog from 'posthog-js/dist/module.slim';

interface WishlistContextType {
  items: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = 'ruhvi_wishlist_v1';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load wishlist from storage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save wishlist to storage', e);
    }
  }, [items, isLoaded]);

  const toggleWishlist = (product: Product) => {
    try {
      const exists = items.some((item) => item.id === product.id);
      if (exists) {
        setItems((prev) => prev.filter((item) => item.id !== product.id));
        toast.success('Removed from wishlist');
      } else {
        setItems((prev) => [...prev, product]);
        toast.success('Added to wishlist');
        posthog.capture('product_added_to_wishlist', {
          product_id: product.id,
          name: product.name,
        });
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const isInWishlist = (productId: string) => {
    return items.some((item) => item.id === productId);
  };

  const removeFromWishlist = (productId: string) => {
    try {
      setItems((prev) => prev.filter((item) => item.id !== productId));
      toast.success('Removed from wishlist');
    } catch (error) {
      toast.error('Failed to remove from wishlist');
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist,
        wishlistCount: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
