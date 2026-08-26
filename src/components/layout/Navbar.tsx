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
  Sun,
  Moon,
} from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { INITIAL_CATEGORIES } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { getStoreSettings, StoreSettings } from '@/app/admin/actions/settings';
import { AccountDrawer } from '@/components/layout/AccountDrawer';

export function Navbar() {
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useNotifications();
  const { user, profile, signOut } = useAuth();

  const [bannerSettings, setBannerSettings] = useState<StoreSettings | null>(
    null
  );
  const [isDark, setIsDark] = useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme') || 'system';
    const dark =
      stored === 'dark' ||
      (stored === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme') || 'system';
    const activeTheme: 'light' | 'dark' =
      stored === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : stored === 'dark'
          ? 'dark'
          : 'light';
    const next: 'light' | 'dark' = activeTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(next);
    setIsDark(next === 'dark');
  };

  React.useEffect(() => {
    async function fetchBanner() {
      const data = await getStoreSettings();
      if (data) setBannerSettings(data);
    }
    fetchBanner();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
          {/* Brand Logo & Left Account Menu Trigger */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1 text-slate-700 transition hover:bg-gold-50/50 hover:text-gold-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 lg:hidden"
              title="Browse categories"
              aria-label="Browse categories"
              aria-expanded={mobileMenuOpen}
              aria-haspopup="dialog"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
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

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

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

            {/* User Profile Side Drawer Trigger */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setAccountDrawerOpen(true)}
                  className="flex items-center focus:outline-none"
                  title="Account Menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-300/50 bg-gold-50/80 font-serif text-xs font-bold text-gold-700 shadow-sm transition-colors hover:bg-gold-100/50">
                    {userInitials}
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setAccountDrawerOpen(true)}
                  className="p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
                  title="Account Menu"
                >
                  <User className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Account Side Drawer Component */}
        <AccountDrawer
          isOpen={accountDrawerOpen}
          onClose={() => setAccountDrawerOpen(false)}
        />

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
            <button
              className="flex items-center space-x-1 rounded py-2 font-bold text-charcoal-900 transition-colors hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              aria-expanded="false"
              aria-haspopup="menu"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-500" />
              <span>Collections</span>
              <ChevronDown className="h-3.5 w-3.5 text-gold-500" />
            </button>
            <div
              role="menu"
              aria-label="Collections"
              className="pointer-events-none absolute left-0 top-full z-50 w-56 pt-1 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
            >
              <div className="rounded-xl border border-gold-200 bg-white py-2 shadow-xl">
                <div className="mb-1 border-b border-gold-200/70 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-700">
                  Curated Collections
                </div>
                <Link
                  href="/collections/for-her"
                  role="menuitem"
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
                >
                  Gifts For Her
                </Link>
                <Link
                  href="/collections/under-15000"
                  role="menuitem"
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
                >
                  Gifts Under ₹15,000
                </Link>
                <Link
                  href="/collections/anniversary"
                  role="menuitem"
                  className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-gold-50 hover:text-gold-900"
                >
                  Anniversary Specials
                </Link>
                <Link
                  href="/collections/bridal"
                  role="menuitem"
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
            <button
              className="flex items-center space-x-1 rounded py-2 transition-colors hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              aria-expanded="false"
              aria-haspopup="menu"
            >
              <span>More Categories</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div
              role="menu"
              aria-label="More categories"
              className="pointer-events-none absolute left-0 top-full z-50 w-48 pt-1 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
            >
              <div className="rounded-lg border border-gold-200 bg-white py-2 shadow-lg">
                {INITIAL_CATEGORIES.slice(6).map((cat) => (
                  <Link
                    key={cat.id}
                    role="menuitem"
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

      {/* Mobile Category Menu Drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-stone-950/60 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Categories"
          className={`absolute inset-y-0 left-0 flex w-full max-w-xs transform flex-col bg-champagne-50 shadow-2xl transition-transform duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gold-200/70 bg-gold-50/50 px-4 py-3.5">
            <span className="font-serif text-base font-bold tracking-widest text-charcoal-900">
              RUHVI
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full p-1.5 text-slate-700 transition hover:bg-gold-100/60 hover:text-gold-700"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <div className="space-y-1">
              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Shop
              </p>
              <Link
                href="/products"
                className="block rounded-xl border border-gold-300/60 bg-gold-100 px-4 py-3 text-sm font-semibold text-gold-900"
              >
                All Jewellery
              </Link>
              <div className="grid grid-cols-1 gap-1 pt-1">
                {INITIAL_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-gold-200/70 pt-4">
              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Collections
              </p>
              <Link
                href="/collections/for-her"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Gifts For Her
              </Link>
              <Link
                href="/collections/under-15000"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Gifts Under ₹15,000
              </Link>
              <Link
                href="/collections/anniversary"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Anniversary Specials
              </Link>
              <Link
                href="/collections/bridal"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Royal Bridal Collection
              </Link>
            </div>

            <div className="space-y-1 border-t border-gold-200/70 pt-4">
              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Support
              </p>
              <Link
                href="/faq"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Help & FAQ
              </Link>
              <Link
                href="/contact"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Contact Us
              </Link>
            </div>
          </nav>
        </aside>
      </div>
    </header>
  );
}
