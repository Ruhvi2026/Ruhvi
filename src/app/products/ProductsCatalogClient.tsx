'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { DEMO_PRODUCTS, INITIAL_CATEGORIES } from '@/lib/products';
import { ProductCard } from '@/components/products/ProductCard';
import { SpatialPage } from '@/components/design-system/SpatialPage';
import { GlassPanel } from '@/components/design-system/GlassPanel';
import { DepthCard } from '@/components/design-system/DepthCard';
import { DepthButton } from '@/components/design-system/DepthButton';
import { ecommerceEvent } from '@/lib/gtag';

const PAGE_SIZE = 12;

function ProductsCatalogContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'all';

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreDb, setHasMoreDb] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [stockFilter, setStockFilter] = useState<
    'all' | 'in_stock' | 'out_of_stock'
  >('all');
  const [priceRange, setPriceRange] = useState<number>(200000);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>(
    'newest'
  );

  const fetchProducts = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, count } = await supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(*)', {
          count: 'exact',
        })
        .range(0, PAGE_SIZE - 1);

      setDbProducts(data ?? []);
      setHasMoreDb(count != null && (data?.length ?? 0) < count);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreDb = async () => {
    if (isLoadingMore || !hasMoreDb) return;
    setIsLoadingMore(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, count } = await supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(*)', {
          count: 'exact',
        })
        .range(dbProducts.length, dbProducts.length + PAGE_SIZE - 1);

      if (data && data.length > 0) {
        setDbProducts((prev) => [...prev, ...data]);
      }
      setHasMoreDb(
        count != null && dbProducts.length + (data?.length ?? 0) < count
      );
    } catch (err) {
      console.error('Failed to load more products', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedCategory, stockFilter, priceRange, sortBy]);

  const filteredProducts = useMemo(() => {
    const sourceProducts =
      dbProducts.length > 0 || !isLoading
        ? dbProducts.length > 0
          ? dbProducts
          : DEMO_PRODUCTS
        : [];

    return sourceProducts
      .filter((product) => {
        if (product.status === 'hidden') return false;
        if (
          selectedCategory !== 'all' &&
          product.category?.slug !== selectedCategory
        )
          return false;
        if (stockFilter === 'in_stock' && product.status === 'out_of_stock')
          return false;
        if (stockFilter === 'out_of_stock' && product.status !== 'out_of_stock')
          return false;
        if (product.price > priceRange) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = product.name.toLowerCase().includes(q);
          const matchesSku = product.sku.toLowerCase().includes(q);
          const matchesCat =
            product.category?.name?.toLowerCase().includes(q) || false;
          if (!matchesName && !matchesSku && !matchesCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'newest') {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        }
        return 0;
      });
  }, [
    dbProducts,
    isLoading,
    selectedCategory,
    stockFilter,
    priceRange,
    searchQuery,
    sortBy,
  ]);

  useEffect(() => {
    if (filteredProducts.length > 0) {
      ecommerceEvent('view_item_list', {
        item_list_id: 'catalog_products',
        item_list_name: 'Catalog Products',
        items: filteredProducts.slice(0, 10).map((p, index) => ({
          item_id: p.id,
          item_name: p.name,
          price: p.price,
          index: index,
          item_category: p.category?.name || undefined,
        })),
      });
    }
  }, [filteredProducts]);

  const isDbSource = dbProducts.length > 0;
  const showLoadMore =
    visibleCount < filteredProducts.length || (isDbSource && hasMoreDb);

  const handleLoadMore = () => {
    if (visibleCount < filteredProducts.length) {
      setVisibleCount((c) => c + PAGE_SIZE);
      return;
    }
    if (isDbSource && hasMoreDb) {
      setVisibleCount((c) => c + PAGE_SIZE);
      loadMoreDb();
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStockFilter('all');
    setPriceRange(200000);
    setSortBy('newest');
  };

  return (
    <SpatialPage showParticles showOrbs>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="relative mb-8 pb-8">
          <div className="relative z-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-600">
              Immersive Catalog
            </span>
            <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal-900 sm:text-5xl">
              All Fine <span className="gold-shimmer">Jewellery</span>
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Showing{' '}
              <span className="font-bold text-gold-700">
                {filteredProducts.length}
              </span>{' '}
              certified handcrafted pieces
            </p>
          </div>
          <div className="gold-divider absolute inset-x-0 bottom-0 h-px" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Glass Filter Sidebar */}
          <aside
            className={`h-fit lg:sticky lg:top-32 ${isFilterOpen ? 'block' : 'hidden'} lg:block`}
          >
            <GlassPanel
              intensity="medium"
              depth={1}
              glow
              className="space-y-6 p-6"
            >
              <div className="flex items-center justify-between border-b border-gold-200/50 pb-4">
                <h3 className="flex items-center space-x-2 text-sm font-semibold uppercase tracking-wider text-charcoal-900">
                  <SlidersHorizontal className="h-4 w-4 text-gold-600" />
                  <span>Filters</span>
                </h3>
                <button
                  onClick={resetFilters}
                  className="flex items-center space-x-1 text-xs text-gold-700 transition-colors hover:text-gold-500"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Keyword or SKU
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Solitaire, RNG-000101"
                  className="w-full rounded-xl border border-gold-200/70 bg-white px-3 py-2.5 text-xs transition-all focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-gold-200/70 bg-white px-3 py-2.5 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                >
                  <option value="all">All Categories</option>
                  {INITIAL_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span className="uppercase tracking-wider">Max Price</span>
                  <span className="font-bold text-gold-700">
                    ₹{priceRange.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={250000}
                  step={5000}
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full cursor-pointer accent-gold-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Availability
                </label>
                <div className="space-y-2.5 text-xs text-stone-700">
                  {[
                    { value: 'all', label: 'All Items' },
                    { value: 'in_stock', label: 'In Stock Only' },
                    { value: 'out_of_stock', label: 'Out of Stock' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="group flex cursor-pointer items-center space-x-2.5"
                    >
                      <input
                        type="radio"
                        name="stock"
                        checked={stockFilter === opt.value}
                        onChange={() => setStockFilter(opt.value as any)}
                        className="accent-gold-600"
                      />
                      <span className="transition-colors group-hover:text-gold-700">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </aside>

          {/* Main Product Grid */}
          <div className="space-y-6 lg:col-span-3">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-gold-300/70 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-gold-700 shadow-sm transition-colors hover:bg-gold-50 lg:hidden"
            >
              <Filter className="h-4 w-4" />
              <span>{isFilterOpen ? 'Hide Filters' : 'Show Filters'}</span>
            </button>

            {/* Sort Bar */}
            <GlassPanel
              intensity="light"
              depth={0}
              className="flex items-center justify-between p-4 text-xs"
            >
              <div className="text-stone-600">
                Showing{' '}
                <span className="font-bold text-charcoal-900">
                  {filteredProducts.length}
                </span>{' '}
                results
              </div>
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-gold-500" />
                <span className="font-semibold text-stone-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="cursor-pointer border-0 bg-transparent font-medium text-gold-700 focus:outline-none"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </GlassPanel>

            {/* Product Grid with staggered depth */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] w-full rounded-lg bg-gold-100" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-2/3 rounded bg-gold-100" />
                      <div className="h-3 w-1/3 rounded bg-gold-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts
                    .slice(0, visibleCount)
                    .map((product, index) => (
                      <div
                        key={product.id}
                        style={{
                          animation: `fade-up 0.5s ease-out ${Math.min(
                            index * 0.05,
                            0.4
                          )}s both`,
                        }}
                      >
                        <ProductCard product={product} />
                      </div>
                    ))}
                </div>

                {showLoadMore && (
                  <div className="flex justify-center pt-2">
                    <DepthButton
                      variant="secondary"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? 'Loading more...' : 'Load More'}
                    </DepthButton>
                  </div>
                )}
              </>
            ) : (
              <DepthCard depth={1} glow className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100">
                  <Filter className="h-8 w-8 text-gold-400" />
                </div>
                <h3 className="mb-1 font-serif text-lg font-bold text-stone-800">
                  No Products Match Your Criteria
                </h3>
                <p className="mx-auto mb-6 max-w-sm text-xs text-stone-500">
                  Try widening your price range or clearing keyword search
                  parameters.
                </p>
                <DepthButton variant="primary" onClick={resetFilters}>
                  Reset Filters
                </DepthButton>
              </DepthCard>
            )}
          </div>
        </div>
      </div>
    </SpatialPage>
  );
}

export default function ProductsCatalogPage() {
  return (
    <Suspense
      fallback={
        <SpatialPage showParticles={false} showOrbs={false}>
          <div className="flex items-center justify-center gap-2 p-12 text-center text-xs text-stone-500">
            <Sparkles className="h-4 w-4 animate-spin text-gold-400" />
            Loading catalog...
          </div>
        </SpatialPage>
      }
    >
      <ProductsCatalogContent />
    </Suspense>
  );
}
