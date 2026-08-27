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
import { useTaxonomy } from '@/hooks/useTaxonomy';
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
  const { categories } = useTaxonomy();

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
      <header
        className="sticky top-0 z-50 w-full border-b border-[var(--line)] transition-shadow duration-300"
        style={{ background: 'var(--cream)' }}
      >
        <div className="nav-inner">
          {/* Left Navigation Actions & Mobile Menu */}
          <div className="nav-left">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="icon-btn burger-btn lg:hidden"
              aria-label="Menu"
            >
              <div className="burger">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
            <div className="hidden items-center space-x-1 lg:flex">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="icon-btn burger-btn"
                aria-label="Menu"
              >
                <div className="burger">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
            {/* Search Bar - hidden on mobile, part of nav-left on desktop */}
            <div className="ml-4 hidden lg:block">
              <SearchBar />
            </div>
          </div>

          {/* Center Brand */}
          <Link href="/" className="brand">
            <span className="spark">✦</span>
            <div className="word">RUHVI</div>
            <div className="sub">FINE JEWELS</div>
          </Link>

          {/* Navigation Actions */}
          <div className="nav-right">
            {/* Wallet Integration */}
            <Link
              href="/account/wallet"
              className="flex items-center gap-1.5 rounded-full border border-[var(--gold-pale)] bg-white/50 px-2.5 py-1 text-[var(--ink)] shadow-sm transition-all hover:bg-[var(--cream-deep)] sm:gap-2 sm:px-3.5 sm:py-1.5"
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

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              className="relative p-1.5 text-slate-700 transition-colors hover:text-gold-600 sm:p-2"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-600 text-[9px] font-bold text-white shadow-sm">
                  {wishlistCount}
                </span>
              )}
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

          {categories.slice(0, 6).map((cat) => (
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
                {categories.slice(6).map((cat) => (
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
      </header>

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
                {categories.map((cat) => (
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
