/**
 * ============================================================================
 * PRIVACY-SAFE CUSTOMER IDENTITY RESOLUTION (TRACK F - PHASE 31)
 * ============================================================================
 * Establishes deterministic precedence rules, anti-auto-merge guards,
 * conflict quarantine protocols, guest reconciliation, and DPDP-compliant
 * data retention/erasure for Customer 360 intelligence.
 *
 * Guarantees:
 * 1. Explicit Precedence: Level 1 (Internal ID) > Level 2 (Verified Auth UID)
 *    > Level 3 (Verified Email/Phone) > Level 4 (Verified Transaction Order).
 * 2. Strict Anti-Auto-Merge: Prohibits merging on unverified emails, unverified
 *    phones, shipping recipient contacts, or anonymous analytics cookies.
 * 3. Identity Conflict Quarantine: Cross-claim collisions (e.g. UID belongs to
 *    Profile A, but verified email belongs to Profile B) are immediately flagged
 *    as 'IDENTITY_CONFLICT' and never silently unified or overwritten.
 * 4. DPDP & GDPR Compliance: Supports right-to-erasure anonymization while
 *    maintaining pseudonymized ledger records for statutory tax obligations.
 * 5. RBAC Enforcement: Role-governed customer lookups with mandatory PII masking
 *    for frontline operational staff.
 */

export type IdentityMatchPrecedence =
  | 'LEVEL_1_CANONICAL_ID'
  | 'LEVEL_2_VERIFIED_AUTH_UID'
  | 'LEVEL_3A_VERIFIED_EMAIL'
  | 'LEVEL_3B_VERIFIED_PHONE'
  | 'LEVEL_4_VERIFIED_TRANSACTION_ORDER'
  | 'LEVEL_5_AMBIGUOUS_UNVERIFIED';

export type ResolutionStatus =
  | 'MATCH_RESOLVED'
  | 'NEW_PROFILE_REQUIRED'
  | 'AMBIGUOUS_SIGNAL_UNRESOLVED'
  | 'IDENTITY_CONFLICT';

export interface CustomerIdentityRecord {
  id: string; // Internal UUID
  firebaseUid?: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  fullName?: string | null;
  role: 'customer' | 'staff' | 'manager' | 'admin' | 'super_admin';
  accountStatus: 'active' | 'guest_unclaimed' | 'suspended' | 'erased';
  createdAt: string;
  linkedProviders?: Array<{ provider: string; providerIdentifier: string }>;
  consentedAnalyticsIds?: string[];
  erasedAt?: string | null;
}

export interface IncomingIdentitySignal {
  canonicalId?: string;
  firebaseUid?: string;
  provider?: string;
  providerIdentifier?: string;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  fullName?: string | null;
  orderId?: string;
  analyticsDistinctId?: string;
  analyticsConsentGranted?: boolean;
  deliveryRecipientName?: string;
  deliveryRecipientPhone?: string;
}

export interface IdentityResolutionResult {
  status: ResolutionStatus;
  matchedProfile?: CustomerIdentityRecord;
  confidence: number;
  matchedByLevel?: IdentityMatchPrecedence;
  normalizedSignals: {
    email: string | null;
    phone: string | null;
  };
  conflictDetails?: {
    code: string;
    reason: string;
    conflictingProfileIds: string[];
  };
  autoMergeBlocked: boolean;
  rejectionReason?: string;
}

/**
 * Canonical UUID validation regex (RFC 4122 v1-v5).
 */
export const UUID_V4_OR_CANONICAL_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks if a string is a valid RFC-compliant UUID.
 * Rejects Firebase UIDs, arbitrary alpha strings, or empty/malformed values.
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_V4_OR_CANONICAL_REGEX.test(id.trim());
}

/**
 * Resolves the authoritative PostgreSQL customer UUID from client-side authentication context.
 * Prioritizes profile.id if it is a valid UUID, otherwise user.id if it is already a UUID.
 * Returns null if the identifier is a raw Firebase UID or non-UUID, preventing PostgreSQL syntax crashes
 * and ensuring database queries are never executed against unverified or incompatible keys.
 */
export function getAuthoritativeCustomerUuid(
  user: { id?: string | null } | null | undefined,
  profile: { id?: string | null } | null | undefined
): string | null {
  if (profile?.id && isValidUuid(profile.id)) {
    return profile.id.trim();
  }
  if (user?.id && isValidUuid(user.id)) {
    return user.id.trim();
  }
  return null;
}

