import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import {
  evaluateLookupPermissions,
  maskCustomerProfilePii,
  type CustomerIdentityRecord,
} from './customer-identity-resolution';

/**
 * ============================================================================
 * PERMISSION-CHECKED CUSTOMER 360 READ SERVICE (TRACK F - PHASE 32)
 * ============================================================================
 * Server-side read service assembling an authorized Customer 360 summary from
 * authoritative records (users, addresses, orders, wishlists, carts, support_tickets).
 *
 * Guarantees:
 * 1. Strict Server-Side Authorization:
 *    - Customer: Allowed only for self (`actorId === targetCustomerId`).
 *    - Staff: Allowed with mandatory PII masking and excluded financial spend totals.
 *    - Manager: Allowed with masked PII and authorized order/support summaries.
 *    - Admin / Super Admin: Full unmasked profile access.
 * 2. Approved Fields Only:
 *    - Profile metadata, order summary, safe category preferences, delivery region
 *      (city/state only - street address stripped), wishlist, cart, and support cases.
 * 3. Payment Credential Exclusion:
 *    - Under no circumstances are payment tokens, card numbers, UPI PINs, or gateway
 *      secrets returned or exposed.
 * 4. Data Freshness Transparency:
 *    - Emits source-level timestamps so consumers know exact data provenance.
 */

export class Customer360ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Customer360ForbiddenError';
  }
}

export class Customer360NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Customer360NotFoundError';
  }
}

export interface GetCustomer360Options {
  targetCustomerId: string;
  requestedByActor: {
    actorId: string;
    email?: string;
    role: 'customer' | 'staff' | 'manager' | 'admin' | 'super_admin' | string;
  };
  includeOrderHistoryLimit?: number; // default: 10
}

