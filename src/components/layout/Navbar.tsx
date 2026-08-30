'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Heart,
  User,
  X,
  Wallet,
  Search,
  Headphones,
} from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
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
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          if (window.scrollY <= 20) {
            setIsSearchExpanded(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
    <>
      <header
        className={`bg-[var(--cream)]/90 sticky top-0 z-50 w-full shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 ${isScrolled && !isSearchExpanded ? 'border-b border-gold-200/40 py-0' : 'border-b border-gold-200/40'}`}
      >
        <div
          className={`nav-inner transition-[padding,min-height] duration-300 ${isScrolled && !isSearchExpanded ? 'min-h-[32px] py-0' : 'py-2'}`}
        >
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
            {/* Brand Logo - Left Aligned */}
            <Link
              href="/"
              className="group ml-1 flex items-center justify-center transition-transform duration-500 hover:scale-[1.02] sm:ml-4"
            >
              <Image
                src="/logo.png"
                alt="Ruhvi Logo"
                width={72}
                height={72}
                className={`h-16 w-auto origin-left object-contain transition-transform duration-300 group-hover:opacity-90 sm:h-20 ${isScrolled && !isSearchExpanded ? 'scale-[0.625]' : 'scale-100'}`}
                priority
              />
            </Link>

            {/* Expand Search Button (Visible only when scrolled) - Moved to Left */}
            {isScrolled && (
              <button
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                className="text-ink-soft relative ml-1 p-1 transition-colors duration-300 hover:text-gold-600 sm:ml-3 sm:p-2"
                title="Search"
              >
                <Search
                  className="h-5 w-5 transition-transform duration-300 hover:scale-105"
                  strokeWidth={1.25}
                />
              </button>
            )}
          </div>

          {/* Center Brand Text */}
          <Link
            href="/"
            className={`brand group flex origin-center flex-col items-center justify-center transition-transform duration-300 ${isScrolled && !isSearchExpanded ? 'scale-90' : 'scale-100'} hover:scale-[1.02]`}
          >
            <div className="word text-gold-deep text-lg font-light tracking-[0.28em] transition-colors duration-300 group-hover:text-gold-600 sm:text-2xl">
              RUHVI
            </div>
            <div className="sub text-ink-soft mt-1 hidden text-[7px] tracking-[0.45em] transition-colors duration-300 sm:block sm:text-[8px]">
              FINE JEWELS
            </div>
          </Link>

          {/* Navigation Actions */}
          <div className="nav-right">
            {/* Wallet Integration — only for logged-in users */}
            {user && (
              <Link
                href="/account/wallet"
                className="text-ink group flex items-center gap-1.5 rounded-full border border-gold-200/60 bg-gradient-to-r from-gold-50/60 to-transparent px-2 py-1 shadow-sm transition-all duration-300 hover:border-gold-300/80 hover:shadow-[0_2px_12px_-3px_rgba(214,179,106,0.25)] sm:gap-2 sm:px-4 sm:py-1.5"
                title="Wallet Balance"
              >
                <Wallet
                  className="h-4 w-4 text-gold-600 transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={1.5}
                />
                <span className="hidden font-mono text-[10.5px] font-medium tracking-wide text-gold-800 sm:inline-block sm:text-xs">
                  ₹{(profile?.wallet_balance ?? 0).toLocaleString('en-IN')}
                </span>
              </Link>
            )}

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              className="text-ink-soft relative p-1 transition-colors duration-300 hover:text-gold-600 sm:p-2"
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ''}`}
              title="Wishlist"
            >
              <Heart
                className="h-5 w-5 transition-transform duration-300 hover:scale-105"
                strokeWidth={1.25}
              />
              {wishlistCount > 0 && (
                <span
                  className="absolute right-0 top-0 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-gold-600 font-mono text-[9px] font-medium text-white shadow-sm sm:right-0.5 sm:top-0.5"
                  aria-hidden="true"
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              href="/cart"
              className="text-ink-soft relative p-1 transition-colors duration-300 hover:text-gold-600 sm:p-2"
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              title="Cart"
            >
              <ShoppingBag
                className="h-5 w-5 transition-transform duration-300 hover:scale-105"
                strokeWidth={1.25}
              />
              {cartCount > 0 && (
                <span
                  className="absolute right-0 top-0 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-gold-600 font-mono text-[9px] font-medium text-white shadow-sm sm:right-0.5 sm:top-0.5"
                  aria-hidden="true"
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Support Link — visible on all screen sizes */}
            <Link
              href={user ? '/account/support' : '/support-status'}
              className="text-ink-soft p-1 transition-colors duration-300 hover:text-gold-600 sm:p-2"
              title="Support"
            >
              <Headphones
                className="h-5 w-5 transition-transform duration-300 hover:scale-105"
                strokeWidth={1.25}
              />
            </Link>

            {/* User Profile Direct Link */}
            <div className="relative">
              {user ? (
                <Link
                  href="/account"
                  className="group flex items-center focus:outline-none"
                  title="My Profile"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gold-200 bg-gold-50/60 font-serif text-[10px] font-semibold text-gold-700 shadow-sm transition-all duration-300 group-hover:border-gold-300 group-hover:bg-gold-100/50 group-hover:shadow-md sm:h-[34px] sm:w-[34px] sm:text-[11px]">
                    {userInitials}
                  </div>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-ink-soft p-1 transition-colors duration-300 hover:text-gold-600 sm:p-2"
                  title="Login"
                >
                  <User
                    className="h-5 w-5 transition-transform duration-300 hover:scale-105"
                    strokeWidth={1.25}
                  />
                </Link>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle className="hidden sm:flex" />
          </div>
        </div>

        {/* Account Side Drawer Component */}
        <AccountDrawer
          isOpen={accountDrawerOpen}
          onClose={() => setAccountDrawerOpen(false)}
        />

        {/* Unified Search Bar Row */}
        <div
          className={`flex justify-center overflow-hidden border-t border-gold-200/30 bg-white/40 px-4 backdrop-blur-md transition-all duration-300 dark:border-stone-800/50 dark:bg-[#1c1a19]/40 ${isScrolled && !isSearchExpanded ? 'h-0 border-transparent py-0 opacity-0' : 'h-auto py-2.5 opacity-100'}`}
        >
          <div className="w-full max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </header>

      {/* Mobile Category Menu Drawer */}
      <div
        className={`fixed inset-0 z-50 ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
                Ruhvi Account
              </p>
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/orders"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    Orders
                  </Link>
                  <Link
                    href="/wishlist"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    Wishlist
                  </Link>
                  <Link
                    href="/account/wallet"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    Wallet
                  </Link>
                  <Link
                    href="/account/support"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    Support Tickets
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="space-y-1 border-t border-gold-200/70 pt-4">
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Shop by Category
                </p>
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="space-y-1 border-t border-gold-200/70 pt-4">
              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Explore &amp; Support
              </p>
              <Link
                href="/"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Shop All
              </Link>
              <Link
                href="/faq"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Help &amp; Assistant
              </Link>
              <Link
                href="/contact"
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Contact Us
              </Link>
              <Link
                href={user ? '/account/support' : '/support-status'}
                className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition hover:bg-gold-50 hover:text-gold-800"
              >
                Track Support Ticket
              </Link>
            </div>

            {/* Theme Toggle in mobile drawer */}
            <div className="border-t border-gold-200/70 pt-4">
              <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Appearance
              </p>
              <div className="px-3">
                <ThemeToggle variant="full" />
              </div>
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
}
