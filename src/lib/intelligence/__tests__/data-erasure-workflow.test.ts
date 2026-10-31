jest.mock('server-only', () => ({}));

import {
  applyDataErasurePolicy,
  resolveCustomerIdentity,
  type CustomerIdentityRecord,
} from '../customer-identity-resolution';

/**
 * Data Erasure & Statutory Retention Policy Classifier (Phase 38)
 */
export type ErasureClassification =
  'ERASABLE_PII' | 'RETAINED_STATUTORY_TAX' | 'SYSTEM_STATE' | 'AUDIT_EVIDENCE';

export function classifyCustomerFieldPolicy(
  table: string,
  field: string
): ErasureClassification {
  if (
    table === 'orders' ||
    table === 'order_items' ||
    table === 'wallet_ledger'
  ) {
    return 'RETAINED_STATUTORY_TAX';
  }
  if (table === 'audit_logs') {
    return 'AUDIT_EVIDENCE';
  }
  if (table === 'users') {
    if (field === 'id') return 'RETAINED_STATUTORY_TAX';
    if (field === 'account_status' || field === 'role') return 'SYSTEM_STATE';
    return 'ERASABLE_PII';
  }
  if (table === 'addresses' || table === 'carts' || table === 'wishlists') {
    return 'ERASABLE_PII';
  }
  if (table === 'customer_identities') {
    return 'ERASABLE_PII';
  }
  return 'ERASABLE_PII';
}

describe('Customer Data-Erasure Workflow Audit & Planning (Phase 38 - Track H)', () => {
  const activeCustomer: CustomerIdentityRecord = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firebaseUid: 'W9zB8xK7qL2mN5pT1vR4yX6zC3',
    email: 'priya.sharma@example.com',
    emailVerified: true,
    phone: '+919830099999',
    phoneVerified: true,
    fullName: 'Priya Sharma',
    role: 'customer',
    accountStatus: 'active',
    createdAt: '2025-06-15T10:00:00.000Z',
    linkedProviders: [
      {
        provider: 'google.com',
        providerIdentifier: 'priya.sharma@example.com',
      },
    ],
  };

  describe('1. In-Memory Erasure Policy Helper Verification', () => {
    it('anonymizes direct personal identifiable information (PII)', () => {
      const erased = applyDataErasurePolicy(
        activeCustomer,
        'Customer requested erasure under DPDP Act'
      );

      expect(erased.fullName).toBe('[REDACTED_DELETED_USER]');
      expect(erased.email).toBeNull();
      expect(erased.phone).toBeNull();
      expect(erased.firebaseUid).toBeNull();
      expect(erased.linkedProviders).toHaveLength(0);
      expect(erased.accountStatus).toBe('erased');
      expect(erased.erasedAt).toBeDefined();
    });

    it('strictly preserves internal canonical UUID for statutory accounting/GST linkages', () => {
      const erased = applyDataErasurePolicy(activeCustomer, 'Erasure test');

      // Internal UUID must NOT be nullified or randomized, so existing historical tax invoices
      // remain joined to an anonymized ledger rather than causing relational database corruption.
      expect(erased.id).toBe(activeCustomer.id);
    });

    it('ensures erased accounts are completely quarantined from subsequent auth matching', () => {
      const erased = applyDataErasurePolicy(activeCustomer, 'Erasure test');
      const existingProfiles = [erased];

      const incomingSignal = {
        canonicalId: activeCustomer.id,
      };

      const result = resolveCustomerIdentity(incomingSignal, existingProfiles);

      // Must be rejected as a new profile, never restoring access to deleted user
      expect(result.status).toBe('NEW_PROFILE_REQUIRED');
      expect(result.matchedProfile).toBeUndefined();
    });
  });

  describe('2. Field-by-Field Statutory vs Erasable Classification', () => {
    it('classifies direct customer contact attributes as ERASABLE_PII', () => {
      expect(classifyCustomerFieldPolicy('users', 'full_name')).toBe(
        'ERASABLE_PII'
      );
      expect(classifyCustomerFieldPolicy('users', 'email')).toBe(
        'ERASABLE_PII'
      );
      expect(classifyCustomerFieldPolicy('users', 'phone')).toBe(
        'ERASABLE_PII'
      );
      expect(classifyCustomerFieldPolicy('addresses', 'address_line1')).toBe(
        'ERASABLE_PII'
      );
      expect(
        classifyCustomerFieldPolicy('customer_identities', 'firebase_uid')
      ).toBe('ERASABLE_PII');
    });

    it('classifies transactional orders and financial ledgers as RETAINED_STATUTORY_TAX', () => {
      // Mandated by Section 36 of CGST Act (72 months retention)
      expect(classifyCustomerFieldPolicy('orders', 'total')).toBe(
        'RETAINED_STATUTORY_TAX'
      );
      expect(classifyCustomerFieldPolicy('order_items', 'price')).toBe(
        'RETAINED_STATUTORY_TAX'
      );
      expect(classifyCustomerFieldPolicy('wallet_ledger', 'amount')).toBe(
        'RETAINED_STATUTORY_TAX'
      );
      expect(classifyCustomerFieldPolicy('users', 'id')).toBe(
        'RETAINED_STATUTORY_TAX'
      );
    });

    it('classifies audit events as AUDIT_EVIDENCE', () => {
      expect(classifyCustomerFieldPolicy('audit_logs', 'action')).toBe(
        'AUDIT_EVIDENCE'
      );
    });
  });
});
