'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, User, Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { INITIAL_CATEGORIES } from '@/lib/products';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm transition-all">
      {/* Top Banner */}
      <div className="bg-amber-950 text-amber-100 text-xs py-1.5 px-4 text-center tracking-wide font-medium flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>Complimentary Insured Shipping Across India on Orders Above ₹500</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-stone-600 hover:text-amber-700 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-amber-950 uppercase">
                Ruhvi
              </span>
              <span className="text-[10px] uppercase font-sans tracking-widest px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">
                Jewellery
              </span>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link
              href="/admin/dashboard"
              className="hidden sm:inline-flex text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-md transition-colors"
            >
              Admin Portal
            </Link>

            <Link
              href="/wishlist"
              className="relative p-2 text-stone-700 hover:text-amber-800 transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            <Link
              href="/cart"
              className="relative p-2 text-stone-700 hover:text-amber-800 transition-colors"
              title="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>

            <Link
              href="/login"
              className="p-2 text-stone-700 hover:text-amber-800 transition-colors"
              title="Account"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden pb-3">
          <SearchBar />
        </div>

        {/* Desktop Category Navigation */}
        <nav className="hidden lg:flex items-center justify-center space-x-8 py-2.5 border-t border-stone-100 text-xs font-medium uppercase tracking-wider text-stone-700">
          <Link href="/products" className="hover:text-amber-800 transition-colors font-semibold">
            All Products
          </Link>
          {INITIAL_CATEGORIES.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="hover:text-amber-800 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
          {/* Dropdown for more */}
          <div className="relative group">
            <button className="flex items-center space-x-1 hover:text-amber-800 transition-colors focus:outline-none">
              <span>More Categories</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute left-0 mt-2 w-48 bg-white border border-stone-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto z-50 py-2">
              {INITIAL_CATEGORIES.slice(8).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="block px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 hover:text-amber-900"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-stone-200 px-4 py-4 space-y-4">
          <div className="font-semibold text-xs uppercase tracking-wider text-stone-400">
            Categories
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-stone-700">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded bg-amber-50 text-amber-900 font-medium"
            >
              All Jewellery
            </Link>
            {INITIAL_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded hover:bg-stone-50"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-4 space-y-2">
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-2 bg-amber-900 text-white rounded font-medium text-xs uppercase tracking-wider"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
