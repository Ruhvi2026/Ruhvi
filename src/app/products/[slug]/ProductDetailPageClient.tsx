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
  ZoomIn,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Product } from '@/types/database';
import { StockNotificationModal } from '@/components/products/StockNotificationModal';
import { trackEvent } from '@/lib/analytics';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

interface ProductDetailPageClientProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailPageClient({ product, relatedProducts }: ProductDetailPageClientProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  const { addToCart, items: cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isLiked = isInWishlist(product.id);
  const isInCart = cartItems.some((item) => item.product_id === product.id);

  const images = product.images || [];
  const currentImage = images[activeImageIndex] || { url: '', type: 'still' };

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

    // Track ViewContent event
    trackEvent('ViewContent', {
      content_name: product.name,
      content_ids: [product.sku],
      content_type: 'product',
      value: product.price,
      currency: 'INR',
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

  const isOutOfStock = product.status === 'out_of_stock' || product.stock_quantity === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-500 flex items-center space-x-2">
        <Link href="/" className="hover:text-amber-800">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-amber-800">Products</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/category/${product.category.slug}`} className="hover:text-amber-800">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-stone-800 font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm group">
            {currentImage.url && (
              <img
                src={currentImage.url}
                alt={product.name}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                onClick={() => setZoomOpen(true)}
              />
            )}

            {currentImage.type === '360' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                <Sparkles className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-serif text-lg font-bold">Interactive 360° View Coming Soon</h4>
                <p className="text-xs text-stone-300 mt-1">Our studio team is crafting the 3D model for this piece.</p>
              </div>
            )}

            <button
              onClick={() => setZoomOpen(true)}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-stone-800 p-2 rounded-full shadow-md text-xs flex items-center space-x-1"
            >
              <ZoomIn className="w-4 h-4" />
              <span>Zoom</span>
            </button>
          </div>

          {/* Image Thumbnails Grouped by Type */}
          {images.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    activeImageIndex === idx ? 'border-amber-700 ring-2 ring-amber-500/20' : 'border-stone-200'
                  }`}
                >
                  <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-white text-[9px] uppercase tracking-wider text-center py-0.5">
                    {img.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs text-stone-400 uppercase tracking-widest">{product.sku}</span>
                <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 mt-1">{product.name}</h1>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${product.name} on Ruhvi Fine Jewellery: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center space-x-1 transition-colors shadow-sm"
                  title="Share on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={handleShare}
                  className="p-2 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors text-stone-600 relative"
                  title="Copy product link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Price & Savings Breakdown */}
            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-amber-950">₹{product.price.toLocaleString('en-IN')}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-base text-stone-400 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Save ₹{(product.mrp - product.price).toLocaleString('en-IN')} ({Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF)
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-stone-500 mt-1">
              Price inclusive of all taxes (GST {product.gst_rate}% included) & complimentary insured delivery.
            </p>
          </div>

          {/* Description */}
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-stone-600 leading-relaxed font-light">{product.description}</p>
          </div>

          {/* Stock & CTA Buttons */}
          <div className="space-y-4 pt-2">
            {!isOutOfStock ? (
              <div className="space-y-3">
                {product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity < 10 ? (
                  <div className="text-xs text-rose-600 font-bold flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Only {product.stock_quantity} left in stock - Order soon!</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>In Stock • Ready for dispatch in 24 hours</span>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button 
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 bg-amber-950 hover:bg-amber-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                  >
                    {isInCart ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingBag className="w-4 h-4" />}
                    <span>{isInCart ? 'Added to Cart' : 'Add to Cart'}</span>
                  </button>

                  <button 
                    onClick={handleToggleWishlist}
                    className={`p-3.5 border rounded-xl transition-colors ${isLiked ? 'border-rose-500 bg-rose-50 text-rose-500' : 'border-stone-300 hover:border-amber-700 text-stone-700'}`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium">
                  Currently Out of Stock
                </div>

                <button
                  onClick={() => setStockModalOpen(true)}
                  className="w-full py-3.5 bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notify Me When Back In Stock</span>
                </button>
              </div>
            )}
          </div>

          {/* Reassurance Grid */}
          <div className="grid grid-cols-3 gap-3 border-t border-stone-200 pt-6 text-center text-[11px] text-stone-600">
            <div className="p-3 rounded-lg bg-white border border-stone-100 shadow-sm flex flex-col items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-700 mx-auto mb-1" />
              <span>22K Gold Plated • 6-Month Color Guarantee</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-stone-100 shadow-sm">
              <Truck className="w-5 h-5 text-amber-700 mx-auto mb-1" />
              <span>Insured Shipping</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-stone-100 shadow-sm">
              <RotateCcw className="w-5 h-5 text-amber-700 mx-auto mb-1" />
              <span>7-Day Return Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-stone-200 pt-12">
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="aspect-square overflow-hidden bg-stone-100">
                  {p.images && p.images[0] && (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-stone-800 line-clamp-1 group-hover:text-amber-800">
                    {p.name}
                  </h4>
                  <div className="text-xs font-bold text-amber-950 mt-1">₹{p.price.toLocaleString('en-IN')}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <section className="border-t border-stone-200 pt-12">
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">Recently Viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewed.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-stone-200 hover:border-amber-400 transition-colors"
              >
                {p.images && p.images[0] && (
                  <img src={p.images[0].url} alt={p.name} className="w-12 h-12 object-cover rounded-md" />
                )}
                <div>
                  <h4 className="text-xs font-semibold text-stone-800 line-clamp-1">{p.name}</h4>
                  <div className="text-xs font-bold text-amber-950">₹{p.price.toLocaleString('en-IN')}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Zoom Modal */}
      {zoomOpen && currentImage.url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomOpen(false)}
        >
          <img src={currentImage.url} alt={product.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Stock Notification Modal */}
      <StockNotificationModal
        product={product}
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
      />
    </div>
  );
}
