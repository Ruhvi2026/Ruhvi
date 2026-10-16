'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Crown,
  Sparkles,
  Truck,
  ShieldCheck,
  Gift,
  Lock,
  Check,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Clock,
  Coins,
  Wallet,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  HelpCircle,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RuhviPriveHubPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activatingSource, setActivatingSource] = useState<string | null>(null);

  // Birthday Voucher State
  const [voucherData, setVoucherData] = useState<any | null>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Birthday voucher code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // VIP Math
  const isVip = Boolean(profile?.is_vip);
  const coinsBalance = Number(profile?.reward_coins) || 0;
  const walletBalance = Number(profile?.wallet_balance) || 0;

  useEffect(() => {
    if (isVip && user) {
      setLoadingVoucher(true);
      fetch('/api/vip/birthday-voucher')
        .then((res) => res.json())
        .then((data) => {
          if (data?.voucher) {
            setVoucherData(data.voucher);
          }
        })
        .catch((err) => console.error('Failed to load birthday voucher:', err))
        .finally(() => setLoadingVoucher(false));
    }
  }, [isVip, user]);

  let daysRemaining = 0;
  let formattedExpiry = '';
  if (isVip && profile?.vip_expires_at) {
    const expiry = new Date(profile.vip_expires_at);
    daysRemaining = Math.max(
      0,
      Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    formattedExpiry = expiry.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  const isExpiringSoon = isVip && daysRemaining <= 30;

  const formatDobDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(
          Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        );
        return d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleActivate = async (
    paymentType: 'coins' | 'wallet' | 'gateway'
  ) => {
    if (!user) {
      toast.error('Please sign in to join Ruhvi Privé.');
      router.push('/login?redirectTo=/account/prive');
      return;
    }

    if (paymentType === 'coins' && coinsBalance < 1500) {
      toast.error(
        `Insufficient reward coins. You need 1,500 coins (Current: ${coinsBalance}).`
      );
      return;
    }

    if (paymentType === 'wallet' && walletBalance < 500) {
      toast.error(
        `Insufficient wallet balance. You need ₹500 (Current: ₹${walletBalance}).`
      );
      return;
    }

    try {
      setIsActivating(true);
      setActivatingSource(paymentType);

      const res = await fetch('/api/vip/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_type: paymentType }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to activate VIP membership.');
      }

      toast.success(
        isVip
          ? '👑 Ruhvi Privé membership renewed successfully for 1 Year!'
          : '👑 Welcome to Ruhvi Privé! 1-Year VIP Status Activated.'
      );

      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      console.error('VIP Activation error:', err);
      toast.error(err.message || 'Failed to activate VIP membership.');
    } finally {
      setIsActivating(false);
      setActivatingSource(null);
    }
  };

  const faqs = [
    {
      q: 'What is Ruhvi Privé?',
      a: 'Ruhvi Privé is our premium annual membership program designed for jewellery enthusiasts. Privé members enjoy unconditional ₹0 express delivery on any order size, zero Cash-on-Delivery processing fees, 2X reward coins (20% cashback value), an annual ₹500 birthday shopping gift, and 24-hour early access to limited collections.',
    },
    {
      q: 'How does the ₹0 Free Express Delivery work?',
      a: 'As a Privé member, you receive free express shipping on 100% of your orders, regardless of the order total. Even if you purchase a single ₹250 jewellery accessory, shipping is completely ₹0 (standard non-member free shipping requires a ₹1,000 threshold).',
    },
    {
      q: 'How does the annual ₹500 Birthday Privilege Voucher work?',
      a: 'As an active Privé member with a locked Date of Birth, you receive a ₹500 birthday voucher valid for 1 full year (365 days) from issuance. It requires a minimum spend of ₹1,000 on physical handcrafted jewellery products (meaning you pay at least ₹500 on a ₹1,000 cart). To protect store margins, the voucher is single-use, non-stackable with other coupon codes or promotions, and excludes delivery charges and VIP passes.',
    },
    {
      q: 'How does membership renewal work?',
      a: 'Your membership is valid for 365 days. When your membership has 30 days or fewer remaining, a renewal prompt will appear on your profile and Privé hub. You can renew seamlessly using either 1,500 Reward Coins or ₹500 (via Wallet or Gateway). Renewing extends your validity by an additional full year without interrupting your benefits.',
    },
    {
      q: 'Can I pay for the pass using my Ruhvi Wallet?',
      a: 'Yes, you can use ₹500 from your Ruhvi Wallet balance to purchase or renew your Privé pass. Note that membership fees do not generate cashback; cashback is strictly awarded on handcrafted jewellery and physical orders.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900">
      {/* Top Navigation Bar */}
      <div className="border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/account"
            className="inline-flex items-center text-xs font-semibold text-stone-600 transition hover:text-amber-950"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span>Back to Account</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="font-serif text-sm font-bold tracking-widest text-amber-900">
              RUHVI PRIVÉ
            </span>
            <Crown className="h-4 w-4 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Hero Section ── */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 p-8 text-white shadow-2xl sm:p-12 md:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              <span>The Luxury Circle of Ruhvi</span>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-amber-100 sm:text-5xl md:text-6xl">
              RUHVI PRIVÉ
            </h1>
            <p className="text-sm leading-relaxed text-amber-100/80 sm:text-base md:text-lg">
              Experience handcrafted fine jewellery with bespoke privileges.
              Enjoy unconditional ₹0 express delivery, 20% cashback rewards (2X
              coins), an annual ₹500 birthday shopping gift, and secret access
              to limited vault releases.
            </p>

            {isVip && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-white/10 px-4 py-2 text-xs font-semibold text-amber-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>You are an honored Ruhvi Privé Member</span>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 1: Active Member Status OR Enrollment Choices ── */}
        {isVip ? (
          /* ACTIVE VIP STATUS DASHBOARD */
          <div className="space-y-8">
            {/* 30-Day Renewal Alert Banner */}
            {isExpiringSoon && (
              <div className="animate-pulse-slow relative overflow-hidden rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-500/15 via-amber-50 to-amber-500/15 p-6 shadow-lg">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <h3 className="font-serif text-base font-bold text-amber-950 sm:text-lg">
                        Membership Expiring in {daysRemaining}{' '}
                        {daysRemaining === 1 ? 'Day' : 'Days'}!
                      </h3>
                    </div>
                    <p className="text-xs text-stone-700">
                      Your 1-year Ruhvi Privé validity ends on{' '}
                      <strong>{formattedExpiry}</strong>. Renew today to
                      maintain uninterrupted ₹0 shipping, 2X rewards, and your
                      birthday credit.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleActivate('coins')}
                      disabled={isActivating || coinsBalance < 1500}
                      className="rounded-xl border border-amber-400 bg-amber-900 px-4 py-2.5 text-xs font-bold text-amber-50 shadow transition hover:bg-black disabled:opacity-40"
                    >
                      {isActivating && activatingSource === 'coins'
                        ? 'Renewing...'
                        : `Renew (1,500 Coins)`}
                    </button>
                    <button
                      onClick={() => handleActivate('wallet')}
                      disabled={isActivating || walletBalance < 500}
                      className="rounded-xl bg-amber-950 px-4 py-2.5 text-xs font-bold text-gold-50 shadow transition hover:bg-black disabled:opacity-40"
                    >
                      {isActivating && activatingSource === 'wallet'
                        ? 'Renewing...'
                        : `Renew for ₹500`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Virtual Privé Card & Live Validity Counter */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Virtual Luxury Card */}
              <div className="relative overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-br from-stone-900 via-amber-950 to-black p-8 text-white shadow-2xl lg:col-span-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-6 w-6 text-amber-400" />
                    <span className="font-serif text-lg font-bold tracking-widest text-amber-200">
                      RUHVI PRIVÉ
                    </span>
                  </div>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    ACTIVE VIP
                  </span>
                </div>

                <div className="my-10 space-y-1">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-amber-200/60">
                    Cardholder
                  </p>
                  <p className="font-serif text-2xl font-bold tracking-wide text-white sm:text-3xl">
                    {profile?.full_name ||
                      user?.email?.split('@')[0] ||
                      'Privé Connoisseur'}
                  </p>
                  <p className="font-mono text-xs text-amber-100/70">
                    Member ID: RHV-PRIVÉ-
                    {user?.id?.slice(0, 8).toUpperCase() || '2026'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 font-mono text-xs text-amber-100/80">
                  <div>
                    <span className="block text-[10px] uppercase text-amber-200/60">
                      Validity
                    </span>
                    <span>Expires {formattedExpiry}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-amber-200/60">
                      Activation Source
                    </span>
                    <span className="capitalize">
                      {profile?.vip_source || 'Direct Member'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Validity Counter Box */}
              <div className="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Validity Status
                    </span>
                    <Clock className="h-4 w-4 text-amber-800" />
                  </div>

                  <div className="space-y-1">
                    <div className="font-serif text-4xl font-bold text-amber-950 sm:text-5xl">
                      {daysRemaining}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Days Remaining
                    </p>
                  </div>

                  <p className="text-xs leading-relaxed text-stone-500">
                    Your membership is active and grants unrestricted ₹0 express
                    shipping, 20% coins cashback, and secret drops.
                  </p>
                </div>

                {/* Birthday Status Indicator */}
                <div className="mt-6 border-t border-stone-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700">
                      Birthday Privilege
                    </span>
                    {profile?.is_dob_locked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Check className="h-3 w-3" /> VERIFIED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                        <AlertCircle className="h-3 w-3" /> PENDING
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500">
                    {profile?.is_dob_locked ? (
                      `Birthday locked as ${formatDobDisplay(profile?.date_of_birth)}. ₹500 credit activates during your birthday month.`
                    ) : (
                      <Link
                        href="/account"
                        className="font-semibold text-amber-900 underline hover:text-black"
                      >
                        Lock your birthday in Account Profile to activate your
                        annual ₹500 credit →
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Birthday Privilege Voucher Showcase ── */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 p-6 text-white shadow-xl sm:p-8">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    <Gift className="h-3.5 w-3.5 text-amber-300" />
                    <span>Annual Birthday Privilege</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-amber-100 sm:text-2xl">
                    Your ₹500 Privé Birthday Shopping Voucher
                  </h3>
                  <p className="text-xs text-amber-200/70">
                    Valid for 1 full year from issuance on handcrafted jewellery
                    orders of ₹1,000 or more
                  </p>
                </div>

                {profile?.is_dob_locked ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>
                      DOB Verified: {formatDobDisplay(profile?.date_of_birth)}
                    </span>
                  </div>
                ) : (
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30"
                  >
                    <AlertCircle className="h-4 w-4 text-amber-300" />
                    <span>Lock Birthday in Profile →</span>
                  </Link>
                )}
              </div>

              {/* Voucher Card Container */}
              <div className="mt-6">
                {loadingVoucher ? (
                  <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-xs text-amber-200/70">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Fetching
                    your birthday voucher status...
                  </div>
                ) : voucherData ? (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/70 bg-gradient-to-r from-amber-900/40 via-stone-900/60 to-amber-950/40 p-6 sm:p-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-center">
                      {/* Left: Code Box & Value */}
                      <div className="space-y-3 lg:col-span-1">
                        <span className="inline-block rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                          Exclusive Voucher Code
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="rounded-xl border border-amber-400/50 bg-black/50 px-3.5 py-2 font-mono text-base font-extrabold tracking-wider text-amber-200 sm:text-lg">
                            {voucherData.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(voucherData.code)}
                            className="flex items-center gap-1 rounded-xl bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/30"
                            title="Copy code"
                          >
                            {copiedCode ? (
                              <>
                                <Check className="h-4 w-4 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-3xl font-extrabold text-amber-300">
                            ₹{voucherData.value} OFF
                          </span>
                          <span className="text-[11px] text-amber-200/70">
                            on min. spend ₹{voucherData.min_order_value}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300">
                          Expires:{' '}
                          <strong>
                            {new Date(
                              voucherData.valid_until
                            ).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </strong>{' '}
                          (Valid 1 Year)
                        </p>
                      </div>

                      {/* Middle: Conditions Badges */}
                      <div className="space-y-2 border-t border-white/10 pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/60">
                          Terms & Conditions
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-amber-100/90">
                          <li className="flex items-start gap-1.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>
                              <strong>Min Spend:</strong> ₹1,000 on physical
                              jewellery products
                            </span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>
                              <strong>Validity:</strong> 1 Full Year (365 Days)
                              from issue
                            </span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>
                              <strong>Physical Jewellery Only:</strong> Excludes
                              shipping & pass
                            </span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>
                              <strong>Non-Stackable:</strong> Cannot merge with
                              other codes/coins
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Right: Quick Action Button */}
                      <div className="flex flex-col gap-2 border-t border-white/10 pt-4 lg:col-span-1 lg:border-t-0 lg:pl-6 lg:pt-0">
                        <Link
                          href={`/checkout?coupon=${encodeURIComponent(voucherData.code)}`}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-center text-xs font-bold uppercase tracking-widest text-amber-950 shadow-lg transition hover:from-amber-300 hover:to-amber-400"
                        >
                          <span>Apply Voucher in Cart</span>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <p className="text-center text-[10px] text-amber-200/60">
                          One-click application directly in your checkout bag
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !profile?.is_dob_locked ? (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
                    <p className="text-xs text-amber-200">
                      To activate and generate your personal 1-year ₹500
                      birthday voucher, please register and lock your Date of
                      Birth in your Account Profile.
                    </p>
                    <Link
                      href="/account"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-300"
                    >
                      <span>Lock Date of Birth Now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xs text-amber-200/80">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-amber-100">
                        Anti-Fraud Security Lock Active
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-200/70">
                      Your Date of Birth is locked. In accordance with policy,
                      the 30-day anti-fraud buffer protects your privilege. Once
                      completed, your 1-year valid ₹500 voucher code will be
                      ready right here!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* NON-VIP: ENROLLMENT & VALUE PROPOSITION */
          <div className="space-y-10">
            {/* Dual Activation Cards */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Option A: Unlock with Reward Coins */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-amber-50/50 p-8 shadow-sm transition hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-800">
                      Spend-to-Earn Pass
                    </span>
                    <Coins className="h-5 w-5 text-yellow-600" />
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-stone-900">
                    Redeem with Reward Coins
                  </h3>
                  <p className="text-xs leading-relaxed text-stone-600">
                    Accumulate coins from your jewellery orders or referrals.
                    1,500 coins unlock a full 1-year Privé membership with zero
                    cash outlay.
                  </p>

                  <div className="rounded-2xl border border-yellow-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                      <span>Your Balance</span>
                      <span className="font-mono font-bold text-amber-900">
                        {coinsBalance} / 1,500 Coins
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (coinsBalance / 1500) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4">
                  <button
                    onClick={() => handleActivate('coins')}
                    disabled={isActivating || coinsBalance < 1500}
                    className="w-full rounded-xl bg-amber-950 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-amber-100 shadow transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isActivating && activatingSource === 'coins'
                      ? 'Activating...'
                      : coinsBalance >= 1500
                        ? 'Unlock with 1,500 Coins'
                        : `Need ${1500 - coinsBalance} More Coins`}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-stone-400">
                    Earn 10 coins per ₹100 on standard orders or 500 coins per
                    referral.
                  </p>
                </div>
              </div>

              {/* Option B: Direct 1-Year Pass Purchase */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-amber-100/40 p-8 shadow-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100">
                      Most Popular
                    </span>
                    <Crown className="h-5 w-5 text-amber-700" />
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl font-bold text-stone-900">
                      Direct 1-Year Pass
                    </h3>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="font-serif text-4xl font-bold text-amber-950">
                        ₹500
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        / 1 Year Validity
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-stone-600">
                    Unlock instant free express shipping on today&apos;s order
                    plus every purchase for the next 365 days. Pays for itself
                    in just a few deliveries!
                  </p>

                  <div className="rounded-2xl border border-amber-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                      <span>Ruhvi Wallet Balance</span>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{walletBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500">
                      {walletBalance >= 500
                        ? 'You have enough wallet balance to activate instantly!'
                        : 'Pay instantly via UPI, Card, NetBanking, or Wallet.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2 pt-4">
                  {walletBalance >= 500 ? (
                    <button
                      onClick={() => handleActivate('wallet')}
                      disabled={isActivating}
                      className="w-full rounded-xl bg-amber-950 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-amber-100 shadow transition hover:bg-black disabled:opacity-50"
                    >
                      {isActivating && activatingSource === 'wallet'
                        ? 'Processing...'
                        : 'Join via Ruhvi Wallet (₹500)'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate('gateway')}
                      disabled={isActivating}
                      className="w-full rounded-xl bg-amber-950 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-amber-100 shadow transition hover:bg-black disabled:opacity-50"
                    >
                      {isActivating && activatingSource === 'gateway'
                        ? 'Connecting...'
                        : 'Join for ₹500 / Year'}
                    </button>
                  )}
                  <p className="text-center text-[10px] text-stone-400">
                    Strict zero-cashback on pass fee • Non-refundable pass
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 p-6 sm:p-8">
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Standard Customer vs. Ruhvi Privé Member
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  See how Privé elevates your luxury jewellery shopping
                  experience
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/70 font-semibold text-stone-700">
                      <th className="p-4 sm:p-5">Privilege / Feature</th>
                      <th className="p-4 sm:p-5">Standard Customer</th>
                      <th className="bg-amber-50/80 p-4 font-bold text-amber-950 sm:p-5">
                        👑 Ruhvi Privé Member
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="p-4 font-medium text-stone-900 sm:p-5">
                        Express Delivery Threshold
                      </td>
                      <td className="p-4 text-stone-600 sm:p-5">
                        ₹49 Fee for orders &lt; ₹1,000
                      </td>
                      <td className="bg-amber-50/40 p-4 font-bold text-emerald-700 sm:p-5">
                        ₹0 Free on ALL Orders (Even ₹200)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-stone-900 sm:p-5">
                        Cash on Delivery (COD) Fee
                      </td>
                      <td className="p-4 text-stone-600 sm:p-5">
                        ₹49 per order
                      </td>
                      <td className="bg-amber-50/40 p-4 font-bold text-emerald-700 sm:p-5">
                        ₹0 Free COD Convenience
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-stone-900 sm:p-5">
                        Reward Coins (Cashback Rate)
                      </td>
                      <td className="p-4 text-stone-600 sm:p-5">
                        10% (10 Coins / ₹100)
                      </td>
                      <td className="bg-amber-50/40 p-4 font-bold text-amber-900 sm:p-5">
                        20% (2X Coins — 20 Coins / ₹100)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-stone-900 sm:p-5">
                        Annual Birthday Celebration
                      </td>
                      <td className="p-4 text-stone-600 sm:p-5">None</td>
                      <td className="bg-amber-50/40 p-4 font-bold text-amber-900 sm:p-5">
                        ₹500 Birthday Credit Voucher
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-stone-900 sm:p-5">
                        New Drop Access
                      </td>
                      <td className="p-4 text-stone-600 sm:p-5">
                        Public Release
                      </td>
                      <td className="bg-amber-50/40 p-4 font-bold text-amber-900 sm:p-5">
                        24-Hour VIP Early Access
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-stone-900 sm:p-5">
                        Privé Vault Collections
                      </td>
                      <td className="p-4 text-stone-600 sm:p-5">Hidden</td>
                      <td className="bg-amber-50/40 p-4 font-bold text-amber-900 sm:p-5">
                        Unrestricted Member Vault Access
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: The 6 Hallmarks of Ruhvi Privé ── */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              Privileges of Membership
            </h2>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              Carefully crafted for jewellery lovers who appreciate precision
              and craftsmanship
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Free Shipping */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                Unconditional ₹0 Express Shipping
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Whether you order a delicate ₹250 ring or a signature necklace,
                enjoy zero delivery fees with insured transit.
              </p>
            </div>

            {/* 2. Zero COD Fee */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                ₹0 COD Processing Fee
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Prefer paying at your doorstep? Save ₹49 on Cash on Delivery
                fees on every single Privé order.
              </p>
            </div>

            {/* 3. 2X Coins Cashback */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                2X Reward Coins (20% Value)
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Earn 20 Reward Coins for every ₹100 spent (double the standard
                10%). Redeem coins on future purchases.
              </p>
            </div>

            {/* 4. Birthday Gift */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                ₹500 Birthday Privilege Voucher
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Celebrate with a ₹500 shopping voucher valid for 1 full year on
                jewellery orders of ₹1,000 or more. Non-mergeable with other
                offers.
              </p>
            </div>

            {/* 5. Early Access & Vault */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                24-Hour Early Access & Vault
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Acquire limited edition drops a full day before public launch
                and gain access to our secret member-only Vault.
              </p>
            </div>

            {/* 6. Signature Packaging */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                Privé Signature Touch
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Every Privé order receives premium velvet pouch packaging,
                anti-tarnish polishing cloth, and wax-seal quality inspection.
              </p>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: FAQ Accordion ── */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Everything you need to know about your Ruhvi Privé membership
            </p>
          </div>

          <div className="mx-auto max-w-3xl divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left text-xs font-bold text-stone-900 sm:text-sm"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-amber-800" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-stone-400" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-xs leading-relaxed text-stone-600">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
