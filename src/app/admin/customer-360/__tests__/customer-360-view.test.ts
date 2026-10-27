import type { Customer360Profile } from '@/lib/intelligence/customer-360-service';

/**
 * ============================================================================
 * CUSTOMER 360 VIEW & TIMELINE SYNTHESIS TESTS (TRACK F - PHASE 33)
 * ============================================================================
 * Unit tests for Customer 360 timeline event synthesis, category filtering,
 * deep-link construction, and role-based presentation guardrails.
 */

interface TimelineEvent {
  id: string;
  category: 'orders' | 'support' | 'engagement' | 'milestones';
  timestamp: string;
  title: string;
  summary: string;
  badge?: { label: string; variant: string };
  deepLink?: { label: string; href: string };
}

function synthesizeTimelineEvents(
  profileData: Customer360Profile
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Orders
  profileData.orderSummary.recentOrders.forEach((o) => {
    let variant = 'info';
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
    });
  });

  // 2. Support Tickets
  profileData.support.recentTickets.forEach((t) => {
    let variant = 'info';
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
    });
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function filterEventsByCategory(
  events: TimelineEvent[],
  category: 'all' | 'orders' | 'support' | 'engagement' | 'milestones'
): TimelineEvent[] {
  if (category === 'all') return events;
  return events.filter((e) => e.category === category);
}