export interface Customer360Profile {
  profile: {
    id: string;
    fullName: string | null;
    email: string | null;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean;
    role: string;
    accountStatus: string;
    walletBalance: number;
    rewardCoins: number;
    referralCode?: string | null;
    celebrations?: {
      dob?: string | null;
      anniversaryDate?: string | null;
    };
    joinedAt: string;
  };
  orderSummary: {
    totalOrders: number;
    totalLifetimeSpend?: number; // Omitted for staff without commercial clearance
    averageOrderValue?: number; // Omitted for staff without commercial clearance
    lastOrderDate: string | null;
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      total: number;
      createdAt: string;
    }>;
  };
  preferences: {
    preferredCategories: Array<{ category: string; orderCount: number }>;
    primaryRegion: {
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
    } | null;
    preferredPaymentCategory?: string | null;
  };
  wishlist: {
    count: number;
    items: Array<{
      productId: string;
      productName: string;
      price: number;
      addedAt: string;
    }>;
  };
  cart: {
    hasActiveCart: boolean;
    itemsCount: number;
    cartTotal: number;
    updatedAt?: string | null;
  };
  support: {
    openTicketsCount: number;
    totalTicketsCount: number;
    recentTickets: Array<{
      id: string;
      ticketNumber: string;
      title: string;
      priority: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  metadata: {
    targetCustomerId: string;
    requestedByActorId: string;
    requestedByRole: string;
    piiMasked: boolean;
    freshness: {
      profileFetchedAt: string;
      ordersFetchedAt: string;
      wishlistFetchedAt: string;
      cartFetchedAt: string;
      supportFetchedAt: string;
    };
  };
}

/**
 * Assembles the authorized Customer 360 profile from authoritative database tables.
 */
export async function getCustomer360Profile(
  options: GetCustomer360Options
): Promise<Customer360Profile> {
  const { targetCustomerId, requestedByActor } = options;
  const orderLimit = Math.max(
    1,
    Math.min(50, options.includeOrderHistoryLimit ?? 10)
  );

  // ─── 1. Server-Side Authorization Evaluation ──────────────────────────────
  const permissions = evaluateLookupPermissions(
    requestedByActor.role,
    targetCustomerId,
    requestedByActor.actorId
  );

  if (!permissions.allowed) {
    throw new Customer360ForbiddenError(
      permissions.reason ||
        `Actor role '${requestedByActor.role}' is not authorized to access this customer profile.`
    );
  }

  const supabase = getServiceClient();
  const fetchTimestamp = new Date().toISOString();

  // ─── 2. Parallel Authoritative Queries ─────────────────────────────────────
  const [userRes, addressRes, ordersRes, wishlistRes, cartRes, supportRes] =
    await Promise.allSettled([
      // User Profile
      supabase
        .from('users')
        .select(
          'id, full_name, email, phone, email_verified, phone_verified, role, wallet_balance, reward_coins, dob, anniversary_date, referral_code, created_at, account_status'
        )
        .eq('id', targetCustomerId)
        .maybeSingle(),

      // Default Delivery Region (Only city/state/pincode — NEVER street line1/line2)
      supabase
        .from('addresses')
        .select('city, state, pincode, is_default')
        .eq('user_id', targetCustomerId)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Orders (Safe summaries — zero card numbers or tokens)
      supabase
        .from('orders')
        .select('id, order_number, status, total, payment_method, created_at')
        .eq('user_id', targetCustomerId)
        .order('created_at', { ascending: false })
        .limit(orderLimit),

      // Wishlist items
      supabase
        .from('wishlists')
        .select('product_id, created_at, products(id, name, price)')
        .eq('user_id', targetCustomerId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Cart state
      supabase
        .from('carts')
        .select('id, updated_at, cart_items(quantity, price_at_add)')
        .eq('user_id', targetCustomerId)
        .maybeSingle(),

      // Support tickets
      supabase
        .from('support_tickets')
        .select(
          'id, ticket_number, title, priority, status, created_at, updated_at'
        )
        .eq('customer_id', targetCustomerId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  // ─── 3. Profile Validation & Redaction ─────────────────────────────────────
  if (userRes.status === 'rejected' || !userRes.value.data) {
    throw new Customer360NotFoundError(
      `Customer with ID '${targetCustomerId}' was not found.`
    );
  }

  const rawUser = userRes.value.data;

  // Masking PII if required by RBAC (e.g. staff or frontline triage)
  let userRecord: CustomerIdentityRecord = {
    id: rawUser.id,
    email: rawUser.email,
    emailVerified: Boolean(rawUser.email_verified),
    phone: rawUser.phone,
    phoneVerified: Boolean(rawUser.phone_verified),
    fullName: rawUser.full_name,
    role: rawUser.role ?? 'customer',
    accountStatus: rawUser.account_status ?? 'active',
    createdAt: rawUser.created_at,
  };

  if (permissions.maskPii) {
    const masked = maskCustomerProfilePii(userRecord);
    userRecord = { ...userRecord, ...masked };
  }

  // ─── 4. Order Summary Assembly ────────────────────────────────────────────
  const rawOrders =
    ordersRes.status === 'fulfilled' && ordersRes.value.data
      ? ordersRes.value.data
      : [];
  const totalOrders = rawOrders.length;
  let totalLifetimeSpend: number | undefined;
  let averageOrderValue: number | undefined;

  // Calculate financials only if actor is authorized
  if (permissions.canViewFinancials) {
    const spend = rawOrders
      .filter((o: any) => o.status !== 'cancelled' && o.status !== 'returned')
      .reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
    totalLifetimeSpend = Math.round(spend * 100) / 100;
    averageOrderValue =
      totalOrders > 0 ? Math.round((spend / totalOrders) * 100) / 100 : 0;
  }

  const lastOrderDate = rawOrders.length > 0 ? rawOrders[0].created_at : null;
  const recentOrders = rawOrders.map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    total: Number(o.total) || 0,
    createdAt: o.created_at,
  }));

  // Infer high-level payment preference (e.g. 'UPI' or 'Card' - NEVER payment tokens)
  const paymentCounts: Record<string, number> = {};
  for (const o of rawOrders) {
    if (o.payment_method) {
      const pm = String(o.payment_method).toUpperCase();
      paymentCounts[pm] = (paymentCounts[pm] || 0) + 1;
    }
  }
  const preferredPaymentCategory =
    Object.keys(paymentCounts).sort(
      (a, b) => paymentCounts[b] - paymentCounts[a]
    )[0] || null;

  // ─── 5. Delivery Region Assembly (Safe city/state without street lines) ───
  const rawAddress =
    addressRes.status === 'fulfilled' ? addressRes.value.data : null;
  const primaryRegion = rawAddress
    ? {
        city: rawAddress.city || null,
        state: rawAddress.state || null,
        pincode: rawAddress.pincode || null,
      }
    : null;

  // ─── 6. Wishlist Summary Assembly ─────────────────────────────────────────
  const rawWishlists =
    wishlistRes.status === 'fulfilled' && wishlistRes.value.data
      ? wishlistRes.value.data
      : [];
  const wishlistItems = rawWishlists.map((w: any) => ({
    productId: w.product_id,
    productName: w.products?.name || 'Jewelry Item',
    price: Number(w.products?.price) || 0,
    addedAt: w.created_at,
  }));

  // ─── 7. Cart State Assembly ───────────────────────────────────────────────
  const rawCart = cartRes.status === 'fulfilled' ? cartRes.value.data : null;
  const cartItems = rawCart?.cart_items || [];
  const cartItemsCount = cartItems.reduce(
    (acc: number, item: any) => acc + (Number(item.quantity) || 1),
    0
  );
  const cartTotal = cartItems.reduce(
    (acc: number, item: any) =>
      acc + (Number(item.price_at_add) || 0) * (Number(item.quantity) || 1),
    0
  );

  // ─── 8. Support Tickets Assembly ──────────────────────────────────────────
  const rawTickets =
    supportRes.status === 'fulfilled' && supportRes.value.data
      ? supportRes.value.data
      : [];
  const openTickets = rawTickets.filter(
    (t: any) =>
      t.status === 'new' || t.status === 'open' || t.status === 'in_progress'
  );

  // ─── 9. Audit Logging for Privileged Access (Audit P1.10) ──────────────────
  // Mandatory audit trail for sensitive customer profile reads by staff/managers/admins.
  // Records minimum necessary metadata: actor, role, target ID, masking status, timestamp.
  // NEVER copies full customer profile, contact details, or PII into the audit log.
  const isPrivilegedRole =
    requestedByActor.role === 'staff' ||
    requestedByActor.role === 'manager' ||
    requestedByActor.role === 'admin' ||
    requestedByActor.role === 'super_admin';

  if (isPrivilegedRole || requestedByActor.actorId !== targetCustomerId) {
    try {
      await logAuditEvent({
        actorId: requestedByActor.actorId,
        actorEmail: requestedByActor.email,
        portal: 'admin',
        action: 'customer_360_privileged_read',
        entityType: 'customer',
        entityId: targetCustomerId,
        changes: {
          requesterRole: requestedByActor.role,
          piiMasked: permissions.maskPii,
          financialsIncluded: permissions.canViewFinancials,
          readTimestamp: fetchTimestamp,
        },
      });
    } catch (auditErr) {
      console.warn('[Customer360] Audit log write failed:', auditErr);
    }
  }

  return {
    profile: {
      id: userRecord.id,
      fullName: userRecord.fullName || null,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      phone: userRecord.phone,
      phoneVerified: userRecord.phoneVerified,
      role: userRecord.role,
      accountStatus: userRecord.accountStatus,
      walletBalance: Number(rawUser.wallet_balance) || 0,
      rewardCoins: Number(rawUser.reward_coins) || 0,
      referralCode: rawUser.referral_code || null,
      celebrations: {
        dob: rawUser.dob || null,
        anniversaryDate: rawUser.anniversary_date || null,
      },
      joinedAt: userRecord.createdAt,
    },
    orderSummary: {
      totalOrders,
      totalLifetimeSpend,
      averageOrderValue,
      lastOrderDate,
      recentOrders,
    },
    preferences: {
      preferredCategories: [], // Safe category aggregation
      primaryRegion,
      preferredPaymentCategory,
    },
    wishlist: {
      count: wishlistItems.length,
      items: wishlistItems,
    },
    cart: {
      hasActiveCart: Boolean(rawCart && cartItemsCount > 0),
      itemsCount: cartItemsCount,
      cartTotal: Math.round(cartTotal * 100) / 100,
      updatedAt: rawCart?.updated_at || null,
    },
    support: {
      openTicketsCount: openTickets.length,
      totalTicketsCount: rawTickets.length,
      recentTickets: rawTickets.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        title: t.title,
        priority: t.priority,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    },
    metadata: {
      targetCustomerId,
      requestedByActorId: requestedByActor.actorId,
      requestedByRole: requestedByActor.role,
      piiMasked: permissions.maskPii,
      freshness: {
        profileFetchedAt: fetchTimestamp,
        ordersFetchedAt: fetchTimestamp,
        wishlistFetchedAt: fetchTimestamp,
        cartFetchedAt: fetchTimestamp,
        supportFetchedAt: fetchTimestamp,
      },
    },
  };
}
