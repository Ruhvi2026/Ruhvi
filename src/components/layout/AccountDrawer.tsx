'use client';

import React, { useEffect, useState, useRef } from 'react';
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

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

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
      name: 'Rewards & Coupons',
      href: '/offers',
      icon: Gift,
      badge: 3,
      badgeType: 'highlight',
      description: 'Special discounts & vouchers',
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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300 ${
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
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-full max-w-[360px] transform flex-col border-r border-gold-200/50 bg-[#FCFBF7] text-stone-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Close Bar */}
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <div className="flex items-center space-x-2">
            <span className="font-serif text-sm font-bold tracking-widest text-gold-600">
              RUHVI
            </span>
            <span className="text-[10px] uppercase tracking-widest text-stone-400">
              Account
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Header (Sticky Top) */}
        <div className="border-b border-gold-200/40 bg-gradient-to-b from-[#FAF8F2] to-[#FCFBF7] px-5 py-3">
          {user ? (
            <div className="flex items-center space-x-3.5">
              <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold-300/60 bg-gold-50 font-serif text-sm font-bold text-gold-700 shadow-sm">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <h3 className="truncate font-serif text-sm font-bold text-stone-900">
                    {userDisplayName}
                  </h3>
                  {profile?.email_verified && (
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                      title="Verified"
                    />
                  )}
                </div>
                <p className="truncate font-mono text-xs text-stone-500">
                  {userEmail}
                </p>
                <Link
                  href="/account"
                  className="group mt-1 inline-flex items-center text-[11px] font-semibold text-gold-600 transition hover:text-gold-700"
                >
                  <span>View Profile</span>
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <h3 className="font-serif text-sm font-bold text-stone-900">
                Welcome to Ruhvi
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">
                Sign in to manage your orders & wallet balance.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Link
                  href="/login"
                  className="flex-1 rounded-xl bg-gold-500 px-3 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-gold-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 rounded-xl border border-gold-300/60 bg-white px-3 py-2 text-center text-xs font-bold text-stone-800 transition hover:bg-gold-50/50"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 space-y-4 divide-y divide-stone-200/40 overflow-y-auto px-3 py-3">
          {/* Section: Account */}
          <div className="space-y-0.5">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
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
                      ? 'text-gold-900 shadow-xs bg-gold-100/60 font-semibold'
                      : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900'
                  }`}
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-gold-600'
                          : 'text-stone-500 group-hover:text-gold-600'
                      }`}
                    />
                    <span className="truncate text-xs">{item.name}</span>
                  </div>

                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                        item.badgeType === 'wallet'
                          ? 'border border-gold-200/50 bg-gold-100 font-mono text-gold-800'
                          : item.badgeType === 'highlight'
                            ? 'bg-amber-100 text-amber-800'
                            : item.badgeType === 'alert'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-stone-200/80 text-stone-700'
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
          <div className="space-y-0.5 pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
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
                      ? 'text-gold-900 bg-gold-100/60 font-semibold'
                      : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900'
                  }`}
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-gold-600'
                          : 'text-stone-500 group-hover:text-gold-600'
                      }`}
                    />
                    <span className="truncate text-xs">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Section: Preferences */}
          <div className="space-y-0.5 pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Preferences
            </p>
            <Link
              href="/account/settings"
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                pathname === '/account/settings'
                  ? 'text-gold-900 bg-gold-100/60 font-semibold'
                  : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900'
              }`}
            >
              <div className="flex min-w-0 items-center space-x-3">
                <Settings
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    pathname === '/account/settings'
                      ? 'text-gold-600'
                      : 'text-stone-500 group-hover:text-gold-600'
                  }`}
                />
                <span className="truncate text-xs">Settings</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600" />
            </Link>
          </div>
        </div>

        {/* Sticky Bottom Area: Logout */}
        {user && (
          <div className="border-t border-gold-200/40 bg-[#FAF8F2] p-3">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="shadow-2xs flex w-full items-center justify-center space-x-2 rounded-xl border border-rose-200/50 bg-rose-50/70 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100/80"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="z-60 backdrop-blur-xs animate-in fade-in fixed inset-0 flex items-center justify-center bg-stone-900/50 p-4 duration-150">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  Confirm Sign Out
                </h4>
                <p className="text-xs text-stone-500">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-stone-100 pt-2">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
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
    </>
  );
}
