'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Tag, ArrowRight, PackageCheck } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';
import { Product } from '@/types/database';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

    const matches = DEMO_PRODUCTS.filter(
      (p) =>
        p.status === 'active' &&
        (p.name.toLowerCase().includes(trimmed) ||
          p.sku.toLowerCase().includes(trimmed) ||
          p.category?.name.toLowerCase().includes(trimmed) ||
          p.description?.toLowerCase().includes(trimmed))
    ).slice(0, 5);

    setSuggestions(matches);
    setIsOpen(true);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Direct SKU match check
    const directSkuMatch = DEMO_PRODUCTS.find(
      (p) => p.sku.toLowerCase() === query.trim().toLowerCase()
    );

    if (directSkuMatch) {
      router.push(`/products/${directSkuMatch.slug}`);
    } else {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ring, necklace, SKU (e.g. RNG-000101)..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-stone-100 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
        />
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {suggestions.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Suggested Products & SKUs
              </div>
              {suggestions.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    {product.images && product.images[0] && (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-md border border-stone-200"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-stone-800 group-hover:text-amber-700">
                        {product.name}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-stone-500">
                        <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                          {product.sku}
                        </span>
                        <span>•</span>
                        <span>₹{product.price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
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
