'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Bell,
  LogOut,
  Package,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { INITIAL_CATEGORIES } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { getStoreSettings, StoreSettings } from '@/app/admin/actions/settings';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useNotifications();
  const { user, profile, signOut } = useAuth();

  const [bannerSettings, setBannerSettings] = useState<StoreSettings | null>(
    null
  );

  React.useEffect(() => {
    async function fetchBanner() {
      const data = await getStoreSettings();
      if (data) setBannerSettings(data);
    }
    fetchBanner();
  }, []);

  const userDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Account';
  const userInitials = userDisplayName ? userDisplayName[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 border-b border-gold-200/80 bg-champagne-50 shadow-sm transition-all">
      {/* Top Banner */}
      {(!bannerSettings || bannerSettings.banner_enabled) && (
        <div
          className={`${bannerSettings?.banner_color || 'bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700'} flex items-center justify-center space-x-2 px-4 py-1.5 text-center text-xs font-medium tracking-wide text-white`}
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold-100" />
          {bannerSettings?.banner_link ? (
            <Link href={bannerSettings.banner_link} className="hover:underline">
              <span>
                {bannerSettings?.banner_text ||
                  'Complimentary Insured Shipping Across India on Orders Above ₹500'}
              </span>
            </Link>
          ) : (
            <span>
              {bannerSettings?.banner_text ||
                'Complimentary Insured Shipping Across India on Orders Above ₹500'}
            </span>
          )}
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold-100" />
        </div>
      )}

      {/* Main Navbar */}
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-1 sm:h-20 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-gold-600 focus:outline-none lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-gold-300/40 bg-gold-50/50 shadow-sm sm:h-10 sm:w-10">
                <Image
                  src="/logo.png"
                  alt="Ruhvi Jewels"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold leading-none tracking-widest text-gold-500 sm:text-xl">
                  RUHVI JEWELS
                </span>
                <span className="font-sans text-[9px] font-medium uppercase tracking-[0.2em] text-gold-700/80">
                  Fine Jewellery
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="mx-8 hidden max-w-md flex-1 lg:flex">
            <SearchBar />
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Wallet Integration */}
            <Link
              href="/account/wallet"
              className="flex items-center gap-1.5 rounded-full border border-gold-300/40 bg-gold-50/50 px-2.5 py-1 text-slate-700 shadow-sm transition-all hover:bg-gold-100/40 hover:text-gold-700 sm:gap-2 sm:px-3.5 sm:py-1.5"
              title="Wallet Balance"
            >
              <Wallet className="sm:h-4.5 sm:w-4.5 h-4 w-4 text-gold-600" />
              <span className="font-mono text-[10px] font-bold text-gold-800 sm:text-xs">
                ₹
                {user
                  ? (profile?.wallet_balance ?? 0).toLocaleString('en-IN')
                  : 0}
              </span>
            </Link>

            {/* Cart Link */}
            <Link
              href="/cart"
              className="relative p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
              title="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-600 text-[9px] font-bold text-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Profile Dropdown */}
            <div className="relative">
              {user ? (
                <div className="group relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center focus:outline-none"
                    title="Account Menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-300/50 bg-gold-50/80 font-serif text-xs font-bold text-gold-700 shadow-sm transition-colors hover:bg-gold-100/50">
                      {userInitials}
                    </div>
                  </button>

                  <div className="pointer-events-none absolute right-0 top-full z-50 w-56 pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                    <div className="rounded-2xl border border-gold-200/50 bg-white p-2.5 text-xs shadow-xl backdrop-blur-md">
                      <div className="mb-2 rounded-xl bg-gold-50/40 px-3 py-2 text-stone-800">
                        <p className="truncate font-bold">{userDisplayName}</p>
                        <p className="truncate font-mono text-[9px] text-stone-500">
                          {user.email}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <Link
                          href="/account"
                          className="flex items-center space-x-2 rounded-lg px-2.5 py-1.5 font-medium text-stone-600 transition hover:bg-gold-50/50 hover:text-gold-700"
                        >
                          <User className="h-4 w-4 text-gold-600" />
                          <span>My Account</span>
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center space-x-2 rounded-lg px-2.5 py-1.5 font-medium text-stone-600 transition hover:bg-gold-50/50 hover:text-gold-700"
                        >
                          <Package className="h-4 w-4 text-gold-600" />
                          <span>My Orders</span>
                        </Link>
                      </div>

                      <div className="mt-2 border-t border-gold-100/60 pt-2">
                        <button
                          onClick={signOut}
                          className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
                  title="Sign In"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 lg:hidden">
          <SearchBar />
        </div>

        {/* Desktop Category & Collection Navigation */}
        <nav className="hidden items-center justify-center space-x-8 border-t border-gold-200/70 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-700 lg:flex">
          <Link
            href="/products"
            className="font-semibold transition-colors hover:text-gold-600"
          >
            All Products
          </Link>

          {/* Collections Dropdown */}
          <div className="group relative">
            <button className="flex items-center space-x-1 py-2 font-bold text-charcoal-900 transition-colors hover:text-gold-600 focus:outline-none">
              <Sparkles className="h-3.5 w-3.5 text-gold-500" />
              <span>Collections</span>
              <ChevronDown className="h-3.5 w-3.5 text-gold-500" />
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 w-56 pt-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="rounded-xl border border-gold-200 bg-white py-2 shadow-xl">
                <div className="mb-1 border-b border-gold-200/70 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-700">
                  Curated Collections
                </div>
                <Link
                  href="/collections/for-her"
                  className="hover:text-gold-900 block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50"
                >
                  Gifts For Her
                </Link>
                <Link
                  href="/collections/under-15000"
                  className="hover:text-gold-900 block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50"
                >
                  Gifts Under ₹15,000
                </Link>
                <Link
                  href="/collections/anniversary"
                  className="hover:text-gold-900 block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50"
                >
                  Anniversary Specials
                </Link>
                <Link
                  href="/collections/bridal"
                  className="hover:text-gold-900 block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50"
                >
                  Royal Bridal Collection
                </Link>
              </div>
            </div>
          </div>

          {INITIAL_CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="transition-colors hover:text-gold-600"
            >
              {cat.name}
            </Link>
          ))}
          {/* Dropdown for more */}
          <div className="group relative">
            <button className="flex items-center space-x-1 py-2 transition-colors hover:text-gold-600 focus:outline-none">
              <span>More Categories</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 w-48 pt-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="rounded-lg border border-gold-200 bg-white py-2 shadow-lg">
                {INITIAL_CATEGORIES.slice(6).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="hover:text-gold-900 block px-4 py-2 text-xs text-slate-700 hover:bg-gold-50"
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
        <div className="space-y-4 border-t border-gold-200/70 bg-champagne-50 px-4 py-4 lg:hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Categories
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gold-900 rounded border border-gold-300/60 bg-gold-100 p-3 font-medium"
            >
              All Jewellery
            </Link>
            {INITIAL_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded p-3 hover:bg-gold-50"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-gold-200/70 pt-4">
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded border border-gold-300/60 bg-gold-100 p-3 text-center text-sm font-semibold text-charcoal-900"
            >
              Help & Support
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
