'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Heart,
  HelpCircle,
  Lock,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  UserCheck,
  Wallet,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { Customer360Profile } from '@/lib/intelligence/customer-360-service';

/**
 * ============================================================================
 * CUSTOMER 360 TIMELINE INTERFACE (TRACK F - PHASE 33)
 * ============================================================================
 * Role-aware administrative customer intelligence workspace and timeline view.
 *
 * Guarantees:
 * 1. Role-Aware Privacy Guardrails:
 *    - Frontline staff receive masked PII and restricted commercial totals.
 *    - Administrators receive unmasked profiles with full order history.
 * 2. Unified Chronological Activity Stream:
 *    - Synthesizes orders, support tickets, wishlist saves, cart updates, and
 *      account milestones into a unified, filterable event timeline.
 * 3. Originating Source Preservation:
 *    - Direct deep-links to authoritative source workflows (/admin/orders,
 *      /admin/refunds, /admin/support) without exposing raw credentials.
 * 4. Zero Credential / Message Body Exposure:
 *    - Excludes credit card numbers, payment gateway tokens, CVVs, private
 *      attachment previews, and sensitive internal chat bodies.
 */

type TimelineCategory =
  'all' | 'orders' | 'support' | 'engagement' | 'milestones';

interface TimelineEvent {
  id: string;
  category: 'orders' | 'support' | 'engagement' | 'milestones';
  timestamp: string;
  title: string;
  summary: string;
  badge?: {
    label: string;
    variant: 'success' | 'warning' | 'info' | 'neutral';
  };
  deepLink?: { label: string; href: string };
  icon: React.ElementType;
}

function formatTimelineDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Date unknown';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export default function Customer360Page() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const customerIdParam = searchParams.get('customerId') || '';
  const [searchInput, setSearchInput] = useState(customerIdParam);
  const [activeCustomerId, setActiveCustomerId] = useState(customerIdParam);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<Customer360Profile | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] =
    useState<TimelineCategory>('all');

  const fetchCustomerProfile = useCallback(async (id: string) => {
    if (!id.trim()) {
      setProfileData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/customer-360/${encodeURIComponent(id.trim())}`,
        {
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        if (res.status === 404) {
          throw new Error(
            `Customer with ID '${id}' was not found in the authoritative database.`
          );
        }
        if (res.status === 403) {
          throw new Error(
            'Access forbidden: your staff role lacks clearance to inspect this profile.'
          );
        }
        throw new Error(
          errorBody.error || `Failed to fetch customer profile (${res.status})`
        );
      }

      const json = await res.json();
      if (json.success && json.customer360) {
        setProfileData(json.customer360);
      } else {
        throw new Error('Invalid response structure received from server.');
      }
    } catch (err: any) {
      console.error('[Customer360] Fetch error:', err);
      setError(
        err.message || 'An error occurred while loading customer profile.'
      );
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeCustomerId) {
      fetchCustomerProfile(activeCustomerId);
    }
  }, [activeCustomerId, fetchCustomerProfile]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setActiveCustomerId(trimmed);
    router.push(
      `/admin/customer-360?customerId=${encodeURIComponent(trimmed)}`
    );
  };

  // ─── Timeline Events Synthesis ─────────────────────────────────────────────
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!profileData) return [];

    const events: TimelineEvent[] = [];

    // 1. Orders
    profileData.orderSummary.recentOrders.forEach((o) => {
      let variant: 'success' | 'warning' | 'info' | 'neutral' = 'info';
      if (o.status === 'delivered') variant = 'success';
      else if (o.status === 'cancelled' || o.status === 'returned')
        variant = 'warning';

      events.push({
        id: `ord_${o.id}`,
        category: 'orders',
        timestamp: o.createdAt,
        title: `Order Placed: ${o.orderNumber}`,
        summary: `Status: ${o.status.toUpperCase()} • Total: ₹${o.total.toLocaleString('en-IN')}`,
        badge: { label: o.status, variant },
        deepLink: {
          label: 'View Order',
          href: `/admin/orders?search=${encodeURIComponent(o.orderNumber)}`,
        },
        icon: ShoppingBag,
      });
    });

    // 2. Support Tickets
    profileData.support.recentTickets.forEach((t) => {
      let variant: 'success' | 'warning' | 'info' | 'neutral' = 'info';
      if (t.status === 'resolved' || t.status === 'closed') variant = 'success';
      else if (t.priority === 'urgent' || t.priority === 'high')
        variant = 'warning';

      events.push({
        id: `tick_${t.id}`,
        category: 'support',
        timestamp: t.createdAt,
        title: `Support Ticket: #${t.ticketNumber}`,
        summary: `${t.title} • Priority: ${t.priority.toUpperCase()} • Status: ${t.status}`,
        badge: { label: t.status, variant },
        deepLink: { label: 'Support Queue', href: '/admin/support' },
        icon: HelpCircle,
      });
    });

    // 3. Wishlist Saves
    profileData.wishlist.items.forEach((w, idx) => {
      events.push({
        id: `wish_${w.productId}_${idx}`,
        category: 'engagement',
        timestamp: w.addedAt,
        title: 'Saved Item to Wishlist',
        summary: `${w.productName} • ₹${w.price.toLocaleString('en-IN')}`,
        deepLink: {
          label: 'Catalogue',
          href: `/admin/products?search=${encodeURIComponent(w.productName)}`,
        },
        icon: Heart,
      });
    });

    // 4. Cart State Activity
    if (profileData.cart.hasActiveCart && profileData.cart.updatedAt) {
      events.push({
        id: `cart_${profileData.profile.id}`,
        category: 'engagement',
        timestamp: profileData.cart.updatedAt,
        title: 'Active Shopping Bag Updated',
        summary: `${profileData.cart.itemsCount} items in cart • Total Bag Value: ₹${profileData.cart.cartTotal.toLocaleString('en-IN')}`,
        badge: { label: 'Active Cart', variant: 'info' },
        icon: ShoppingCart,
      });
    }

    // 5. Account Milestones
    if (profileData.profile.joinedAt) {
      events.push({
        id: `reg_${profileData.profile.id}`,
        category: 'milestones',
        timestamp: profileData.profile.joinedAt,
        title: 'Customer Profile Registered',
        summary: `Joined as ${profileData.profile.role.toUpperCase()} • Email Verified: ${profileData.profile.emailVerified ? 'Yes' : 'No'}`,
        badge: { label: 'Joined', variant: 'success' },
        icon: UserCheck,
      });
    }

    if (profileData.profile.celebrations?.anniversaryDate) {
      events.push({
        id: `anniv_${profileData.profile.id}`,
        category: 'milestones',
        timestamp: profileData.profile.celebrations.anniversaryDate,
        title: 'Anniversary Celebration Recorded',
        summary: `Annual milestone on ${profileData.profile.celebrations.anniversaryDate}`,
        badge: { label: 'Anniversary', variant: 'info' },
        icon: Sparkles,
      });
    }

    // Sort descending by timestamp (newest first)
    return events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [profileData]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return timelineEvents;
    return timelineEvents.filter((ev) => ev.category === selectedCategory);
  }, [timelineEvents, selectedCategory]);

  return (
    <div className="min-h-screen space-y-8 bg-[#080B10] p-6 text-[#E2E8F0] lg:p-10">
      {/* ─── Top Control Bar & Breadcrumbs ─── */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <UserCheck className="h-4 w-4" />
            <span>Track F — Customer Intelligence</span>
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Customer 360 Timeline
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Role-governed customer journey, interaction timeline, and
            privacy-safe activity records.
          </p>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full max-w-md items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Customer ID or UUID..."
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900/90 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-amber-500/70 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <button
            type="submit"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-amber-500 hover:to-amber-600"
          >
            <span>Search</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* ─── Role Banner & Privacy Indicator ─── */}
      {profileData && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {profileData.metadata.piiMasked ? (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Governance Mode
              </div>
              <div className="text-sm font-medium text-slate-200">
                {profileData.metadata.piiMasked
                  ? 'Frontline Staff Mode — PII Masked under DPDP Act 2023. Commercial margins restricted.'
                  : 'Administrative Mode — Full Unmasked Customer Record with Audit Logging.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>
                Data Provenance:{' '}
                {formatTimelineDate(
                  profileData.metadata.freshness.profileFetchedAt
                )}
              </span>
            </span>
            <button
              onClick={() => fetchCustomerProfile(activeCustomerId)}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              title="Refresh Data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-amber-400" />
          <h3 className="text-lg font-semibold text-white">
            Assembling Customer 360 Record...
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Querying authoritative profile, order history, wishlists, and
            support logs in parallel.
          </p>
        </div>
      )}

      {/* ─── Error Alert State ─── */}
      {error && !loading && (
        <div className="flex items-start gap-4 rounded-xl border border-rose-800/60 bg-rose-950/30 p-6 text-rose-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <h4 className="font-semibold text-rose-300">
              Profile Retrieval Error
            </h4>
            <p className="mt-1 text-sm text-rose-200/80">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Empty Search Prompt ─── */}
      {!profileData && !loading && !error && (
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/30 p-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <UserCheck className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-white">
            Lookup Customer 360 History
          </h3>
          <p className="text-sm leading-relaxed text-slate-400">
            Enter a customer ID, internal UUID, or navigate from an order/ticket
            to assemble the unified chronological journey with strict
            server-side RBAC safeguards.
          </p>
        </div>
      )}

      {/* ─── Customer 360 Profile Summary Cards ─── */}
      {profileData && !loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Customer Identity */}
          <div className="space-y-3 rounded-xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">
                Identity
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                {profileData.profile.role}
              </span>
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {profileData.profile.fullName || 'Unnamed Customer'}
              </div>
              <div className="mt-0.5 font-mono text-xs text-slate-400">
                {profileData.profile.email || 'No email registered'}
              </div>
              <div className="font-mono text-xs text-slate-400">
                {profileData.profile.phone || 'No phone registered'}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-800/60 pt-2 text-xs">
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${profileData.profile.emailVerified ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
              >
                {profileData.profile.emailVerified
                  ? 'Email Verified'
                  : 'Unverified Email'}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${profileData.profile.phoneVerified ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
              >
                {profileData.profile.phoneVerified
                  ? 'Phone Verified'
                  : 'Unverified Phone'}
              </span>
            </div>
          </div>

          {/* Card 2: Commercial Spend Summary */}
          <div className="space-y-3 rounded-xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">
                Commercial History
              </span>
              <ShoppingBag className="h-4 w-4 text-amber-400" />
            </div>
            {profileData.orderSummary.totalLifetimeSpend !== undefined ? (
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  ₹
                  {profileData.orderSummary.totalLifetimeSpend.toLocaleString(
                    'en-IN'
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Lifetime Value across {profileData.orderSummary.totalOrders}{' '}
                  order(s)
                </div>
                <div className="text-xs text-slate-400">
                  AOV: ₹
                  {(
                    profileData.orderSummary.averageOrderValue || 0
                  ).toLocaleString('en-IN')}
                </div>
              </div>
            ) : (
              <div className="py-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-amber-500/80" />
                  <span className="font-medium">
                    Commercial Margin Restricted
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Total Orders: {profileData.orderSummary.totalOrders}
                </div>
              </div>
            )}
            <div className="border-t border-slate-800/60 pt-2 text-xs text-slate-400">
              <span>Preferred Payment: </span>
              <span className="font-semibold text-slate-300">
                {profileData.preferences.preferredPaymentCategory || 'N/A'}
              </span>
            </div>
          </div>

          {/* Card 3: Wallet & Active Engagement */}
          <div className="space-y-3 rounded-xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">
                Wallet & Engagement
              </span>
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xl font-bold text-white">
                <span>₹{profileData.profile.walletBalance.toFixed(2)}</span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-400">
                  {profileData.profile.rewardCoins} Coins
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Wishlist Items: {profileData.wishlist.count}
              </div>
              <div className="text-xs text-slate-400">
                Active Bag: {profileData.cart.itemsCount} items (₹
                {profileData.cart.cartTotal.toLocaleString('en-IN')})
              </div>
            </div>
            <div className="flex items-center gap-1.5 border-t border-slate-800/60 pt-2 text-xs text-slate-400">
              <Tag className="h-3.5 w-3.5 text-slate-500" />
              <span>
                Ref Code: {profileData.profile.referralCode || 'None'}
              </span>
            </div>
          </div>

          {/* Card 4: Region & Support */}
          <div className="space-y-3 rounded-xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">
                Region & Support
              </span>
              <MapPin className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <span>
                  {profileData.preferences.primaryRegion?.city ||
                    'City unknown'}
                </span>
                {profileData.preferences.primaryRegion?.state && (
                  <span className="text-xs font-normal text-slate-400">
                    ({profileData.preferences.primaryRegion.state})
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                PIN: {profileData.preferences.primaryRegion?.pincode || 'N/A'}
              </div>
            </div>
            <div className="border-t border-slate-800/60 pt-2 text-xs">
              <span className="text-slate-400">Open Tickets: </span>
              <span
                className={`font-semibold ${profileData.support.openTicketsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
              >
                {profileData.support.openTicketsCount} of{' '}
                {profileData.support.totalTicketsCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Timeline Feed Section ─── */}
      {profileData && !loading && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                Customer Activity Stream
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {filteredEvents.length} events
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
              {(
                [
                  { id: 'all', label: 'All Activities' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'support', label: 'Support' },
                  { id: 'engagement', label: 'Wishlist & Cart' },
                  { id: 'milestones', label: 'Milestones' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Feed Container */}
          {filteredEvents.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-sm text-slate-400">
              No activity records found matching the &quot;{selectedCategory}
              &quot; category filter.
            </div>
          ) : (
            <div className="relative space-y-6 pl-6 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-0.5 before:bg-slate-800 sm:pl-8">
              {filteredEvents.map((event) => {
                const IconComponent = event.icon;

                let iconColor =
                  'text-amber-400 bg-amber-500/10 border-amber-500/30';
                if (event.category === 'orders')
                  iconColor =
                    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                else if (event.category === 'support')
                  iconColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                else if (event.category === 'engagement')
                  iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
                else if (event.category === 'milestones')
                  iconColor =
                    'text-purple-400 bg-purple-500/10 border-purple-500/30';

                return (
                  <div key={event.id} className="group relative">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full border transition-transform group-hover:scale-110 sm:-left-8 ${iconColor}`}
                    >
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>

                    {/* Event Card */}
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-sm transition-all hover:border-slate-700/80 hover:bg-slate-900">
                      <div className="mb-1.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {event.title}
                          </span>
                          {event.badge && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                event.badge.variant === 'success'
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                  : event.badge.variant === 'warning'
                                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                                    : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                              }`}
                            >
                              {event.badge.label}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400">
                          {formatTimelineDate(event.timestamp)}
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-slate-300">
                        {event.summary}
                      </p>

                      {event.deepLink && (
                        <div className="mt-3 flex items-center justify-end border-t border-slate-800/60 pt-2.5">
                          <Link
                            href={event.deepLink.href}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
                          >
                            <span>{event.deepLink.label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
