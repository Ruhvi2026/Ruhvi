'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck, RefreshCw, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotal, clearCart } = useCart();

  const FREE_SHIPPING_THRESHOLD = 500;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const estimatedShipping = isFreeShipping || items.length === 0 ? 0 : 49;
  const grandTotal = subtotal + estimatedShipping;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 flex items-center space-x-3">
            <ShoppingBag className="w-8 h-8 text-amber-900" />
            <span>Shopping Cart</span>
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your bag
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-stone-400 hover:text-rose-600 font-medium transition-colors"
          >
            Clear Cart
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Free Shipping Progress Card */}
            <div className="bg-amber-950/5 border border-amber-900/10 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-950">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>
                    {isFreeShipping
                      ? 'Congratulations! You qualify for FREE Insured Express Shipping.'
                      : `Add ₹${remainingForFreeShipping.toLocaleString('en-IN')} more to unlock FREE Insured Shipping`}
                  </span>
                </span>
                <span>{Math.round(freeShippingProgress)}%</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-800 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Item cards */}
            <div className="space-y-4">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;

                const image = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';
                const itemTotal = (product.price || item.price_at_add) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-6"
                  >
                    <Link
                      href={`/products/${product.slug}`}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-100"
                    >
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-stone-400 uppercase">
                            {product.sku}
                          </span>
                          <Link
                            href={`/products/${product.slug}`}
                            className="block font-semibold text-sm sm:text-base text-stone-900 hover:text-amber-900 transition-colors"
                          >
                            {product.name}
                          </Link>
                        </div>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-stone-100">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                          <button
                            onClick={() => updateQuantity(product.id, item.quantity - 1)}
                            className="px-2.5 py-1 text-stone-600 hover:bg-stone-200 transition-colors"
                            title="Decrease Quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 py-1 text-xs font-bold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, item.quantity + 1)}
                            className="px-2.5 py-1 text-stone-600 hover:bg-stone-200 transition-colors"
                            title="Increase Quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-base font-bold text-amber-950">
                            ₹{itemTotal.toLocaleString('en-IN')}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-[10px] text-stone-400">
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
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 sticky top-24">
              <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-4">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-semibold text-stone-900">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Insured Shipping</span>
                  <span className="font-semibold text-stone-900">
                    {estimatedShipping === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                        FREE
                      </span>
                    ) : (
                      `₹${estimatedShipping}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-stone-400">
                  <span>Estimated GST (Included)</span>
                  <span>3.0%</span>
                </div>

                <div className="border-t border-stone-200 pt-4 flex justify-between items-baseline">
                  <span className="font-serif font-bold text-base text-stone-900">
                    Total Payable
                  </span>
                  <span className="font-serif font-bold text-xl text-amber-950">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full block text-center py-3.5 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all hover:scale-[1.02]"
              >
                Proceed to Checkout
              </Link>

              {/* Trust badges */}
              <div className="pt-4 border-t border-stone-100 grid grid-cols-3 gap-2 text-center text-[10px] text-stone-500">
                <div className="space-y-1">
                  <Truck className="w-4 h-4 mx-auto text-amber-800" />
                  <span>Insured Delivery</span>
                </div>
                <div className="space-y-1">
                  <ShieldCheck className="w-4 h-4 mx-auto text-amber-800" />
                  <span>Certified Gold</span>
                </div>
                <div className="space-y-1">
                  <RefreshCw className="w-4 h-4 mx-auto text-amber-800" />
                  <span>7-Day Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Cart State */
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200 shadow-sm max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Your Bag is Empty
            </h2>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Looks like you haven&apos;t added any fine jewellery pieces yet. Explore our handcrafted collection today.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 px-8 py-3.5 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-widest rounded-full shadow-md transition-all hover:scale-105"
          >
            <span>Browse Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
