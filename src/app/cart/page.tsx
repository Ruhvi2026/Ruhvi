'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  RefreshCw,
  Sparkles,
  ImageOff,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { ecommerceEvent } from '@/lib/gtag';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotal, clearCart } =
    useCart();

  const FREE_SHIPPING_THRESHOLD = 500;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - subtotal
  );
  const freeShippingProgress = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100
  );

  const estimatedShipping = isFreeShipping || items.length === 0 ? 0 : 49;
  const grandTotal = subtotal + estimatedShipping;
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedGst = Math.round(grandTotal - grandTotal / 1.03);

  const handleClearCart = () => {
    if (confirm('Are you sure you want to remove all items from your cart?')) {
      clearCart();
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      ecommerceEvent('view_cart', {
        currency: 'INR',
        value: subtotal,
        items: items.map((item) => ({
          item_id: item.product_id,
          item_name: item.product?.name,
          price: item.product?.price || item.price_at_add,
          quantity: item.quantity,
        })),
      });
    }
  }, [items]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-10 sm:px-6 sm:pb-10 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-stone-200 pb-6">
        <div>
          <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            <ShoppingBag className="h-8 w-8 text-amber-900" />
            <span>Shopping Cart</span>
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-xs font-medium text-stone-400 transition-colors hover:text-rose-600"
          >
            Clear Cart
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Cart Items List */}
          <div className="space-y-6 lg:col-span-2">
            {/* Free Shipping Progress Card */}
            <div className="space-y-2 rounded-xl border border-amber-900/10 bg-amber-950/5 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-950">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>
                    {isFreeShipping
                      ? 'Congratulations! You qualify for FREE Insured Express Shipping.'
                      : `Add ₹${remainingForFreeShipping.toLocaleString('en-IN')} more to unlock FREE Insured Shipping`}
                  </span>
                </span>
                <span>{Math.round(freeShippingProgress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-amber-800 transition-all duration-500"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Item cards */}
            <div className="space-y-4">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;

                const image = product.images?.[0]?.url;
                const itemTotal =
                  (product.price || item.price_at_add) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center gap-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:p-6"
                  >
                    <Link
                      href={`/products/${product.slug}`}
                      className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-stone-100 sm:h-28 sm:w-28"
                    >
                      <ImageWithFallback
                        src={image}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 768px) 96px, 112px"
                      />
                    </Link>

                    <div className="w-full flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs uppercase text-stone-400">
                            {product.sku}
                          </span>
                          <Link
                            href={`/products/${product.slug}`}
                            className="block text-sm font-semibold text-stone-900 transition-colors hover:text-amber-900 sm:text-base"
                          >
                            {product.name}
                          </Link>
                        </div>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between border-t border-stone-100 pt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                          <button
                            onClick={() =>
                              updateQuantity(product.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="px-2.5 py-1 text-stone-600 transition-colors hover:bg-stone-200 disabled:opacity-40"
                            title="Decrease Quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-3 py-1 text-xs font-bold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(product.id, item.quantity + 1)
                            }
                            disabled={
                              product.stock_quantity !== undefined &&
                              product.stock_quantity !== null &&
                              item.quantity >= product.stock_quantity
                            }
                            className="px-2.5 py-1 text-stone-600 transition-colors hover:bg-stone-200 disabled:opacity-40"
                            title="Increase Quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {product.stock_quantity !== undefined &&
                          product.stock_quantity !== null &&
                          item.quantity >= product.stock_quantity && (
                            <div className="mt-1 text-xs font-medium text-amber-800">
                              Max stock reached
                            </div>
                          )}

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-base font-bold text-amber-950">
                            ₹{itemTotal.toLocaleString('en-IN')}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-xs text-stone-400">
                              (₹{product.price.toLocaleString('en-IN')} each)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="border-b border-stone-100 pb-4 font-serif text-lg font-bold text-stone-900">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>
                    Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                  </span>
                  <span className="font-semibold text-stone-900">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Insured Shipping</span>
                  <span className="font-semibold text-stone-900">
                    {estimatedShipping === 0 ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        FREE
                      </span>
                    ) : (
                      `₹${estimatedShipping}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-stone-400">
                  <span>Estimated GST (Included)</span>
                  <span>₹{estimatedGst.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-baseline justify-between border-t border-stone-200 pt-4">
                  <span className="font-serif text-base font-bold text-stone-900">
                    Total Payable
                  </span>
                  <span className="font-serif text-xl font-bold text-amber-950">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full rounded-xl bg-amber-950 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-amber-100 shadow-lg transition-all hover:scale-[1.02] hover:bg-amber-900"
              >
                Proceed to Checkout
              </Link>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-4 text-center text-xs text-stone-500">
                <div className="space-y-1">
                  <Truck className="mx-auto h-4 w-4 text-amber-800" />
                  <span>Insured Delivery</span>
                </div>
                <div className="space-y-1">
                  <ShieldCheck className="mx-auto h-4 w-4 text-amber-800" />
                  <span>Premium Plating</span>
                </div>
                <div className="space-y-1">
                  <RefreshCw className="mx-auto h-4 w-4 text-amber-800" />
                  <span>7-Day Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Cart State */
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Your Bag is Empty"
          description="Looks like you haven't added any fine jewellery pieces yet. Explore our handcrafted collection today."
          actionLabel="Browse Collection"
          actionHref="/products"
        />
      )}

      {/* ── Mobile Sticky Bottom Bar ── */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
            <div>
              <p className="text-xs text-stone-500">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </p>
              <p className="font-serif text-lg font-bold text-amber-950">
                ₹{grandTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <Link
              href="/checkout"
              className="flex-1 rounded-xl bg-amber-950 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-amber-100 shadow-lg transition-all hover:bg-amber-900 active:scale-[0.98]"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
