import {
  normalizeIndianPhoneNumber,
  normalizeEmail,
  normalizeIdentitySignals,
  resolveCustomerIdentity,
  reconcileGuestOrder,
  evaluateLookupPermissions,
  maskCustomerProfilePii,
  applyDataErasurePolicy,
  resolveCanonicalCustomerId,
  isValidUuid,
  getAuthoritativeCustomerUuid,
  type CustomerIdentityRecord,
  type IncomingIdentitySignal,
} from '../customer-identity-resolution';

describe('Privacy-Safe Customer Identity Resolution (Track F - Phase 31)', () => {
  const profileAlice: CustomerIdentityRecord = {
    id: 'usr_alice_001',
    firebaseUid: 'fb_uid_alice_123',
    email: 'alice@example.com',
    emailVerified: true,
    phone: '+919830111111',
    phoneVerified: true,
    fullName: 'Alice Roy',
    role: 'customer',
    accountStatus: 'active',
    createdAt: '2026-01-15T10:00:00.000Z',
    linkedProviders: [
      { provider: 'google.com', providerIdentifier: 'alice@example.com' },
    ],
  };

  const profileBob: CustomerIdentityRecord = {
    id: 'usr_bob_002',
    firebaseUid: 'fb_uid_bob_456',
    email: 'bob@example.com',
    emailVerified: true,
    phone: '+919830222222',
    phoneVerified: true,
    fullName: 'Bob Sen',
    role: 'customer',
    accountStatus: 'active',
    createdAt: '2026-02-20T11:00:00.000Z',
    linkedProviders: [
      { provider: 'password', providerIdentifier: 'bob@example.com' },
    ],
  };

  const sampleProfiles = [profileAlice, profileBob];

  describe('Signal Normalization (Phone & Email)', () => {
    it('normalizes various Indian phone formats to standard E.164 (+91XXXXXXXXXX)', () => {
      expect(normalizeIndianPhoneNumber('+91 98301 11111')).toBe(
        '+919830111111'
      );
      expect(normalizeIndianPhoneNumber('098301-11111')).toBe('+919830111111');
      expect(normalizeIndianPhoneNumber('9830111111')).toBe('+919830111111');
      expect(normalizeIndianPhoneNumber('919830111111')).toBe('+919830111111');
    });

    it('rejects invalid or non-numeric phone strings', () => {
      expect(normalizeIndianPhoneNumber('invalid-phone')).toBeNull();
      expect(normalizeIndianPhoneNumber('12345')).toBeNull();
      expect(normalizeIndianPhoneNumber('')).toBeNull();
      expect(normalizeIndianPhoneNumber(null)).toBeNull();
    });

    it('canonicalizes email addresses with trimming and lowercase conversion', () => {
      expect(normalizeEmail('  Alice.Roy@Example.COM  ')).toBe(
        'alice.roy@example.com'
      );
      expect(normalizeEmail('BOB@GMAIL.COM')).toBe('bob@gmail.com');
      expect(normalizeEmail('invalid-email')).toBeNull();
      expect(normalizeEmail('')).toBeNull();
    });
  });

  describe('Precedence-Based Identity Matching', () => {
    it('Level 1: resolves immediately on canonical internal UUID match with 1.0 confidence', () => {
      const signal: IncomingIdentitySignal = {
        canonicalId: 'usr_alice_001',
      };

      const result = resolveCustomerIdentity(signal, sampleProfiles);

      expect(result.status).toBe('MATCH_RESOLVED');
      expect(result.matchedByLevel).toBe('LEVEL_1_CANONICAL_ID');
      expect(result.confidence).toBe(1.0);
      expect(result.matchedProfile?.id).toBe('usr_alice_001');
      expect(result.autoMergeBlocked).toBe(false);
    });

    it('Level 2: resolves on verified Firebase UID match with 1.0 confidence', () => {
      const signal: IncomingIdentitySignal = {
        firebaseUid: 'fb_uid_alice_123',
      };

      const result = resolveCustomerIdentity(signal, sampleProfiles);

      expect(result.status).toBe('MATCH_RESOLVED');
      expect(result.matchedByLevel).toBe('LEVEL_2_VERIFIED_AUTH_UID');
      expect(result.confidence).toBe(1.0);
      expect(result.matchedProfile?.id).toBe('usr_alice_001');
    });

    it('Level 3a: resolves on verified email match with 0.95 confidence', () => {
      const signal: IncomingIdentitySignal = {
        email: '  Alice@Example.COM ',
        emailVerified: true,
      };

      const result = resolveCustomerIdentity(signal, sampleProfiles);

      expect(result.status).toBe('MATCH_RESOLVED');
      expect(result.matchedByLevel).toBe('LEVEL_3A_VERIFIED_EMAIL');
      expect(result.confidence).toBe(0.95);
      expect(result.matchedProfile?.id).toBe('usr_alice_001');
    });

    it('Level 3b: resolves on verified phone match with 0.95 confidence', () => {
      const signal: IncomingIdentitySignal = {
        phone: '098302-22222',
        phoneVerified: true,
      };

      const result = resolveCustomerIdentity(signal, sampleProfiles);

      expect(result.status).toBe('MATCH_RESOLVED');
      expect(result.matchedByLevel).toBe('LEVEL_3B_VERIFIED_PHONE');
      expect(result.confidence).toBe(0.95);
      expect(result.matchedProfile?.id).toBe('usr_bob_002');
    });

    it('returns NEW_PROFILE_REQUIRED when verified signals match no existing account', () => {
      const signal: IncomingIdentitySignal = {
        firebaseUid: 'fb_uid_new_999',
        email: 'charlie@example.com',
        emailVerified: true,
      };

      const result = resolveCustomerIdentity(signal, sampleProfiles);

      expect(result.status).toBe('NEW_PROFILE_REQUIRED');
      expect(result.confidence).toBe(0);
      expect(result.autoMergeBlocked).toBe(false);
    });
  });

  describe('Disambiguation & Anti-Auto-Merge Rules', () => {
    it('STRICTLY PROHIBITS auto-merge when email matches but is unverified', () => {
      const unverifiedSignal: IncomingIdentitySignal = {
        email: 'alice@example.com', // Matches Alice, but NOT verified!
        emailVerified: false,
      };

      const result = resolveCustomerIdentity(unverifiedSignal, sampleProfiles);

      expect(result.status).toBe('AMBIGUOUS_SIGNAL_UNRESOLVED');
      expect(result.matchedByLevel).toBe('LEVEL_5_AMBIGUOUS_UNVERIFIED');
      expect(result.autoMergeBlocked).toBe(true);
      expect(result.matchedProfile).toBeUndefined();
      expect(result.rejectionReason).toContain('lacks verified proof');
    });

    it('STRICTLY PROHIBITS auto-merge when phone matches but is unverified', () => {
      const unverifiedSignal: IncomingIdentitySignal = {
        phone: '+919830222222', // Matches Bob, but NOT verified!
        phoneVerified: false,
      };

      const result = resolveCustomerIdentity(unverifiedSignal, sampleProfiles);

      expect(result.status).toBe('AMBIGUOUS_SIGNAL_UNRESOLVED');
      expect(result.matchedByLevel).toBe('LEVEL_5_AMBIGUOUS_UNVERIFIED');
      expect(result.autoMergeBlocked).toBe(true);
      expect(result.matchedProfile).toBeUndefined();
    });

    it('does not merge purchaser profile with delivery recipient contact info', () => {
      const giftOrderSignal: IncomingIdentitySignal = {
        deliveryRecipientPhone: '+919830111111', // Recipient is Alice, but purchaser is someone else
        deliveryRecipientName: 'Alice Roy',
      };

      const result = resolveCustomerIdentity(giftOrderSignal, sampleProfiles);

      expect(result.status).toBe('AMBIGUOUS_SIGNAL_UNRESOLVED');
      expect(result.autoMergeBlocked).toBe(true);
      expect(result.rejectionReason).toContain(
        'Delivery recipient contact information cannot be merged'
      );
    });

    it('prohibits unifying transactional accounts on anonymous analytics cookies alone', () => {
      const cookieSignal: IncomingIdentitySignal = {
        analyticsDistinctId: 'posthog_distinct_cookie_9988',
      };

      const result = resolveCustomerIdentity(cookieSignal, sampleProfiles);

      expect(result.status).toBe('AMBIGUOUS_SIGNAL_UNRESOLVED');
      expect(result.autoMergeBlocked).toBe(true);
      expect(result.rejectionReason).toContain(
        'Anonymous analytics cookies cannot be used'
      );
    });
  });

  describe('Identity Conflict & Quarantine Protocol', () => {
    it('detects cross-profile collision when verified UID belongs to Profile A but verified email belongs to Profile B', () => {
      const conflictingSignal: IncomingIdentitySignal = {
        firebaseUid: 'fb_uid_alice_123', // Belongs to Alice
        email: 'bob@example.com', // Belongs to Bob
        emailVerified: true,
      };

      const result = resolveCustomerIdentity(conflictingSignal, sampleProfiles);

      expect(result.status).toBe('IDENTITY_CONFLICT');
      expect(result.confidence).toBe(0);
      expect(result.autoMergeBlocked).toBe(true);
      expect(result.conflictDetails?.code).toBe(
        'CROSS_PROFILE_CLAIM_COLLISION'
      );
      expect(result.conflictDetails?.conflictingProfileIds).toEqual(
        expect.arrayContaining(['usr_alice_001', 'usr_bob_002'])
      );
    });

    it('detects conflict when verified email and verified phone point to disparate profiles', () => {
      const conflictingSignal: IncomingIdentitySignal = {
        email: 'alice@example.com', // Alice
        emailVerified: true,
        phone: '+919830222222', // Bob
        phoneVerified: true,
      };

      const result = resolveCustomerIdentity(conflictingSignal, sampleProfiles);

      expect(result.status).toBe('IDENTITY_CONFLICT');
      expect(result.confidence).toBe(0);
      expect(result.autoMergeBlocked).toBe(true);
      expect(result.conflictDetails?.code).toBe('EMAIL_PHONE_PROFILE_MISMATCH');
    });
  });

  describe('Guest Order Reconciliation', () => {
    it('permits guest order reconciliation if customer holds matching verified email', () => {
      const guestOrder = {
        orderId: 'ord_guest_101',
        customerEmail: 'alice@example.com',
      };

      const result = reconcileGuestOrder(guestOrder, profileAlice);

      expect(result.canReconcile).toBe(true);
      expect(result.reconciliationType).toBe('EMAIL_MATCH');
    });

    it('permits guest order reconciliation if customer holds matching verified phone', () => {
      const guestOrder = {
        orderId: 'ord_guest_102',
        customerEmail: 'random_guest@example.com',
        customerPhone: '098302-22222',
      };

      const result = reconcileGuestOrder(guestOrder, profileBob);

      expect(result.canReconcile).toBe(true);
      expect(result.reconciliationType).toBe('PHONE_MATCH');
    });

    it('rejects guest order reconciliation if customer has unverified credentials', () => {
      const unverifiedAlice: CustomerIdentityRecord = {
        ...profileAlice,
        emailVerified: false,
      };

      const guestOrder = {
        orderId: 'ord_guest_103',
        customerEmail: 'alice@example.com',
      };

      const result = reconcileGuestOrder(guestOrder, unverifiedAlice);

      expect(result.canReconcile).toBe(false);
      expect(result.reason).toContain('does not hold verified credentials');
    });
  });

  describe('Role-Based Access Control & PII Masking', () => {
    it('restricts customer to their own profile only', () => {
      const selfAccess = evaluateLookupPermissions(
        'customer',
        'usr_alice_001',
        'usr_alice_001'
      );
      expect(selfAccess.allowed).toBe(true);
      expect(selfAccess.maskPii).toBe(false);

      const otherAccess = evaluateLookupPermissions(
        'customer',
        'usr_bob_002',
        'usr_alice_001'
      );
      expect(otherAccess.allowed).toBe(false);
      expect(otherAccess.reason).toContain('restricted to their own profile');
    });

    it('allows staff lookups with mandatory PII masking and blocked financial margins', () => {
      const staffAccess = evaluateLookupPermissions(
        'staff',
        'usr_alice_001',
        'staff_usr_99'
      );
      expect(staffAccess.allowed).toBe(true);
      expect(staffAccess.maskPii).toBe(true);
      expect(staffAccess.canViewFinancials).toBe(false);
      expect(staffAccess.canExecuteErasure).toBe(false);
    });

    it('allows administrators full unmasked access and erasure capability', () => {
      const adminAccess = evaluateLookupPermissions(
        'admin',
        'usr_alice_001',
        'admin_usr_01'
      );
      expect(adminAccess.allowed).toBe(true);
      expect(adminAccess.maskPii).toBe(false);
      expect(adminAccess.canViewFinancials).toBe(true);
      expect(adminAccess.canExecuteErasure).toBe(true);
    });

    it('masks PII strings properly for staff display', () => {
      const masked = maskCustomerProfilePii(profileAlice);
      expect(masked.phone).toBe('+919830••••11');
      expect(masked.email).toBe('a•••@example.com');
      expect(masked.fullName).toBe('Alice R.');
      expect(masked.firebaseUid).toBe('••••••••');
    });
  });

  describe('DPDP Act & GDPR Right-to-Erasure', () => {
    it('erases direct PII while preserving internal UUID for statutory ledger retention', () => {
      const erased = applyDataErasurePolicy(
        profileAlice,
        'User formal erasure request'
      );

      expect(erased.id).toBe('usr_alice_001'); // Retained for accounting/GST records
      expect(erased.fullName).toBe('[REDACTED_DELETED_USER]');
      expect(erased.email).toBeNull();
      expect(erased.phone).toBeNull();
      expect(erased.firebaseUid).toBeNull();
      expect(erased.emailVerified).toBe(false);
      expect(erased.accountStatus).toBe('erased');
      expect(erased.erasedAt).toBeDefined();
    });

    it('ignores erased customer records in subsequent identity matching lookups', () => {
      const erasedAlice = applyDataErasurePolicy(profileAlice, 'Erasure test');
      const profilesWithErased = [erasedAlice, profileBob];

      const signal: IncomingIdentitySignal = {
        canonicalId: 'usr_alice_001',
      };

      const result = resolveCustomerIdentity(signal, profilesWithErased);

      expect(result.status).toBe('NEW_PROFILE_REQUIRED');
      expect(result.matchedProfile).toBeUndefined();
    });
  });

  describe('Canonical Customer ID Resolution Helper (Phase 36)', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const firebaseUid = 'W9zB8xK7qL2mN5pT1vR4yX6zC3';

    it('resolves internal canonical UUID directly from users table', async () => {
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: { id: validUuid } }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const result = await resolveCanonicalCustomerId(
        validUuid,
        mockSupabase as any
      );
      expect(result.resolvedId).toBe(validUuid);
      expect(result.matchedBy).toBe('CANONICAL_UUID');
      expect(result.identifierType).toBe('UUID');
    });

    it('resolves external Firebase UID to internal UUID via customer_identities table', async () => {
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                }),
              }),
            };
          }
          if (table === 'customer_identities') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: { customer_id: validUuid } }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const result = await resolveCanonicalCustomerId(
        firebaseUid,
        mockSupabase as any
      );
      expect(result.resolvedId).toBe(validUuid);
      expect(result.matchedBy).toBe('FIREBASE_UID_MAPPING');
      expect(result.identifierType).toBe('FIREBASE_UID');
    });

    it('resolves via fallback users.firebase_uid column if customer_identities is not yet indexed', async () => {
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'customer_identities') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                }),
              }),
            };
          }
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest
                  .fn()
                  .mockImplementation((col: string, val: string) => ({
                    maybeSingle: jest.fn().mockImplementation(async () => {
                      if (col === 'firebase_uid' && val === firebaseUid) {
                        return { data: { id: validUuid } };
                      }
                      return { data: null };
                    }),
                  })),
              }),
            };
          }
          return {};
        }),
      };

      const result = await resolveCanonicalCustomerId(
        firebaseUid,
        mockSupabase as any
      );
      expect(result.resolvedId).toBe(validUuid);
      expect(result.matchedBy).toBe('FIREBASE_UID_MAPPING');
    });

    it('returns unresolved state when identifier matches neither users nor customer_identities', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      };

      const result = await resolveCanonicalCustomerId(
        'unknown_identifier',
        mockSupabase as any
      );
      expect(result.resolvedId).toBeNull();
      expect(result.matchedBy).toBe('UNRESOLVED');
      expect(result.error).toContain('No customer profile mapped');
    });

    it('handles empty, null, or whitespace identifier safely without throwing', async () => {
      const resultNull = await resolveCanonicalCustomerId(null);
      expect(resultNull.resolvedId).toBeNull();
      expect(resultNull.identifierType).toBe('INVALID_FORMAT');

      const resultEmpty = await resolveCanonicalCustomerId('   ');
      expect(resultEmpty.resolvedId).toBeNull();
      expect(resultEmpty.identifierType).toBe('INVALID_FORMAT');
    });
  });

  describe('Authoritative Customer UUID & Validation (Phase 52)', () => {
    it('accurately validates standard RFC 4122 v1-v5 UUIDs and rejects Firebase UIDs or malformed IDs', () => {
      // Valid UUIDs
      expect(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
      expect(isValidUuid('7b19dc62-1e9a-4c9f-8643-26a1b2496a84')).toBe(true);
      expect(isValidUuid('   7b19dc62-1e9a-4c9f-8643-26a1b2496a84   ')).toBe(
        true
      );

      // Firebase UIDs or invalid non-UUID identifiers
      expect(isValidUuid('fb_uid_alice_123')).toBe(false);
      expect(isValidUuid('auth0|1234567890')).toBe(false);
      expect(isValidUuid('12345')).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
      expect(isValidUuid('invalid-uuid-format-here-1234')).toBe(false);
    });

    it('extracts authoritative customer UUID when profile contains a valid UUID', () => {
      const user = { id: 'fb_user_12345' };
      const profile = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' };

      const resolved = getAuthoritativeCustomerUuid(user, profile);
      expect(resolved).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    });

    it('falls back to user.id if it is already a valid UUID (e.g. native Supabase session)', () => {
      const user = { id: '7b19dc62-1e9a-4c9f-8643-26a1b2496a84' };
      const profile = null;

      const resolved = getAuthoritativeCustomerUuid(user, profile);
      expect(resolved).toBe('7b19dc62-1e9a-4c9f-8643-26a1b2496a84');
    });

    it('returns null when neither profile nor user contains a valid UUID, preventing Postgres 22P02 crashes', () => {
      const user = { id: 'fb_user_random_alpha_uid' };
      const profile = { id: 'fb_user_random_alpha_uid' }; // fallback profile created with Firebase UID

      const resolved = getAuthoritativeCustomerUuid(user, profile);
      expect(resolved).toBeNull();
    });

    it('returns null safely when user and profile are null/undefined', () => {
      expect(getAuthoritativeCustomerUuid(null, null)).toBeNull();
      expect(getAuthoritativeCustomerUuid(undefined, undefined)).toBeNull();
    });
  });
});
