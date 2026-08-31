'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '@/types/database';
import toast from 'react-hot-toast';
import { ecommerceEvent } from '@/lib/gtag';
import posthog from 'posthog-js';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ruhvi_cart_v1';

/**
 * Slim persisted shape (Fix 11): only product_id/quantity/price_at_add are
 * stored in localStorage. Full product details (image, name, current price)
 * are hydrated in memory from /api/products/batch on load and kept out of
 * localStorage entirely.
 */
interface StoredCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price_at_add: number;
}

function normalizeLoadedItems(saved: unknown): StoredCartItem[] {
  if (!Array.isArray(saved)) return [];
  const out: StoredCartItem[] = [];
  for (const raw of saved) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, any>;
    // Old shape had the full Product embedded — migrate by extracting the
    // fields we need, so existing carts survive without crashing.
    const product =
      item.product && typeof item.product === 'object'
        ? (item.product as Record<string, any>)
        : null;
    const productId =
      (typeof item.product_id === 'string' && item.product_id) ||
      (product && (typeof product.id === 'string' ? product.id : null)) ||
      '';
    if (!productId) continue;
    const quantity =
      typeof item.quantity === 'number'
        ? Math.max(1, item.quantity)
        : typeof product?.quantity === 'number'
          ? Math.max(1, product.quantity)
          : 1;
    const priceAtAdd =
      typeof item.price_at_add === 'number'
        ? item.price_at_add
        : typeof product?.price === 'number'
          ? product.price
          : 0;
    out.push({
      id: typeof item.id === 'string' ? item.id : `cart-item-${productId}`,
      cart_id: 'local_cart',
      product_id: productId,
      quantity,
      price_at_add: priceAtAdd,
    });
  }
  return out;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount (with old-shape migration) and
  // hydrate full product details in memory.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const normalized = normalizeLoadedItems(JSON.parse(saved));
        setItems(normalized);
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
      // Malformed cart — clear it gracefully rather than crashing.
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist only the slim shape (no embedded Product objects).
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const slim: StoredCartItem[] = items.map((item) => ({
        id: item.id,
        cart_id: item.cart_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_add: item.price_at_add,
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(slim));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [items, isLoaded]);

  // Hydrate full product details for cart line items from the batch API,
  // attaching them in memory only (never persisted).
  useEffect(() => {
    if (!isLoaded || items.length === 0) return;
    const ids = [...new Set(items.map((i) => i.product_id))].filter(
      (id) => !items.find((i) => i.product_id === id)?.product
    );
    if (ids.length === 0) return;

    const controller = new AbortController();
    fetch(`/api/products/batch?ids=${ids.join(',')}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then(({ products }: { products: any[] }) => {
        const byId = new Map(products.map((p) => [p.id, p]));
        setItems((prev) =>
          prev.map((item) => {
            if (item.product) return item;
            const hydrated = byId.get(item.product_id);
            return hydrated ? { ...item, product: hydrated } : item;
          })
        );
      })
      .catch((err) => {
        if ((err as any)?.name !== 'AbortError') {
          console.error('Failed to hydrate cart products', err);
        }
      });
    return () => controller.abort();
  }, [items, isLoaded]);

  const addToCart = (product: Product, quantity = 1) => {
    try {
      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.product_id === product.id
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
            // Keep the fresh product data in memory only (Fix 11).
            product: product,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            cart_id: 'local_cart',
            product_id: product.id,
            quantity,
            price_at_add: product.price,
            product: product,
          },
        ];
      });

      // GA4 add_to_cart event
      ecommerceEvent('add_to_cart', {
        currency: 'INR',
        value: product.price * quantity,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            quantity: quantity,
          },
        ],
      });

      // PostHog product_added_to_cart event
      posthog.capture('product_added_to_cart', {
        product_id: product.id,
        name: product.name,
        price: product.price || 0,
        quantity,
      });

      toast.success(`${product.name} added to bag`);
    } catch (error) {
      toast.error('Failed to add item to bag');
    }
  };

  const removeFromCart = (productId: string) => {
    try {
      // Find item first to send correct GA4 data
      const itemToRemove = items.find((item) => item.product_id === productId);

      setItems((prev) => prev.filter((item) => item.product_id !== productId));

      if (itemToRemove && (itemToRemove.product || itemToRemove.price_at_add)) {
        // GA4 remove_from_cart event
        ecommerceEvent('remove_from_cart', {
          currency: 'INR',
          value:
            (itemToRemove.product?.price ?? itemToRemove.price_at_add) *
            itemToRemove.quantity,
          items: [
            {
              item_id: itemToRemove.product_id,
              item_name: itemToRemove.product?.name ?? itemToRemove.product_id,
              price: itemToRemove.product?.price ?? itemToRemove.price_at_add,
              quantity: itemToRemove.quantity,
            },
          ],
        });
      }

      toast.success('Item removed from bag');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    try {
      setItems([]);
      toast.success('Bag cleared');
    } catch (error) {
      toast.error('Failed to clear bag');
    }
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce(
    (sum, item) =>
      sum + (item.product?.price || item.price_at_add) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
