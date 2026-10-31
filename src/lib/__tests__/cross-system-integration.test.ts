jest.mock('server-only', () => ({}));

import fs from 'fs';
import path from 'path';
import {
  filterPublicProducts,
  isTestProduct,
} from '../content/content-isolation';
import {
  CANONICAL_BUSINESS_IDENTITY,
  getCanonicalBusinessAddress,
  getOrganizationSchemaJsonLd,
} from '../seo/business-identity';
import { reconcileWalletState } from '../wallet/reconciliation';
import { computeActionPayloadHash } from '../intelligence/approval-policy';
import {
  applyDataErasurePolicy,
  maskCustomerProfilePii,
  type CustomerIdentityRecord,
} from '../intelligence/customer-identity-resolution';
import { modelFreeShippingThresholdEconomics } from '../intelligence/counterfactual-models';

describe('Cross-System Integration & Critical Journeys Regression Suite (Phase 63)', () => {
  const rootDir = process.cwd();

  describe('Journey Group A: Storefront & Customer Journeys', () => {
    it('J-GUEST-01: Catalog Browsing & Content Isolation', () => {
      // Confirms test-only items are filtered from public view
      const rawProducts = [
        { id: '1', slug: 'gold-necklace', name: '22K Gold Necklace' },
        { id: '2', slug: 'finale-test', name: 'Finale Test Ring' },
        { id: '3', slug: 'diamond-earrings', name: 'Diamond Drop Earrings' },
        { id: '4', slug: 'testing', name: 'Testing' },
      ];

      const visible = filterPublicProducts(rawProducts);
      expect(visible.map((p) => p.slug)).toEqual([
        'gold-necklace',
        'diamond-earrings',
      ]);
      expect(isTestProduct('finale-test')).toBe(true);
      expect(isTestProduct('testing')).toBe(true);
      expect(isTestProduct('gold-necklace')).toBe(false);
    });

    it('J-GUEST-02: PDP & Canonical SEO Organization Metadata', () => {
      const address = getCanonicalBusinessAddress();
      expect(address.city).toBe('Mumbai');
      expect(address.state).toBe('Maharashtra');
      expect(address.country).toBe('India');

      const schema = getOrganizationSchemaJsonLd();
      expect(schema.name).toBe('Ruhvi Fine Jewellery');
      expect(schema.contactPoint.telephone).toBe('+91-9153577651');
      expect(schema.url).toBe('https://ruhvi.in');
      expect(schema.contactPoint.areaServed).toBe('IN');
    });

    it('J-CUST-01: Cart & Navigation Boundary Verification', () => {
      const navbarSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'components', 'layout', 'Navbar.tsx'),
        'utf-8'
      );
      // Cart link exists with dynamic badge support
      expect(navbarSource).toContain('href="/cart"');
      expect(navbarSource).toContain('cartCount > 0');

      // Zero staff routes in public navigation
      expect(navbarSource).not.toContain('href="/admin"');
      expect(navbarSource).not.toContain('href="/operations"');
    });

    it('J-CUST-02: Sandbox Checkout & Free Shipping Economics Invariants', () => {
      // Free shipping threshold economics model
      const result = modelFreeShippingThresholdEconomics({
        baselineMonthlyOrders: 400,
        baselineAov: 30000,
        baselineGrossMarginPercent: 40,
        currentThreshold: 2000,
        proposedThreshold: 4000,
        averageFulfillmentShippingCost: 150,
        standardShippingFeeCharged: 100,
        cartExpansionLiftPercent: 4,
        conversionDropPercent: 2,
      });

      expect(result.decisionType).toBe('free_shipping_threshold_economics');
      expect(result.isSimulatedProjection).toBe(true);
      expect(result.metrics.length).toBeGreaterThan(0);
    });

    it('J-CUST-03: Customer Account History & Authoritative Ledger Balance', () => {
      // Reconciles ledger transactions
      const ledgerResult = reconcileWalletState(350, [
        {
          id: 'tx-1',
          amount: 500,
          type: 'credit',
          created_at: '2026-10-31T00:00:00.000Z',
        },
        {
          id: 'tx-2',
          amount: 150,
          type: 'debit',
          created_at: '2026-10-31T01:00:00.000Z',
        },
      ]);

      expect(ledgerResult.authoritativeBalance).toBe(350);
      expect(ledgerResult.hasDiscrepancy).toBe(false);
      expect(ledgerResult.status).toBe('RECONCILED');
    });

    it('J-CUST-04: Customer Identity Resolution & Authoritative UUIDs', () => {
      const identityResolverPath = path.resolve(
        rootDir,
        'src',
        'lib',
        'intelligence',
        'customer-identity-resolution.ts'
      );
      expect(fs.existsSync(identityResolverPath)).toBe(true);

      const source = fs.readFileSync(identityResolverPath, 'utf-8');
      expect(source).toContain('getAuthoritativeCustomerUuid');
      expect(source).toContain('resolveCustomerIdentity');
    });

    it('J-CUST-05: GIA / Support Chat & Accessible Trigger Stacking', () => {
      const triggerSource = fs.readFileSync(
        path.resolve(
          rootDir,
          'src',
          'components',
          'CustomerSupportChatTrigger.tsx'
        ),
        'utf-8'
      );
      expect(triggerSource).toContain('z-[100]');
      expect(triggerSource).toContain('aria-label="Open support chat"');
    });
  });

  describe('Journey Group B: Staff, Admin & Internal Operations', () => {
    it('J-STAFF-01: Staff Authentication, RBAC & Portal Isolation', () => {
      const storefrontChromeSource = fs.readFileSync(
        path.resolve(
          rootDir,
          'src',
          'components',
          'layout',
          'StorefrontChrome.tsx'
        ),
        'utf-8'
      );
      expect(storefrontChromeSource).toContain("'admin.ruhvi.in'");
      expect(storefrontChromeSource).toContain("'operation.ruhvi.in'");
      expect(storefrontChromeSource).toContain('if (isPortal) return null;');
    });

    it('J-STAFF-02: Business Radar & Anomaly Detection', () => {
      const radarSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'lib', 'intelligence', 'radar-service.ts'),
        'utf-8'
      );
      expect(radarSource).toContain('getBusinessRadarSummary');
      expect(radarSource).toContain('calculateMetricSeverity');
    });

    it('J-STAFF-03: Order Lifecycle Events & Idempotent Failure Recovery', () => {
      const recoverySource = fs.readFileSync(
        path.resolve(
          rootDir,
          'src',
          'lib',
          'intelligence',
          'event-failure-recovery.ts'
        ),
        'utf-8'
      );
      expect(recoverySource).toContain('recordFailedEvent');
      expect(recoverySource).toContain('retryPendingEvents');
      expect(recoverySource).toContain('getDeadLetterQueue');
    });

    it('J-STAFF-04: Action Center Proposal Cryptographic Integrity (SHA-256)', () => {
      const payload1 = {
        actionType: 'RESTOCK_RECOMMENDATION',
        targetEntity: { type: 'variant', id: 'var_101' },
        parameters: { restockQty: 50 },
      };
      const hash1 = computeActionPayloadHash(payload1 as any);

      const payload2 = {
        actionType: 'RESTOCK_RECOMMENDATION',
        targetEntity: { type: 'variant', id: 'var_101' },
        parameters: { restockQty: 50 },
      };
      const hash2 = computeActionPayloadHash(payload2 as any);

      const tamperedPayload = {
        actionType: 'RESTOCK_RECOMMENDATION',
        targetEntity: { type: 'variant', id: 'var_101' },
        parameters: { restockQty: 9999 },
      };
      const hashTampered = computeActionPayloadHash(tamperedPayload as any);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashTampered);
    });

    it('J-STAFF-05: Customer 360 & PII Data Erasure Workflow', () => {
      const activeCustomer: CustomerIdentityRecord = {
        id: 'cust-uuid-1234',
        firebaseUid: 'firebase-uid-abcd',
        email: 'priya.sharma@example.com',
        emailVerified: true,
        phone: '+919830099999',
        phoneVerified: true,
        fullName: 'Priya Sharma',
        role: 'customer',
        accountStatus: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        linkedProviders: [
          { provider: 'google.com', providerIdentifier: 'google_uid_1' },
          { provider: 'password', providerIdentifier: 'pwd_1' },
        ],
        consentedAnalyticsIds: ['posthog-123'],
      };

      // 1. Verify PII masking for frontline staff
      const masked = maskCustomerProfilePii(activeCustomer);
      expect(masked.phone).toBe('+919830••••99');
      expect(masked.email).toBe('p•••@example.com');
      expect(masked.fullName).toBe('Priya S.');
      expect(masked.firebaseUid).toBe('••••••••');

      // 2. Verify statutory data erasure anonymization
      const erased = applyDataErasurePolicy(
        activeCustomer,
        'Customer GDPR erasure request'
      );
      expect(erased.id).toBe('cust-uuid-1234'); // Synthetic ID retained for tax ledger
      expect(erased.fullName).toBe('[REDACTED_DELETED_USER]');
      expect(erased.email).toBeNull();
      expect(erased.phone).toBeNull();
      expect(erased.firebaseUid).toBeNull();
      expect(erased.accountStatus).toBe('erased');
      expect(erased.erasedAt).toBeDefined();
    });

    it('J-STAFF-06: Inventory Operations & Staging Demand Intelligence', () => {
      const demandSource = fs.readFileSync(
        path.resolve(
          rootDir,
          'src',
          'lib',
          'intelligence',
          'inventory-demand-service.ts'
        ),
        'utf-8'
      );
      expect(demandSource).toContain('calculateSkuDemandMetrics');

      const stockoutSource = fs.readFileSync(
        path.resolve(
          rootDir,
          'src',
          'lib',
          'intelligence',
          'stockout-risk-service.ts'
        ),
        'utf-8'
      );
      expect(stockoutSource).toContain('calculateStockoutRisk');
    });

    it('J-STAFF-07: AI Co-Founder Memory Engine & Voice Session Path', () => {
      const memorySource = fs.readFileSync(
        path.resolve(
          rootDir,
          'src',
          'lib',
          'ai',
          'co-founder',
          'memory-engine.ts'
        ),
        'utf-8'
      );
      expect(memorySource).toContain('synthesizePrioritizedMemoryContext');
      expect(memorySource).toContain('extractMemoriesFromConversation');

      const voiceHookSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'lib', 'livekit', 'use-voice-session.ts'),
        'utf-8'
      );
      expect(voiceHookSource).toContain('livekit-client');
      expect(voiceHookSource).toContain('VoiceConnectionState');
    });
  });

  describe('Journey Group C: Release Gates, Performance & Security', () => {
    it('LCP & Responsive Image Delivery Integrity', () => {
      const pageSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'app', 'page.tsx'),
        'utf-8'
      );
      expect(pageSource).toContain('media="(max-width: 640px)"');
      expect(pageSource).toContain(
        'media="(min-width: 641px) and (max-width: 1024px)"'
      );
      expect(pageSource).toContain('media="(min-width: 1025px)"');
    });

    it('Navigation Accessibility & WCAG 2.4.7 Focus Indicator Invariants', () => {
      const navbarSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'components', 'layout', 'Navbar.tsx'),
        'utf-8'
      );
      expect(navbarSource).toContain('aria-label="Open categories menu"');
      expect(navbarSource).toContain('aria-expanded={mobileMenuOpen}');
      expect(navbarSource).toContain(
        'aria-controls="mobile-navigation-drawer"'
      );
      expect(navbarSource).toContain('id="mobile-navigation-drawer"');
      expect(navbarSource).toMatch(
        /href="\/account\/wallet"[\s\S]*?aria-label=/
      );
      expect(navbarSource).toContain(
        'focus-visible:ring-2 focus-visible:ring-gold-500'
      );
    });

    it('CI Quality Gate & Accidental Secret Scanner Workflows', () => {
      const ciPath = path.resolve(rootDir, '.github', 'workflows', 'ci.yml');
      const secPath = path.resolve(
        rootDir,
        '.github',
        'workflows',
        'security-scan.yml'
      );

      expect(fs.existsSync(ciPath)).toBe(true);
      expect(fs.existsSync(secPath)).toBe(true);
    });
  });
});
