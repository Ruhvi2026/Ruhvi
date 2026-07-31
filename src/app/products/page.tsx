'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Filter, SlidersHorizontal, ArrowUpDown, RefreshCw } from 'lucide-react';
import { DEMO_PRODUCTS, INITIAL_CATEGORIES } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';

function ProductsCatalogContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'all';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [priceRange, setPriceRange] = useState<number>(200000);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');

  const filteredProducts = useMemo(() => {
    return DEMO_PRODUCTS.filter((product) => {
      if (product.status === 'hidden') return false;

      // Category filter
      if (selectedCategory !== 'all' && product.category?.slug !== selectedCategory) {
        return false;
      }

      // Stock filter
      if (stockFilter === 'in_stock' && product.status === 'out_of_stock') return false;
      if (stockFilter === 'out_of_stock' && product.status !== 'out_of_stock') return false;

      // Price filter
      if (product.price > priceRange) return false;

      // Search query / SKU search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesSku = product.sku.toLowerCase().includes(q);
        const matchesCat = product.category?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return 0; // default newest
    });
  }, [selectedCategory, stockFilter, priceRange, searchQuery, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStockFilter('all');
    setPriceRange(200000);
    setSortBy('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          All Fine Jewellery
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-1">
          Showing {filteredProducts.length} certified handcrafted pieces
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-stone-900 flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-700" />
              <span>Filters</span>
            </h3>
            <button
              onClick={resetFilters}
              className="text-xs text-amber-700 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Search within catalog */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
              Keyword or SKU
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Solitaire, RNG-000101"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="all">All Categories</option>
              {INITIAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-stone-700 mb-2">
              <span className="uppercase tracking-wider">Max Price</span>
              <span className="text-amber-900">₹{priceRange.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={250000}
              step={5000}
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-amber-900 cursor-pointer"
            />
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
              Availability
            </label>
            <div className="space-y-2 text-xs text-stone-700">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="stock"
                  checked={stockFilter === 'all'}
                  onChange={() => setStockFilter('all')}
                  className="accent-amber-900"
                />
                <span>All Items</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="stock"
                  checked={stockFilter === 'in_stock'}
                  onChange={() => setStockFilter('in_stock')}
                  className="accent-amber-900"
                />
                <span>In Stock Only</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="stock"
                  checked={stockFilter === 'out_of_stock'}
                  onChange={() => setStockFilter('out_of_stock')}
                  className="accent-amber-900"
                />
                <span>Out of Stock</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Product Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Sort Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-sm text-xs">
            <div className="text-stone-600">
              Showing <span className="font-bold text-stone-900">{filteredProducts.length}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-semibold text-stone-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-0 font-medium text-amber-900 focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm">
              <Filter className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">No Products Match Your Criteria</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mb-6">
                Try widening your price range or clearing keyword search parameters.
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsCatalogPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading catalog...</div>}>
      <ProductsCatalogContent />
    </Suspense>
  );
}
