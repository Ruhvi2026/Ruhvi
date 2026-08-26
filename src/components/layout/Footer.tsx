'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  Gem,
  Instagram,
  Facebook,
} from 'lucide-react';

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/ruhvi.in',
    icon: Instagram,
  },
  { label: 'Facebook', href: 'https://facebook.com/ruhvi.in', icon: Facebook },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || status === 'loading') return;

    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Thanks for subscribing to Ruhvi!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <footer className="border-t border-gold-800/60 bg-charcoal-900 pb-8 pt-12 text-cream-200">
      {/* Brand Reassurance Bar */}
      <div className="mx-auto mb-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 rounded-2xl border border-gold-700/40 bg-charcoal-800/80 p-6 md:grid-cols-4">
          <div className="flex items-center space-x-3">
            <Award className="h-8 w-8 flex-shrink-0 text-gold-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cream-50">
                22K Gold Plated
              </h4>
              <p className="text-[11px] text-cream-200/60">
                Anti-Tarnish & Water Resistant
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Truck className="h-8 w-8 flex-shrink-0 text-gold-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cream-50">
                Insured Shipping
              </h4>
              <p className="text-[11px] text-cream-200/60">
                Tamper-proof transit packaging
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <RotateCcw className="h-8 w-8 flex-shrink-0 text-gold-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cream-50">
                Easy Returns
              </h4>
              <p className="text-[11px] text-cream-200/60">
                7-day hassle-free return policy
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ShieldCheck className="h-8 w-8 flex-shrink-0 text-gold-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cream-50">
                6-Month Color Guarantee
              </h4>
              <p className="text-[11px] text-cream-200/60">
                On all gold plated pieces
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Program Banner */}
      <div className="mx-auto mb-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="gold-gradient-bg relative flex flex-col items-center justify-between overflow-hidden rounded-3xl p-8 shadow-2xl sm:p-12 md:flex-row">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-gold-100/30 blur-3xl"></div>

          <div className="relative z-10 mb-8 md:mb-0 md:w-1/2">
            <h3 className="mb-3 font-serif text-3xl font-bold text-white">
              Refer a Friend
            </h3>
            <p className="text-sm text-gold-100/90">
              Invite your friends to Ruhvi. You get 500 Reward Coins (₹50) and
              your friend gets ₹100 in Wallet balance to shop.
            </p>
          </div>

          <div className="relative z-10 flex w-full max-w-md justify-end md:w-1/2">
            <Link
              href="/referral"
              className="rounded-xl bg-cream-50 px-8 py-4 text-sm font-bold uppercase tracking-wider text-gold-800 shadow-lg transition-colors hover:bg-white"
            >
              Start Referring
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 border-b border-gold-800/50 px-4 pb-12 sm:px-6 md:grid-cols-5 lg:px-8">
        <div className="md:col-span-2">
          <div className="mb-4 flex items-center space-x-3">
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-gold-500/40 bg-charcoal-800 shadow-md">
              <Image
                src="/logo.png"
                alt="Ruhvi Jewels"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-serif text-xl font-bold uppercase tracking-[0.2em] text-gold-400">
              RUHVI JEWELS
            </h3>
          </div>
          <p className="mb-6 max-w-xs text-xs leading-relaxed text-cream-200/60">
            Curating timeless elegance with modern Indian heritage
            craftsmanship. Exquisite 22K gold-plated jewellery designed for
            life&apos;s special moments.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-gold-300">
            <Gem className="h-3.5 w-3.5 text-gold-400" /> support@ruhvi.in
          </p>

          {/* Follow Us */}
          <div className="mb-6 mt-6">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
              Follow Us
            </h4>
            <div className="flex items-center space-x-3">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-700/40 bg-charcoal-800 text-gold-300 transition-colors hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-200"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter Signup */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
              Stay in the Loop
            </h4>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Email address"
                className="w-full min-w-0 flex-1 rounded-lg border border-gold-700/40 bg-charcoal-800 px-3 py-2 text-xs text-cream-100 placeholder-cream-200/40 outline-none transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400/50"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex-shrink-0 rounded-lg bg-gold-500 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-charcoal-900 transition hover:bg-gold-400 disabled:opacity-60"
              >
                {status === 'loading' ? 'Joining…' : 'Join'}
              </button>
            </form>
            {status === 'success' && (
              <p
                role="status"
                className="mt-2 text-xs font-medium text-gold-300"
              >
                {message}
              </p>
            )}
            {status === 'error' && (
              <p
                role="alert"
                className="mt-2 text-xs font-medium text-rose-300"
              >
                {message}
              </p>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
            Shop
          </h4>
          <ul className="space-y-3 text-xs text-cream-200/80">
            <li>
              <Link
                href="/products"
                className="transition-colors hover:text-gold-400"
              >
                New Arrivals
              </Link>
            </li>
            <li>
              <Link
                href="/collections/bestsellers"
                className="transition-colors hover:text-gold-400"
              >
                Best Sellers
              </Link>
            </li>
            <li>
              <Link
                href="/products"
                className="transition-colors hover:text-gold-400"
              >
                All Categories
              </Link>
            </li>
            <li>
              <Link
                href="/collections/for-her"
                className="transition-colors hover:text-gold-400"
              >
                Gifts for Her
              </Link>
            </li>
          </ul>

          <h4 className="mb-5 mt-8 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
            About
          </h4>
          <ul className="space-y-3 text-xs text-cream-200/80">
            <li>
              <Link
                href="/about"
                className="transition-colors hover:text-gold-400"
              >
                Our Story
              </Link>
            </li>
            <li>
              <Link
                href="/about#philosophy"
                className="transition-colors hover:text-gold-400"
              >
                Our Philosophy
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="transition-colors hover:text-gold-400"
              >
                Editorial Blog
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
            Help
          </h4>
          <ul className="space-y-3 text-xs text-cream-200/80">
            <li>
              <Link
                href="/contact"
                className="transition-colors hover:text-gold-400"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="/shipping-policy"
                className="transition-colors hover:text-gold-400"
              >
                Shipping & Delivery
              </Link>
            </li>
            <li>
              <Link
                href="/return-policy"
                className="transition-colors hover:text-gold-400"
              >
                Returns & Exchanges
              </Link>
            </li>
            <li>
              <Link
                href="/faq"
                className="transition-colors hover:text-gold-400"
              >
                FAQ & Help Center
              </Link>
            </li>
            <li>
              <Link
                href="/jewelry-care"
                className="transition-colors hover:text-gold-400"
              >
                Jewelry Care
              </Link>
            </li>
            <li>
              <Link
                href="/size-guide"
                className="transition-colors hover:text-gold-400"
              >
                Size Guide
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
            Account
          </h4>
          <ul className="space-y-3 text-xs text-cream-200/80">
            <li>
              <Link
                href="/account"
                className="transition-colors hover:text-gold-400"
              >
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/orders"
                className="transition-colors hover:text-gold-400"
              >
                My Orders
              </Link>
            </li>
            <li>
              <Link
                href="/wishlist"
                className="transition-colors hover:text-gold-400"
              >
                Wishlist
              </Link>
            </li>
            <li>
              <Link
                href="/wallet"
                className="transition-colors hover:text-gold-400"
              >
                Wallet Balance
              </Link>
            </li>
          </ul>

          <h4 className="mb-5 mt-8 text-xs font-bold uppercase tracking-[0.15em] text-gold-500">
            Legal
          </h4>
          <ul className="space-y-3 text-xs text-cream-200/80">
            <li>
              <Link
                href="/privacy-policy"
                className="transition-colors hover:text-gold-400"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms-and-conditions"
                className="transition-colors hover:text-gold-400"
              >
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link
                href="/data-deletion"
                className="transition-colors hover:text-gold-400"
              >
                Data Deletion Instructions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-4 text-center text-xs text-cream-200/40 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Ruhvi Jewels. All rights reserved.
      </div>
    </footer>
  );
}