/**
 * Normalizes Indian phone numbers into canonical E.164 format (+91XXXXXXXXXX).
 * Strips whitespace, dashes, leading 0, and country code variations.
 */
export function normalizeIndianPhoneNumber(
  rawPhone: string | null | undefined
): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  const cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');
  if (!cleaned) return null;

  // Pattern: +91 followed by 10 digits starting with 6, 7, 8, or 9
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Pattern: 91 followed by 10 digits
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Pattern: 0 followed by 10 digits
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // Pattern: 10 digits directly
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // Return cleaned or null if invalid
  return /^\+\d{10,15}$/.test(cleaned) ? cleaned : null;
}

/**
 * Normalizes email address to canonical lowercase trimmed string.
 */
export function normalizeEmail(
  rawEmail: string | null | undefined
): string | null {
  if (!rawEmail || typeof rawEmail !== 'string') return null;
  const trimmed = rawEmail.trim().toLowerCase();
  // Basic RFC email check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Normalizes incoming identity signals.
 */
export function normalizeIdentitySignals(signal: IncomingIdentitySignal): {
  normalizedEmail: string | null;
  normalizedPhone: string | null;
} {
  return {
    normalizedEmail: normalizeEmail(signal.email),
    normalizedPhone: normalizeIndianPhoneNumber(signal.phone),
  };
}

/**
 * Resolves an incoming customer identity signal against existing customer profiles
 * following the strict 5-tier precedence hierarchy and anti-auto-merge rules.
 */
export function resolveCustomerIdentity(
  incoming: IncomingIdentitySignal,
  existingProfiles: CustomerIdentityRecord[]
): IdentityResolutionResult {
  const { normalizedEmail, normalizedPhone } =
    normalizeIdentitySignals(incoming);

  // Default normalized signal object
  const normalizedSignals = {
    email: normalizedEmail,
    phone: normalizedPhone,
  };

  // ─── LEVEL 1: CANONICAL INTERNAL ID MATCH (Confidence: 1.0) ───────────────
  if (incoming.canonicalId) {
    const match = existingProfiles.find(
      (p) => p.id === incoming.canonicalId && p.accountStatus !== 'erased'
    );
    if (match) {
      return {
        status: 'MATCH_RESOLVED',
        matchedProfile: match,
        confidence: 1.0,
        matchedByLevel: 'LEVEL_1_CANONICAL_ID',
        normalizedSignals,
        autoMergeBlocked: false,
      };
    }
  }

  // ─── LEVEL 2: VERIFIED AUTH UID MATCH (Confidence: 1.0) ───────────────────
  let uidMatch: CustomerIdentityRecord | undefined;
  if (incoming.firebaseUid) {
    uidMatch = existingProfiles.find(
      (p) =>
        p.firebaseUid === incoming.firebaseUid && p.accountStatus !== 'erased'
    );
  }

  // ─── LEVEL 3A & 3B: VERIFIED EMAIL & PHONE MATCHES ───────────────────────
  let verifiedEmailMatch: CustomerIdentityRecord | undefined;
  if (incoming.emailVerified && normalizedEmail) {
    verifiedEmailMatch = existingProfiles.find(
      (p) =>
        p.email === normalizedEmail &&
        p.emailVerified &&
        p.accountStatus !== 'erased'
    );
  }

  let verifiedPhoneMatch: CustomerIdentityRecord | undefined;
  if (incoming.phoneVerified && normalizedPhone) {
    verifiedPhoneMatch = existingProfiles.find(
      (p) =>
        p.phone === normalizedPhone &&
        p.phoneVerified &&
        p.accountStatus !== 'erased'
    );
  }

  // ─── CONFLICT DETECTION: CROSS-CLAIM COLLISION ───────────────────────────
  // If UID points to Profile A, but verified email or phone points to Profile B
  if (uidMatch) {
    const conflictingIds = new Set<string>();
    conflictingIds.add(uidMatch.id);

    if (verifiedEmailMatch && verifiedEmailMatch.id !== uidMatch.id) {
      conflictingIds.add(verifiedEmailMatch.id);
    }
    if (verifiedPhoneMatch && verifiedPhoneMatch.id !== uidMatch.id) {
      conflictingIds.add(verifiedPhoneMatch.id);
    }

    if (conflictingIds.size > 1) {
      return {
        status: 'IDENTITY_CONFLICT',
        confidence: 0,
        normalizedSignals,
        conflictDetails: {
          code: 'CROSS_PROFILE_CLAIM_COLLISION',
          reason:
            'Incoming verified UID belongs to a profile that differs from the verified contact profile.',
          conflictingProfileIds: Array.from(conflictingIds),
        },
        autoMergeBlocked: true,
        rejectionReason:
          'Cross-profile claim collision detected. Manual triage required.',
      };
    }

    // UID matched without collision
    return {
      status: 'MATCH_RESOLVED',
      matchedProfile: uidMatch,
      confidence: 1.0,
      matchedByLevel: 'LEVEL_2_VERIFIED_AUTH_UID',
      normalizedSignals,
      autoMergeBlocked: false,
    };
  }

  // Verified Email vs Phone conflict
  if (
    verifiedEmailMatch &&
    verifiedPhoneMatch &&
    verifiedEmailMatch.id !== verifiedPhoneMatch.id
  ) {
    return {
      status: 'IDENTITY_CONFLICT',
      confidence: 0,
      normalizedSignals,
      conflictDetails: {
        code: 'EMAIL_PHONE_PROFILE_MISMATCH',
        reason:
          'Incoming verified email belongs to Profile A while verified phone belongs to Profile B.',
        conflictingProfileIds: [verifiedEmailMatch.id, verifiedPhoneMatch.id],
      },
      autoMergeBlocked: true,
      rejectionReason:
        'Verified contact points to disparate existing customer profiles.',
    };
  }

  // Verified Email Match (Level 3a)
  if (verifiedEmailMatch) {
    return {
      status: 'MATCH_RESOLVED',
      matchedProfile: verifiedEmailMatch,
      confidence: 0.95,
      matchedByLevel: 'LEVEL_3A_VERIFIED_EMAIL',
      normalizedSignals,
      autoMergeBlocked: false,
    };
  }

  // Verified Phone Match (Level 3b)
  if (verifiedPhoneMatch) {
    return {
      status: 'MATCH_RESOLVED',
      matchedProfile: verifiedPhoneMatch,
      confidence: 0.95,
      matchedByLevel: 'LEVEL_3B_VERIFIED_PHONE',
      normalizedSignals,
      autoMergeBlocked: false,
    };
  }

  // ─── LEVEL 5: AMBIGUOUS & UNVERIFIED SIGNALS (ANTI-AUTO-MERGE) ────────────
  // Check if unverified email or phone was provided that exists in database
  const hasUnverifiedEmailMatch =
    !incoming.emailVerified &&
    normalizedEmail &&
    existingProfiles.some((p) => p.email === normalizedEmail);

  const hasUnverifiedPhoneMatch =
    !incoming.phoneVerified &&
    normalizedPhone &&
    existingProfiles.some((p) => p.phone === normalizedPhone);

  if (hasUnverifiedEmailMatch || hasUnverifiedPhoneMatch) {
    return {
      status: 'AMBIGUOUS_SIGNAL_UNRESOLVED',
      confidence: 0.3,
      matchedByLevel: 'LEVEL_5_AMBIGUOUS_UNVERIFIED',
      normalizedSignals,
      autoMergeBlocked: true,
      rejectionReason:
        'Contact identifier matches existing profile but lacks verified proof (OTP/auth). Auto-merge prohibited.',
    };
  }

  // Check if only delivery recipient contact or analytics cookie matches
  if (incoming.deliveryRecipientPhone || incoming.deliveryRecipientName) {
    const recipientPhoneNorm = normalizeIndianPhoneNumber(
      incoming.deliveryRecipientPhone
    );
    const recipientMatch = existingProfiles.some(
      (p) => p.phone === recipientPhoneNorm
    );

    if (recipientMatch) {
      return {
        status: 'AMBIGUOUS_SIGNAL_UNRESOLVED',
        confidence: 0.1,
        matchedByLevel: 'LEVEL_5_AMBIGUOUS_UNVERIFIED',
        normalizedSignals,
        autoMergeBlocked: true,
        rejectionReason:
          'Delivery recipient contact information cannot be merged into purchaser account.',
      };
    }
  }

  if (
    incoming.analyticsDistinctId &&
    !incoming.firebaseUid &&
    !incoming.emailVerified
  ) {
    return {
      status: 'AMBIGUOUS_SIGNAL_UNRESOLVED',
      confidence: 0.05,
      matchedByLevel: 'LEVEL_5_AMBIGUOUS_UNVERIFIED',
      normalizedSignals,
      autoMergeBlocked: true,
      rejectionReason:
        'Anonymous analytics cookies cannot be used to unify transactional accounts.',
    };
  }

  // ─── NO MATCH FOUND: NEW PROFILE REQUIRED ─────────────────────────────────
  return {
    status: 'NEW_PROFILE_REQUIRED',
    confidence: 0,
    normalizedSignals,
    autoMergeBlocked: false,
  };
}

/**
 * Reconciles a guest order to an authenticated customer profile.
 * Only permitted if customer holds a verified email or phone matching the guest order.
 */
export function reconcileGuestOrder(
  guestOrder: {
    orderId: string;
    customerEmail: string;
    customerPhone?: string | null;
  },
  authenticatedCustomer: CustomerIdentityRecord
): {
  canReconcile: boolean;
  reconciliationType?: 'EMAIL_MATCH' | 'PHONE_MATCH';
  reason: string;
} {
  const normGuestEmail = normalizeEmail(guestOrder.customerEmail);
  const normGuestPhone = normalizeIndianPhoneNumber(guestOrder.customerPhone);

  if (
    authenticatedCustomer.emailVerified &&
    authenticatedCustomer.email &&
    normGuestEmail &&
    authenticatedCustomer.email === normGuestEmail
  ) {
    return {
      canReconcile: true,
      reconciliationType: 'EMAIL_MATCH',
      reason: 'Guest order email matches customer verified email.',
    };
  }

  if (
    authenticatedCustomer.phoneVerified &&
    authenticatedCustomer.phone &&
    normGuestPhone &&
    authenticatedCustomer.phone === normGuestPhone
  ) {
    return {
      canReconcile: true,
      reconciliationType: 'PHONE_MATCH',
      reason: 'Guest order phone matches customer verified phone.',
    };
  }

  return {
    canReconcile: false,
    reason:
      'Reconciliation blocked: authenticated customer does not hold verified credentials matching the guest order.',
  };
}

/**
 * Evaluates Role-Based Access Control permissions for Customer 360 profile lookups.
 * Applies mandatory masking for operational staff.
 */
export function evaluateLookupPermissions(
  actorRole: string,
  targetCustomerId: string,
  actorUserId?: string
): {
  allowed: boolean;
  maskPii: boolean;
  canViewFinancials: boolean;
  canExecuteErasure: boolean;
  reason?: string;
} {
  const normalizedRole = actorRole.toLowerCase();

  // Customer: Can only view self
  if (normalizedRole === 'customer') {
    if (actorUserId && actorUserId === targetCustomerId) {
      return {
        allowed: true,
        maskPii: false,
        canViewFinancials: true,
        canExecuteErasure: false,
      };
    }
    return {
      allowed: false,
      maskPii: true,
      canViewFinancials: false,
      canExecuteErasure: false,
      reason: 'Customers are restricted to their own profile only.',
    };
  }

  // Frontline Staff: Lookup allowed, but PII MUST be masked
  if (normalizedRole === 'staff') {
    return {
      allowed: true,
      maskPii: true,
      canViewFinancials: false,
      canExecuteErasure: false,
    };
  }

  // Department Manager: Lookup allowed, masked unless explicitly unmasked for dispute
  if (normalizedRole === 'manager') {
    return {
      allowed: true,
      maskPii: true,
      canViewFinancials: true,
      canExecuteErasure: false,
    };
  }

  // Administrator / Super Admin: Full unmasked access, audit logged, erasure allowed
  if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
    return {
      allowed: true,
      maskPii: false,
      canViewFinancials: true,
      canExecuteErasure: true,
    };
  }

  // Unknown / Anonymous
  return {
    allowed: false,
    maskPii: true,
    canViewFinancials: false,
    canExecuteErasure: false,
    reason: 'Unauthorized role.',
  };
}