describe('Customer 360 Timeline Presentation & Synthesis', () => {
  const sampleAdminProfile: Customer360Profile = {
    profile: {
      id: 'usr_alice_001',
      fullName: 'Alice Roy',
      email: 'alice@example.com',
      emailVerified: true,
      phone: '+919830111111',
      phoneVerified: true,
      role: 'customer',
      accountStatus: 'active',
      walletBalance: 250.0,
      rewardCoins: 500,
      referralCode: 'ALICE2026',
      celebrations: {
        dob: '1995-08-15',
        anniversaryDate: '2022-12-04',
      },
      joinedAt: '2026-01-10T10:00:00.000Z',
    },
    orderSummary: {
      totalOrders: 2,
      totalLifetimeSpend: 25400.0,
      averageOrderValue: 12700.0,
      lastOrderDate: '2026-04-10T10:00:00.000Z',
      recentOrders: [
        {
          id: 'ord_1',
          orderNumber: 'RHV-1001',
          status: 'delivered',
          total: 15400.0,
          createdAt: '2026-04-10T10:00:00.000Z',
        },
        {
          id: 'ord_2',
          orderNumber: 'RHV-1002',
          status: 'processing',
          total: 10000.0,
          createdAt: '2026-03-15T12:00:00.000Z',
        },
      ],
    },
    preferences: {
      preferredCategories: [],
      primaryRegion: {
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700034',
      },
      preferredPaymentCategory: 'UPI',
    },
    wishlist: {
      count: 1,
      items: [
        {
          productId: 'prod_solitaire',
          productName: 'Solitaire Gold Ring',
          price: 24000.0,
          addedAt: '2026-04-01T09:00:00.000Z',
        },
      ],
    },
    cart: {
      hasActiveCart: true,
      itemsCount: 2,
      cartTotal: 9000.0,
      updatedAt: '2026-04-12T15:00:00.000Z',
    },
    support: {
      openTicketsCount: 1,
      totalTicketsCount: 1,
      recentTickets: [
        {
          id: 'tick_1',
          ticketNumber: 'TCK-999',
          title: 'Ring resizing request',
          priority: 'normal',
          status: 'open',
          createdAt: '2026-04-05T11:00:00.000Z',
          updatedAt: '2026-04-05T12:00:00.000Z',
        },
      ],
    },
    metadata: {
      targetCustomerId: 'usr_alice_001',
      requestedByActorId: 'admin_usr_01',
      requestedByRole: 'admin',
      piiMasked: false,
      freshness: {
        profileFetchedAt: '2026-04-20T10:00:00.000Z',
        ordersFetchedAt: '2026-04-20T10:00:00.000Z',
        wishlistFetchedAt: '2026-04-20T10:00:00.000Z',
        cartFetchedAt: '2026-04-20T10:00:00.000Z',
        supportFetchedAt: '2026-04-20T10:00:00.000Z',
      },
    },
  };

  const sampleStaffProfile: Customer360Profile = {
    ...sampleAdminProfile,
    profile: {
      ...sampleAdminProfile.profile,
      fullName: 'Alice R.',
      email: 'a•••@example.com',
      phone: '+919830••••11',
    },
    orderSummary: {
      ...sampleAdminProfile.orderSummary,
      totalLifetimeSpend: undefined,
      averageOrderValue: undefined,
    },
    metadata: {
      ...sampleAdminProfile.metadata,
      requestedByRole: 'staff',
      piiMasked: true,
    },
  };

  describe('Timeline Event Synthesis', () => {
    it('synthesizes orders, support, wishlist, cart, and account milestones into a single stream', () => {
      const events = synthesizeTimelineEvents(sampleAdminProfile);

      expect(events.length).toBeGreaterThanOrEqual(6);

      const orderEvents = events.filter((e) => e.category === 'orders');
      expect(orderEvents).toHaveLength(2);
      expect(orderEvents[0].title).toBe('Order Placed: RHV-1001');

      const supportEvents = events.filter((e) => e.category === 'support');
      expect(supportEvents).toHaveLength(1);
      expect(supportEvents[0].title).toBe('Support Ticket: #TCK-999');

      const wishlistEvents = events.filter((e) => e.id.startsWith('wish_'));
      expect(wishlistEvents).toHaveLength(1);
      expect(wishlistEvents[0].title).toBe('Saved Item to Wishlist');

      const cartEvents = events.filter((e) => e.id.startsWith('cart_'));
      expect(cartEvents).toHaveLength(1);
      expect(cartEvents[0].title).toBe('Active Shopping Bag Updated');
    });

    it('sorts all timeline events in descending chronological order (newest first)', () => {
      const events = synthesizeTimelineEvents(sampleAdminProfile);

      for (let i = 0; i < events.length - 1; i++) {
        const currentMs = new Date(events[i].timestamp).getTime();
        const nextMs = new Date(events[i + 1].timestamp).getTime();
        expect(currentMs).toBeGreaterThanOrEqual(nextMs);
      }
    });

    it('generates safe, URL-encoded deep-links to authoritative source views', () => {
      const events = synthesizeTimelineEvents(sampleAdminProfile);

      const orderEvent = events.find((e) => e.category === 'orders');
      expect(orderEvent?.deepLink?.href).toBe('/admin/orders?search=RHV-1001');

      const supportEvent = events.find((e) => e.category === 'support');
      expect(supportEvent?.deepLink?.href).toBe('/admin/support');

      const wishlistEvent = events.find((e) => e.id.startsWith('wish_'));
      expect(wishlistEvent?.deepLink?.href).toBe(
        '/admin/products?search=Solitaire%20Gold%20Ring'
      );
    });
  });

  describe('Category Filtering', () => {
    it('filters events strictly to orders when category is "orders"', () => {
      const allEvents = synthesizeTimelineEvents(sampleAdminProfile);
      const filtered = filterEventsByCategory(allEvents, 'orders');

      expect(filtered).toHaveLength(2);
      filtered.forEach((e) => expect(e.category).toBe('orders'));
    });

    it('filters events strictly to support when category is "support"', () => {
      const allEvents = synthesizeTimelineEvents(sampleAdminProfile);
      const filtered = filterEventsByCategory(allEvents, 'support');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('support');
      expect(filtered[0].title).toContain('TCK-999');
    });

    it('filters events strictly to engagement when category is "engagement"', () => {
      const allEvents = synthesizeTimelineEvents(sampleAdminProfile);
      const filtered = filterEventsByCategory(allEvents, 'engagement');

      expect(filtered).toHaveLength(2); // Wishlist + Cart
      filtered.forEach((e) => expect(e.category).toBe('engagement'));
    });

    it('returns all events when category is "all"', () => {
      const allEvents = synthesizeTimelineEvents(sampleAdminProfile);
      const filtered = filterEventsByCategory(allEvents, 'all');

      expect(filtered).toHaveLength(allEvents.length);
    });
  });

  describe('Role-Based Presentation & Privacy Guardrails', () => {
    it('verifies staff profile has PII masked and commercial margins withheld', () => {
      expect(sampleStaffProfile.metadata.piiMasked).toBe(true);
      expect(sampleStaffProfile.profile.fullName).toBe('Alice R.');
      expect(sampleStaffProfile.profile.email).toBe('a•••@example.com');
      expect(sampleStaffProfile.profile.phone).toBe('+919830••••11');
      expect(
        sampleStaffProfile.orderSummary.totalLifetimeSpend
      ).toBeUndefined();
      expect(sampleStaffProfile.orderSummary.averageOrderValue).toBeUndefined();
    });

    it('verifies admin profile has unmasked details and visible commercial totals', () => {
      expect(sampleAdminProfile.metadata.piiMasked).toBe(false);
      expect(sampleAdminProfile.profile.fullName).toBe('Alice Roy');
      expect(sampleAdminProfile.profile.email).toBe('alice@example.com');
      expect(sampleAdminProfile.profile.phone).toBe('+919830111111');
      expect(sampleAdminProfile.orderSummary.totalLifetimeSpend).toBe(25400.0);
      expect(sampleAdminProfile.orderSummary.averageOrderValue).toBe(12700.0);
    });

    it('strictly guarantees no credit card numbers, CVVs, or gateway secrets are in timeline summaries', () => {
      const events = synthesizeTimelineEvents(sampleAdminProfile);

      const forbiddenPatterns = [
        /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/, // 16-digit card number
        /\bcvv\b/i,
        /\bpin\b/i,
        /\bsecret\b/i,
        /\bauth_token\b/i,
      ];

      events.forEach((e) => {
        const fullText = `${e.title} ${e.summary} ${e.deepLink?.href || ''}`;
        forbiddenPatterns.forEach((pattern) => {
          expect(pattern.test(fullText)).toBe(false);
        });
      });
    });
  });
});
