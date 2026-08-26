'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  User,
  ShoppingBag,
  Heart,
  Wallet,
  Gift,
  Bell,
  MessageSquare,
  HelpCircle,
  Headphones,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Sparkles,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useNotifications } from '@/context/NotificationContext';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useNotifications();

  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLogoutModal) {
          setShowLogoutModal(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Focus the close button when drawer opens
      const timer = setTimeout(() => {
        const closeBtn = drawerRef.current?.querySelector<HTMLButtonElement>(
          'button[aria-label="Close menu"]'
        );
        closeBtn?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, showLogoutModal, onClose]);

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Focus trap: keep Tab/Shift+Tab within the drawer while open
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  const handleLogoutConfirm = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      setShowLogoutModal(false);
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const userDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Valued Guest';

  const userEmail = profile?.email || user?.email || 'guest@ruhvi.com';

  const userInitials = userDisplayName
    ? userDisplayName
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'R';

  const walletBalance = Number(profile?.wallet_balance || 0);

  const primaryNavItems = [
    {
      name: 'My Profile',
      href: '/account',
      icon: User,
      badge: null,
      description: 'Personal details & security',
    },
    {
      name: 'My Orders',
      href: '/orders',
      icon: ShoppingBag,
      badge: null,
      description: 'Track orders, invoices & returns',
    },
    {
      name: 'Wishlist',
      href: '/wishlist',
      icon: Heart,
      badge: wishlistCount > 0 ? wishlistCount : null,
      description: 'Saved jewellery pieces',
    },
    {
      name: 'Wallet',
      href: '/account/wallet',
      icon: Wallet,
      badge: `₹${walletBalance.toLocaleString('en-IN')}`,
      badgeType: 'wallet',
      description: 'Store credits & cashback',
    },
    {
      name: 'Rewards',
      href: '/account/coins',
      icon: Gift,
      badge:
        profile?.reward_coins !== undefined && profile.reward_coins !== null
          ? `${profile.reward_coins} Coins`
          : null,
      badgeType: 'highlight',
      description: 'View your reward coins & history',
    },
    {
      name: 'Notifications',
      href: '/account/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeType: 'alert',
      description: 'Order updates & offers',
    },
    {
      name: 'Support Tickets',
      href: '/account/support',
      icon: MessageSquare,
      badge: null,
      description: 'Track & raise issues',
    },
  ];

  const helpNavItems = [
    {
      name: 'Help Center',
      href: '/faq',
      icon: HelpCircle,
    },
    {
      name: 'Contact Us',
      href: '/contact',
      icon: Headphones,
    },
  ];

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-stone-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Left Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Account Navigation"
        className={`fixed inset-y-0 left-0 z-[9999] flex h-[100dvh] h-screen w-full max-w-[360px] transform flex-col border-r border-stone-200 bg-[#FCFBF7] text-stone-800 shadow-2xl transition-transform duration-300 ease-in-out dark:border-stone-800 dark:bg-[#141211] dark:text-stone-100 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Close Bar */}
        <div className="flex items-center justify-between border-b border-stone-200/60 bg-[#FAF8F2] px-5 pb-3.5 pt-4 dark:border-stone-800 dark:bg-[#1c1a19]">
          <div className="flex items-center space-x-2">
            <span className="font-serif text-base font-bold tracking-widest text-gold-600 dark:text-gold-400">
              RUHVI
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Account
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Header (Sticky Top) */}
        <div className="border-b border-stone-200/60 bg-gradient-to-b from-[#FAF8F2] to-[#FCFBF7] px-5 py-[18px] dark:border-stone-800 dark:from-[#1c1a19] dark:to-[#141211]">
          {user ? (
            <div className="flex items-center space-x-3.5">
              <div className="relative flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold-400/60 bg-gold-50 font-serif text-base font-bold text-gold-700 shadow-sm dark:border-gold-500/40 dark:bg-stone-800 dark:text-gold-400">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <h3 className="truncate font-serif text-base font-bold text-stone-900 dark:text-white">
                    {userDisplayName}
                  </h3>
                  {profile?.email_verified && (
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                      title="Verified"
                    />
                  )}
                </div>
                <p className="truncate font-mono text-xs text-stone-500 dark:text-stone-300">
                  {userEmail}
                </p>
                <Link
                  href="/account"
                  className="group mt-1 inline-flex items-center text-xs font-semibold text-gold-600 transition hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300"
                >
                  <span>View Profile</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                Welcome to Ruhvi
              </h3>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300">
                Sign in to manage your orders & wallet balance.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Link
                  href="/login"
                  className="flex-1 rounded-xl bg-gold-600 px-3 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-gold-700 dark:bg-gold-500 dark:text-stone-950 dark:hover:bg-gold-400"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-xs font-bold text-stone-800 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 space-y-5 divide-y divide-stone-200/60 overflow-y-auto bg-[#FCFBF7] px-3 py-4 dark:divide-stone-800/80 dark:bg-[#141211]">
          {/* Section: Account */}
          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Account
            </p>
            {primaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                    isActive
                      ? 'bg-gold-100 font-semibold text-gold-900 shadow-sm dark:bg-gold-500/20 dark:text-gold-300'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-200 dark:hover:bg-stone-800/80 dark:hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-gold-600 dark:text-gold-400'
                          : 'text-stone-500 group-hover:text-gold-600 dark:text-stone-400 dark:group-hover:text-gold-400'
                      }`}
                    />
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                  </div>

                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                        item.badgeType === 'wallet'
                          ? 'border border-gold-300/60 bg-gold-100 font-mono text-gold-800 dark:border-gold-500/40 dark:bg-gold-950/60 dark:text-gold-300'
                          : item.badgeType === 'highlight'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : item.badgeType === 'alert'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-stone-200/80 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Section: Help */}
          <div className="space-y-1 pt-4">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Help & Assistance
            </p>
            {helpNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                    isActive
                      ? 'bg-gold-100 font-semibold text-gold-900 dark:bg-gold-500/20 dark:text-gold-300'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-200 dark:hover:bg-stone-800/80 dark:hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-gold-600 dark:text-gold-400'
                          : 'text-stone-500 group-hover:text-gold-600 dark:text-stone-400 dark:group-hover:text-gold-400'
                      }`}
                    />
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Section: Preferences */}
          <div className="space-y-1 pt-4">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Preferences
            </p>
            <Link
              href="/account/settings"
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                pathname === '/account/settings'
                  ? 'bg-gold-100 font-semibold text-gold-900 dark:bg-gold-500/20 dark:text-gold-300'
                  : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-200 dark:hover:bg-stone-800/80 dark:hover:text-white'
              }`}
            >
              <div className="flex min-w-0 items-center space-x-3">
                <Settings
                  className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                    pathname === '/account/settings'
                      ? 'text-gold-600 dark:text-gold-400'
                      : 'text-stone-500 group-hover:text-gold-600 dark:text-stone-400 dark:group-hover:text-gold-400'
                  }`}
                />
                <span className="truncate text-sm font-medium">Settings</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600 dark:text-stone-400 dark:group-hover:text-stone-200" />
            </Link>
          </div>
        </div>

        {/* Sticky Bottom Area: Logout */}
        {user && (
          <div className="border-t border-stone-200/60 bg-[#FAF8F2] p-3 dark:border-stone-800 dark:bg-[#1c1a19]">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-rose-200/50 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100/80 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="animate-in fade-in fixed inset-0 z-[10000] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm duration-150">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-white">
                  Confirm Sign Out
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-stone-100 pt-2 dark:border-stone-800">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogoutConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loggingOut ? 'Signing out...' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
