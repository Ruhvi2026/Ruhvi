'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
    <header className="sticky top-0 z-40 border-b border-gold-200/80 bg-cream-50 shadow-sm transition-all">
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
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2">
              <span className="font-serif text-xl font-bold tracking-widest text-gold-500">
                RUHVI JEWELS
              </span>
              <span className="hidden rounded border border-gold-300/60 bg-gold-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-gold-800 sm:inline-block">
                Jewellery
              </span>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="mx-8 hidden max-w-md flex-1 lg:flex">
            <SearchBar />
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-1 sm:space-x-6">
            <Link
              href="/orders"
              className="hidden text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-gold-600 sm:inline-flex"
            >
              My Orders
            </Link>

            <Link
              href="/account/notifications"
              className="relative p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="animate-scale-in absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-600 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/wishlist"
              className="relative p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="animate-scale-in absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
              title="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="animate-scale-in absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-charcoal-900 text-[10px] font-bold text-gold-200">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Profile Navigation Icon / Dropdown */}
            <div className="relative">
              {user ? (
                <div className="group relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-1.5 p-1 text-slate-700 transition-colors hover:text-charcoal-900 focus:outline-none"
                    title="Account Menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-400/50 bg-charcoal-900 font-serif text-xs font-bold text-gold-300 shadow-sm">
                      {userInitials}
                    </div>
                  </button>

                  <div className="pointer-events-none absolute right-0 top-full z-50 w-60 pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                    <div className="space-y-2 rounded-2xl border border-gold-200 bg-white p-3 text-xs shadow-xl">
                      <div className="space-y-0.5 rounded-xl border border-gold-200/70 bg-cream-50 px-3 py-2">
                        <p className="truncate font-bold text-stone-900">
                          {userDisplayName}
                        </p>
                        <p className="truncate font-mono text-[10px] text-stone-500">
                          {user.email}
                        </p>
                        <span className="inline-flex items-center gap-1 pt-0.5 text-[9px] font-semibold text-emerald-700">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />{' '}
                          Email Authenticated
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <Link
                          href="/account"
                          className="flex items-center space-x-2 rounded-xl px-3 py-2 font-medium text-stone-700 hover:bg-gold-50 hover:text-charcoal-900"
                        >
                          <User className="h-4 w-4 text-gold-700" />
                          <span>My Account Profile</span>
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center space-x-2 rounded-xl px-3 py-2 font-medium text-stone-700 hover:bg-gold-50 hover:text-charcoal-900"
                        >
                          <Package className="h-4 w-4 text-gold-700" />
                          <span>My Purchases</span>
                        </Link>
                      </div>

                      <div className="border-t border-stone-100 pt-2">
                        <button
                          onClick={signOut}
                          className="flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
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
                  className="flex items-center gap-1 p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
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
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
                >
                  Gifts For Her
                </Link>
                <Link
                  href="/collections/under-15000"
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
                >
                  Gifts Under ₹15,000
                </Link>
                <Link
                  href="/collections/anniversary"
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
                >
                  Anniversary Specials
                </Link>
                <Link
                  href="/collections/bridal"
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
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
                    className="block px-4 py-2 text-xs text-slate-700 hover:bg-gold-50 hover:text-gold-900"
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
        <div className="space-y-4 border-t border-gold-200/70 bg-cream-50 px-4 py-4 lg:hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Categories
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded border border-gold-300/60 bg-gold-100 p-3 font-medium text-gold-900"
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