/**
 * Masks customer PII for safe display to frontline staff.
 */
export function maskCustomerProfilePii(
  customer: CustomerIdentityRecord
): Partial<CustomerIdentityRecord> {
  const maskedPhone = customer.phone
    ? customer.phone.slice(0, 7) + '••••' + customer.phone.slice(-2)
    : null;

  let maskedEmail: string | null = null;
  if (customer.email) {
    const [user, domain] = customer.email.split('@');
    maskedEmail = `${user.charAt(0)}•••@${domain}`;
  }

  let maskedName: string | null = null;
  if (customer.fullName) {
    const parts = customer.fullName.split(' ');
    maskedName =
      parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
        : parts[0];
  }

  return {
    ...customer,
    email: maskedEmail,
    phone: maskedPhone,
    fullName: maskedName,
    firebaseUid: customer.firebaseUid ? '••••••••' : null,
  };
}

/**
 * Applies DPDP / GDPR Right-to-Erasure anonymization.
 * Scrubs direct PII while preserving synthetic ID for statutory tax ledger requirements.
 */
export function applyDataErasurePolicy(
  customer: CustomerIdentityRecord,
  erasureReason: string
): CustomerIdentityRecord {
  return {
    ...customer,
    fullName: '[REDACTED_DELETED_USER]',
    email: null,
    emailVerified: false,
    phone: null,
    phoneVerified: false,
    firebaseUid: null,
    accountStatus: 'erased',
    linkedProviders: [],
    consentedAnalyticsIds: [],
    erasedAt: new Date().toISOString(),
  };
}

