'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Tag, ArrowRight, PackageCheck } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';
import { Product } from '@/types/database';
import { ecommerceEvent } from '@/lib/gtag';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') setIsOpen(false);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev <= 0 ? suggestions.length - 1 : prev - 1
        );
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          const active = suggestions[activeIndex];
          router.push(`/products/${active.slug}`);
          setIsOpen(false);
          setActiveIndex(-1);
          setQuery('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data } = await supabase
          .from('products')
          .select('*, images:product_images(*), category:categories(*)')
          .eq('status', 'active')
          .or(`name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%`)
          .limit(5);

        if (data && data.length > 0) {
          setSuggestions(data);
        } else {
          const matches = DEMO_PRODUCTS.filter(
            (p) =>
              p.status === 'active' &&
              (p.name.toLowerCase().includes(trimmed) ||
                p.sku.toLowerCase().includes(trimmed) ||
                p.category?.name?.toLowerCase().includes(trimmed) ||
                p.description?.toLowerCase().includes(trimmed))
          ).slice(0, 5);
          setSuggestions(matches as any);
        }
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      }
    };

    // Add small debounce
    const timeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // GA4 Search tracking
    ecommerceEvent('search', {
      search_term: trimmed,
    });

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: directMatch } = await supabase
        .from('products')
        .select('slug')
        .ilike('sku', trimmed)
        .single();

      if (directMatch) {
        router.push(`/products/${directMatch.slug}`);
        setIsOpen(false);
        return;
      }
    } catch (err) {
      // Ignore and fallback
    }

    // Direct SKU match check fallback
    const directSkuMatch = DEMO_PRODUCTS.find(
      (p) => p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (directSkuMatch) {
      router.push(`/products/${directSkuMatch.slug}`);
    } else {
      router.push(`/products?search=${encodeURIComponent(trimmed)}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto" ref={dropdownRef}>
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          aria-activedescendant={
            activeIndex >= 0
              ? `search-suggestion-${suggestions[activeIndex]?.id}`
              : undefined
          }
          aria-label="Search products by name, category or SKU"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search ring, necklace, SKU (e.g. RNG-000101)..."
          className="w-full rounded-full border border-stone-200/70 bg-stone-50/50 py-2.5 pl-11 pr-4 text-sm text-stone-800 placeholder-stone-400 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 hover:bg-white focus:border-gold-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold-500/10"
        />
        <Search className="absolute left-4 top-3 h-4.5 w-4.5 text-stone-400" strokeWidth={1.5} />
        <button type="submit" className="sr-only" aria-label="Search">
          Search
        </button>
      </form>

      {isOpen && (
        <div
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="animate-in fade-in slide-in-from-top-2 absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-stone-100 bg-white shadow-2xl duration-150"
        >
          {suggestions.length > 0 ? (
            <div className="space-y-1 p-2">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Suggested Products & SKUs
              </div>
              {suggestions.map((product, index) => (
                <Link
                  key={product.id}
                  id={`search-suggestion-${product.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  href={`/products/${product.slug}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    setIsOpen(false);
                    setActiveIndex(-1);
                    setQuery('');
                  }}
                  className={`group flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-stone-50 ${
                    index === activeIndex ? 'bg-gold-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {product.images && product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-md border border-stone-200 object-cover"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-stone-800 group-hover:text-gold-700">
                        {product.name}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-stone-500">
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-600">
                          {product.sku}
                        </span>
                        <span>•</span>
                        <span>₹{product.price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-gold-600" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-stone-500">
              No products found matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
