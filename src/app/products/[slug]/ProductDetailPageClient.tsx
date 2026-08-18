'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Bell,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { Product } from '@/types/database';
import { StockNotificationModal } from '@/components/products/StockNotificationModal';
import { ProductImageGallery } from '@/components/products/ProductImageGallery';
import { Product360Button } from '@/components/products/Product360Button';
import { Product360Modal } from '@/components/products/Product360Modal';
import { trackEvent } from '@/lib/analytics';
import { ecommerceEvent } from '@/lib/gtag';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { SpatialPage } from '@/components/design-system/SpatialPage';
import { Carousel3D } from '@/components/design-system/Carousel3D';
import ProductAttributes from '@/components/ProductAttributes';

interface ProductDetailPageClientProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailPageClient({
  product,
  relatedProducts,
}: ProductDetailPageClientProps) {
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>('description');
  const { profile } = useAuth();
  const walletBalance = profile?.wallet_balance || 0;

  const rawViewer360 = product.viewer360;
  const viewer360 = Array.isArray(rawViewer360)
    ? rawViewer360[0]
    : rawViewer360;

  const { addToCart, items: cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isLiked = isInWishlist(product.id);
  const isInCart = cartItems.some((item) => item.product_id === product.id);

  // Store in Local Storage for Recently Viewed
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ruhvi_recently_viewed');
      let items: Product[] = stored ? JSON.parse(stored) : [];
      items = items.filter((item) => item.id !== product.id);
      items.unshift(product);
      items = items.slice(0, 4); // Keep top 4
      localStorage.setItem('ruhvi_recently_viewed', JSON.stringify(items));
      setRecentlyViewed(items.filter((item) => item.id !== product.id));
    } catch {
      // LocalStorage unavailable
    }

    // Track ViewContent event for Meta
    trackEvent('ViewContent', {
      content_name: product.name,
      content_ids: [product.sku],
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });

    // Track view_item event for GA4
    ecommerceEvent('view_item', {
      currency: 'INR',
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          item_category: product.category?.name || undefined,
        },
      ],
    });
  }, [product]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Ruhvi Fine Jewellery`,
          url: window.location.href,
        });
      } catch {
        // Fallback
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddToCart = () => {
    if (!isOutOfStock) {
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

  const handleToggleWishlist = () => {
    toggleWishlist(product);
  };

  const isOutOfStock =
    product.status === 'out_of_stock' || product.stock_quantity === 0;

  return (
    <main className="min-h-screen bg-cream-50 pb-20">
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-gold-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gold-700">
            Products
          </Link>
          <span>/</span>
          {product.category && (
            <>
              <Link
                href={`/category/${product.category.slug}`}
                className="hover:text-gold-700"
              >
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate font-medium text-slate-800">
            {product.name}
          </span>
        </nav>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div>
            <div className="relative">
              <ProductImageGallery
                images={product.images || []}
                productName={product.name}
              />
              {viewer360 &&
                viewer360.enabled &&
                viewer360.frames &&
                viewer360.frames.length > 0 && (
                  <div className="absolute right-4 top-4 z-10">
                    <Product360Button
                      viewer360={viewer360}
                      onClick={() => setIs360ModalOpen(true)}
                    />
                  </div>
                )}
            </div>
          </div>

          {/* Right Column: Product Details & Actions */}
          <div className="space-y-6 rounded-2xl border border-gold-200/50 bg-white p-6 shadow-sm hover:shadow-lg hover:shadow-gold-500/10 sm:p-8">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
                    {product.sku}
                  </span>
                  <h1 className="mt-1 font-serif text-2xl font-bold text-charcoal-900 sm:text-4xl">
                    {product.name}
                  </h1>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${product.name} on Ruhvi Fine Jewellery: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                    title="Share on WhatsApp"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={handleShare}
                    className="relative rounded-full border border-gold-300/70 p-2 text-slate-600 transition-colors hover:bg-gold-50"
                    title="Copy product link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Price & Savings Breakdown */}
              <div className="mt-4 flex items-baseline space-x-3">
                <span className="text-3xl font-bold text-charcoal-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.mrp > product.price && (
                  <>
                    <span className="text-base text-slate-400 line-through">
                      ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      Save ₹
                      {(product.mrp - product.price).toLocaleString('en-IN')} (
                      {Math.round(
                        ((product.mrp - product.price) / product.mrp) * 100
                      )}
                      % OFF)
                    </span>
                  </>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Price inclusive of all taxes (GST {product.gst_rate}% included)
                & complimentary insured delivery.
              </p>
            </div>

            {/* Description & Details Accordion */}
            <div className="border-t border-gold-200/70 pt-6">
              <div className="space-y-4">
                {/* Description Accordion */}
                <div className="border-b border-gold-200/40 pb-4">
                  <button
                    onClick={() =>
                      setActiveAccordion(
                        activeAccordion === 'description' ? '' : 'description'
                      )
                    }
                    className="flex w-full items-center justify-between font-serif text-lg font-medium text-charcoal-900"
                  >
                    <span>Description</span>
                    <span className="text-xl leading-none">
                      {activeAccordion === 'description' ? '−' : '+'}
                    </span>
                  </button>
                  {activeAccordion === 'description' && (
                    <div className="animate-fade-in mt-4 space-y-4 text-sm font-light leading-relaxed text-slate-600">
                      <p>{product.description}</p>
                      <ProductAttributes />
                    </div>
                  )}
                </div>

                {/* Materials Accordion */}
                <div className="border-b border-gold-200/40 pb-4">
                  <button
                    onClick={() =>
                      setActiveAccordion(
                        activeAccordion === 'materials' ? '' : 'materials'
                      )
                    }
                    className="flex w-full items-center justify-between font-serif text-lg font-medium text-charcoal-900"
                  >
                    <span>Materials & Craftsmanship</span>
                    <span className="text-xl leading-none">
                      {activeAccordion === 'materials' ? '−' : '+'}
                    </span>
                  </button>
                  {activeAccordion === 'materials' && (
                    <div className="animate-fade-in mt-4 text-sm font-light leading-relaxed text-slate-600">
                      <p>
                        Handcrafted with precision, this piece is made from a
                        premium brass base and thickly plated with 22K pure gold
                        for enduring brilliance. Every stone is meticulously set
                        by hand by our expert artisans, ensuring exceptional
                        quality and a luxurious finish that mimics fine jewelry.
                      </p>
                    </div>
                  )}
                </div>

                {/* Care Accordion */}
                <div className="border-b border-gold-200/40 pb-4">
                  <button
                    onClick={() =>
                      setActiveAccordion(
                        activeAccordion === 'care' ? '' : 'care'
                      )
                    }
                    className="flex w-full items-center justify-between font-serif text-lg font-medium text-charcoal-900"
                  >
                    <span>Care Instructions</span>
                    <span className="text-xl leading-none">
                      {activeAccordion === 'care' ? '−' : '+'}
                    </span>
                  </button>
                  {activeAccordion === 'care' && (
                    <div className="animate-fade-in mt-4 text-sm font-light leading-relaxed text-slate-600">
                      <ul className="list-inside list-disc space-y-1">
                        <li>
                          Store in the provided Ruhvi velvet pouch when not in
                          use.
                        </li>
                        <li>
                          Keep away from perfumes, sprays, and harsh chemicals.
                        </li>
                        <li>
                          Wipe with a soft, dry cotton cloth after every use.
                        </li>
                        <li>Avoid wearing during workouts or in water.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stock & CTA Buttons */}
            <div className="relative z-20 space-y-4 pt-4">
              {!isOutOfStock ? (
                <div className="space-y-4">
                  {walletBalance > 0 && (
                    <div className="flex items-center space-x-2 rounded-lg border border-gold-200/40 bg-gold-50/50 p-3 text-xs text-charcoal-900">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-200/50 text-gold-700">
                        ₹
                      </div>
                      <span>
                        Use{' '}
                        <strong className="font-semibold text-gold-700">
                          ₹{walletBalance.toLocaleString('en-IN')}
                        </strong>{' '}
                        from your Ruhvi Wallet at checkout.
                      </span>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddToCart}
                      className="flex flex-1 items-center justify-center space-x-2 bg-charcoal-900 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-charcoal-800"
                    >
                      {isInCart ? (
                        <Check className="h-4 w-4 text-champagne-300" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                      <span>{isInCart ? 'Added to Cart' : 'Add to Cart'}</span>
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`border px-5 py-4 transition-colors hover:bg-champagne-50 ${isLiked ? 'border-charcoal-900 bg-champagne-50 text-charcoal-900' : 'border-gold-300/70 text-slate-700'}`}
                    >
                      <Heart
                        className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`}
                        strokeWidth={1.5}
                      />
                    </button>
                  </div>

                  {product.stock_quantity !== undefined &&
                    product.stock_quantity > 0 &&
                    product.stock_quantity < 10 && (
                      <div className="mt-2 text-center text-[10px] font-medium uppercase tracking-widest text-gold-600">
                        Only {product.stock_quantity} remaining
                      </div>
                    )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-slate-100 p-3 text-xs font-medium text-slate-700">
                    Currently Out of Stock
                  </div>

                  <button
                    onClick={() => setStockModalOpen(true)}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-gold-500/30 transition-all hover:from-gold-500 hover:to-gold-800"
                  >
                    <Bell className="h-4 w-4" />
                    <span>Notify Me When Back In Stock</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reassurance Grid */}
            <div className="grid grid-cols-3 gap-3 border-t border-gold-200/70 pt-6 text-center text-[11px] text-slate-600">
              <div className="flex flex-col items-center justify-center rounded-lg border border-gold-200/70 bg-cream-50 p-3 shadow-sm">
                <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-gold-600" />
                <span>22K Gold Plated • 6-Month Color Guarantee</span>
              </div>
              <div className="rounded-lg border border-gold-200/70 bg-cream-50 p-3 shadow-sm">
                <Truck className="mx-auto mb-1 h-5 w-5 text-gold-600" />
                <span>Insured Shipping</span>
              </div>
              <div className="rounded-lg border border-gold-200/70 bg-cream-50 p-3 shadow-sm">
                <RotateCcw className="mx-auto mb-1 h-5 w-5 text-gold-600" />
                <span>7-Day Return Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section - 3D Carousel */}
        {relatedProducts.length > 0 && (
          <section className="pt-12">
            <Carousel3D title="You May Also Like" viewAllHref="/products">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group min-w-[200px] flex-shrink-0 overflow-hidden rounded-2xl border border-gold-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/15 sm:min-w-[240px]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="aspect-square overflow-hidden bg-gold-50/60">
                    {p.images && p.images[0] && (
                      <img
                        src={p.images[0].url}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="line-clamp-1 text-xs font-semibold text-slate-800 group-hover:text-gold-700">
                      {p.name}
                    </h4>
                    <div className="mt-1 text-xs font-bold text-slate-900">
                      ₹{p.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                </Link>
              ))}
            </Carousel3D>
          </section>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewed.length > 0 && (
          <section className="border-t border-gold-200/70 pt-12">
            <h2 className="mb-6 font-serif text-2xl font-bold text-charcoal-900">
              Recently Viewed
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recentlyViewed.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="flex items-center space-x-3 rounded-xl border border-gold-200/70 bg-cream-50 p-3 transition-colors hover:border-gold-400"
                >
                  {p.images && p.images[0] && (
                    <img
                      src={p.images[0].url}
                      alt={p.name}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <h4 className="line-clamp-1 text-xs font-semibold text-slate-800">
                      {p.name}
                    </h4>
                    <div className="text-xs font-bold text-slate-900">
                      ₹{p.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Stock Notification Modal */}
        <StockNotificationModal
          product={product}
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
        />

        {viewer360 && viewer360.enabled && (
          <Product360Modal
            viewer360={viewer360}
            isOpen={is360ModalOpen}
            onClose={() => setIs360ModalOpen(false)}
          />
        )}
      </div>
      {/* Sticky Mobile Add to Cart */}
      {!isOutOfStock && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-gold-200/50 bg-white/95 p-4 pb-8 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur-md sm:hidden">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">Price</span>
            <span className="text-lg font-bold text-charcoal-900">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-charcoal-900 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-charcoal-800"
          >
            {isInCart ? 'Added' : 'Add to Cart'}
          </button>
        </div>
      )}
    </main>
  );
}
