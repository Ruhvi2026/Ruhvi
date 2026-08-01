'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, User, Menu, X, ChevronDown, Sparkles, Bell, LogOut, Package, ShieldCheck } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { INITIAL_CATEGORIES } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useNotifications();
  const { user, profile, signOut } = useAuth();

  const userDisplayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account';
  const userInitials = userDisplayName ? userDisplayName[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm transition-all">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs py-1.5 px-4 text-center tracking-wide font-medium flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-pink-200 animate-pulse" />
        <span>Complimentary Insured Shipping Across India on Orders Above ₹500</span>
        <Sparkles className="w-3.5 h-3.5 text-pink-200 animate-pulse" />
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-slate-600 hover:text-fuchsia-600 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-purple-950 uppercase">
                Ruhvi
              </span>
              <span className="text-[10px] uppercase font-sans tracking-widest px-1.5 py-0.5 bg-fuchsia-100 text-fuchsia-800 rounded font-semibold">
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
              href="/orders"
              className="hidden sm:inline-flex text-xs font-semibold uppercase tracking-wider text-slate-700 hover:text-fuchsia-600 transition-colors"
            >
              My Orders
            </Link>

            <Link
              href="/admin/dashboard"
              className="hidden sm:inline-flex text-xs font-semibold uppercase tracking-wider text-fuchsia-800 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 px-3 py-1.5 rounded-md transition-colors"
            >
              Admin Portal
            </Link>

            <Link
              href="/account/notifications"
              className="relative p-2 text-slate-700 hover:text-fuchsia-600 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-fuchsia-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scale-in">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/wishlist"
              className="relative p-2 text-slate-700 hover:text-fuchsia-600 transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scale-in">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-fuchsia-600 transition-colors"
              title="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scale-in">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Profile Navigation Icon / Dropdown */}
            <div className="relative">
              {user ? (
                <div className="relative group">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-1.5 p-1 text-slate-700 hover:text-purple-900 focus:outline-none transition-colors"
                    title="Account Menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-950 text-amber-300 font-serif font-bold text-xs flex items-center justify-center border border-amber-400/40 shadow-sm">
                      {userInitials}
                    </div>
                  </button>

                  <div className="absolute right-0 top-full pt-2 w-60 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                    <div className="bg-white border border-stone-200 rounded-2xl shadow-xl p-3 space-y-2 text-xs">
                      <div className="px-3 py-2 bg-stone-50 rounded-xl border border-stone-100 space-y-0.5">
                        <p className="font-bold text-stone-900 truncate">{userDisplayName}</p>
                        <p className="text-[10px] text-stone-500 truncate font-mono">{user.email}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 pt-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Email Authenticated
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <Link
                          href="/account"
                          className="flex items-center space-x-2 px-3 py-2 rounded-xl text-stone-700 hover:bg-purple-50 hover:text-purple-950 font-medium"
                        >
                          <User className="w-4 h-4 text-purple-800" />
                          <span>My Account Profile</span>
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center space-x-2 px-3 py-2 rounded-xl text-stone-700 hover:bg-purple-50 hover:text-purple-950 font-medium"
                        >
                          <Package className="w-4 h-4 text-purple-800" />
                          <span>My Purchases</span>
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-stone-100">
                        <button
                          onClick={signOut}
                          className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-semibold text-xs transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2 text-slate-700 hover:text-fuchsia-600 transition-colors flex items-center gap-1"
                  title="Sign In"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden pb-3">
          <SearchBar />
        </div>

        {/* Desktop Category & Collection Navigation */}
        <nav className="hidden lg:flex items-center justify-center space-x-8 py-2.5 border-t border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-700">
          <Link href="/products" className="hover:text-fuchsia-600 transition-colors font-semibold">
            All Products
          </Link>

          {/* Collections Dropdown */}
          <div className="relative group">
            <button className="flex items-center space-x-1 hover:text-fuchsia-600 text-purple-900 font-bold transition-colors focus:outline-none py-2">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
              <span>Collections</span>
              <ChevronDown className="w-3.5 h-3.5 text-fuchsia-500" />
            </button>
            <div className="absolute left-0 top-full pt-1 w-56 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="bg-white border border-slate-200 rounded-xl shadow-xl py-2">
                <div className="px-4 py-1 text-[10px] font-bold text-purple-800 uppercase tracking-widest border-b border-slate-100 mb-1">
                  Curated Collections
                </div>
                <Link href="/collections/for-her" className="block px-4 py-2 text-xs text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-900 font-medium">
                  Gifts For Her
                </Link>
                <Link href="/collections/under-15000" className="block px-4 py-2 text-xs text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-900 font-medium">
                  Gifts Under ₹15,000
                </Link>
                <Link href="/collections/anniversary" className="block px-4 py-2 text-xs text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-900 font-medium">
                  Anniversary Specials
                </Link>
                <Link href="/collections/bridal" className="block px-4 py-2 text-xs text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-900 font-medium">
                  Royal Bridal Collection
                </Link>
              </div>
            </div>
          </div>

          {INITIAL_CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="hover:text-fuchsia-600 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
          {/* Dropdown for more */}
          <div className="relative group">
            <button className="flex items-center space-x-1 hover:text-fuchsia-600 transition-colors focus:outline-none py-2">
              <span>More Categories</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute left-0 top-full pt-1 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-2">
                {INITIAL_CATEGORIES.slice(6).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="block px-4 py-2 text-xs text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-900"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-4">
          <div className="font-semibold text-xs uppercase tracking-wider text-slate-400">
            Categories
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded bg-fuchsia-50 text-fuchsia-900 font-medium"
            >
              All Jewellery
            </Link>
            {INITIAL_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded hover:bg-slate-50"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-2 bg-purple-900 text-white rounded font-medium text-xs uppercase tracking-wider"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