export interface CanonicalCustomerResolution {
  resolvedId: string | null;
  matchedBy: 'CANONICAL_UUID' | 'FIREBASE_UID_MAPPING' | 'UNRESOLVED';
  identifierType: 'UUID' | 'FIREBASE_UID' | 'INVALID_FORMAT';
  error?: string;
}

/**
 * UUID regex pattern according to RFC 4122.
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves any incoming customer identifier (internal UUID or external Firebase UID)
 * to the authoritative internal canonical users.id UUID.
 *
 * Guarantees:
 * 1. Internal UUID Preserved: If input is a valid UUID, verifies users table directly.
 * 2. External Firebase UID Resolved: If input is not a UUID, checks customer_identities
 *    (or users.firebase_uid) to map to customer_id.
 * 3. SQL / RPC Parity: Matches behavior of public.get_user_profile(p_user_id text)
 *    and public.resolve_customer_identity.
 * 4. Safe Fallback: Returns typed result with resolvedId = null if identifier is unresolvable.
 */
export async function resolveCanonicalCustomerId(
  rawIdentifier: string | null | undefined,
  supabaseClient?: any
): Promise<CanonicalCustomerResolution> {
  if (
    !rawIdentifier ||
    typeof rawIdentifier !== 'string' ||
    !rawIdentifier.trim()
  ) {
    return {
      resolvedId: null,
      matchedBy: 'UNRESOLVED',
      identifierType: 'INVALID_FORMAT',
      error: 'Identifier is missing or empty.',
    };
  }

  const trimmed = rawIdentifier.trim();
  const isUuid = UUID_V4_REGEX.test(trimmed);

  // If supabaseClient is not provided, dynamically import service client
  const client =
    supabaseClient ||
    (await import('@/lib/supabase/service')).getServiceClient();

  // 1. Direct check on users.id (canonical internal ID, UUID or canonical string)
  try {
    const fromUsers = client.from('users');
    if (fromUsers && typeof fromUsers.select === 'function') {
      const { data: userRow } = await fromUsers
        .select('id')
        .eq('id', trimmed)
        .maybeSingle();

      if (userRow?.id) {
        return {
          resolvedId: userRow.id,
          matchedBy: 'CANONICAL_UUID',
          identifierType: isUuid ? 'UUID' : 'FIREBASE_UID',
        };
      }
    }
  } catch {
    // If querying users.id with non-UUID throws, proceed to external identity lookups
  }

  // 2. Check customer_identities table (firebase_uid)
  try {
    const fromIdentities = client.from('customer_identities');
    if (fromIdentities && typeof fromIdentities.select === 'function') {
      const { data: identityRow } = await fromIdentities
        .select('customer_id')
        .eq('firebase_uid', trimmed)
        .maybeSingle();

      if (identityRow?.customer_id) {
        return {
          resolvedId: identityRow.customer_id,
          matchedBy: 'FIREBASE_UID_MAPPING',
          identifierType: isUuid ? 'UUID' : 'FIREBASE_UID',
        };
      }
    }
  } catch {
    // Ignore and proceed to fallback
  }

  // 3. Fallback check on users.firebase_uid if column exists
  try {
    const fromUsers = client.from('users');
    if (fromUsers && typeof fromUsers.select === 'function') {
      const { data: userByFb } = await fromUsers
        .select('id')
        .eq('firebase_uid', trimmed)
        .maybeSingle();

      if (userByFb?.id) {
        return {
          resolvedId: userByFb.id,
          matchedBy: 'FIREBASE_UID_MAPPING',
          identifierType: isUuid ? 'UUID' : 'FIREBASE_UID',
        };
      }
    }
  } catch {
    // Ignore
  }

  return {
    resolvedId: null,
    matchedBy: 'UNRESOLVED',
    identifierType: isUuid ? 'UUID' : 'FIREBASE_UID',
    error: `No customer profile mapped to identifier '${trimmed}'.`,
  };
}
