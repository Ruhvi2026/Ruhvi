jest.mock('server-only', () => ({}));

import {
  createBusinessEvent,
  validateBusinessEvent,
  type BusinessEvent,
} from '../intelligence/event-contract';
import {
  processBusinessEvent,
  isEventAlreadyProcessed,
} from '../intelligence/idempotent-processor';
import {
  calculateMetricSeverity,
  calculateComparisonTrend,
} from '../intelligence/radar-service';
import {
  UnifiedActionItemSchema,
  fromAnomalyRecord,
} from '../intelligence/action-contract';
import {
  simulateDecisionScenario,
  type SimulationFixture,
  type SimulationScenarioConfig,
} from '../intelligence/decision-simulator';
import {
  evaluateLookupPermissions,
  normalizeIndianPhoneNumber,
  maskCustomerProfilePii,
  type CustomerIdentityRecord,
} from '../intelligence/customer-identity-resolution';
import {
  REGISTERED_SELF_AUDIT_CHECKS,
  getSelfAuditCheck,
  executeCheck,
} from '../audit/self-audit-registry';
import {
  generateRemediationProposal,
  bridgeRemediationToActionCenter,
} from '../audit/self-audit-remediation';
import { type SelfAuditFinding } from '../audit/self-audit-store';
import { CRITICAL_JOURNEYS } from '../qa/journey-definitions';
import { getCodRefusalThreshold, getCodEligibility } from '../orders/cod';
import { awardCoinsForDeliveredOrder } from '../orders/coins';

// Mock Supabase service client for order engine tests
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

import { getServiceClient } from '@/lib/supabase/service';

/**
 * ============================================================================
 * CROSS-SYSTEM INTEGRATION & REGRESSION SUITE (TRACK K - PHASE 52)
 * ============================================================================
 * Verifies end-to-end integration, boundary safety, permission guarantees,
 * unavailable data fallbacks, and zero customer storefront disruption across
 * all tracks (B through J).
 */
describe('Phase 52: Cross-System Integration and Regression Validation', () => {
  let mockSupabase: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  // ─── 1. End-to-End Shared Intelligence Pipeline ─────────────────────────────
  describe('1. Shared Intelligence Pipeline Flow & Idempotency', () => {
    it('ingests, validates, and deduplicates order and payment events across the pipeline', async () => {
      const processedStore = new Set<string>();
      const customDeduplicator = {
        isProcessed: async (key: string) => processedStore.has(key),
        markProcessed: async (key: string) => {
          processedStore.add(key);
        },
      };

      const rawEvent: BusinessEvent = createBusinessEvent({
        eventType: 'ORDER_CREATED',
        source: 'storefront',
        entity: { type: 'order', id: 'ord_cross_sys_1001' },
        idempotencyKey: 'idem_cross_sys_1001_v1',
        actor: { type: 'customer', id: 'cust_8829' },
        payload: {
          orderId: 'ord_cross_sys_1001',
          currency: 'INR',
          grossAmount: 18500,
          itemCount: 2,
        },
      });

      // Contract validation
      const validationResult = validateBusinessEvent(rawEvent);
      expect(validationResult.success).toBe(true);

      // First ingestion: must process
      const firstRun = await processBusinessEvent(rawEvent, {
        customDeduplicator,
        handler: async () => ({ status: 'PROCESSED', grossAmount: 18500 }),
      });
      expect(firstRun.executed).toBe(true);
      expect(firstRun.status).toBe('processed');
      expect(firstRun.result).toEqual({
        status: 'PROCESSED',
        grossAmount: 18500,
      });

      // Second ingestion with duplicate idempotency key: must skip safely
      const secondRun = await processBusinessEvent(rawEvent, {
        customDeduplicator,
        handler: async () => {
          throw new Error('Duplicate handler must never be executed');
        },
      });
      expect(secondRun.executed).toBe(false);
      expect(secondRun.status).toBe('duplicate');
      expect(secondRun.result).toBeUndefined();
    });
  });

  // ─── 2. Business Radar & Anomaly Severity Aggregation ───────────────────────
  describe('2. Business Radar & Anomaly Detection Integration', () => {
    it('evaluates operational metric severity accurately against agreed thresholds', () => {
      // Cancellation rate thresholds: healthy <= 10%, warning <= 15%, critical > 15%
      expect(
        calculateMetricSeverity('cancellation_rate', 6.2, 'available')
      ).toBe('healthy');
      expect(
        calculateMetricSeverity('cancellation_rate', 12.8, 'available')
      ).toBe('warning');
      expect(
        calculateMetricSeverity('cancellation_rate', 17.5, 'available')
      ).toBe('critical');

      // Payment failure rate thresholds: healthy <= 10%, warning <= 20%, critical > 20%
      expect(
        calculateMetricSeverity('payment_failure_rate', 4.1, 'available')
      ).toBe('healthy');
      expect(
        calculateMetricSeverity('payment_failure_rate', 14.5, 'available')
      ).toBe('warning');
      expect(
        calculateMetricSeverity('payment_failure_rate', 22.9, 'available')
      ).toBe('critical');
    });

    it('adapts anomaly records into compliant UnifiedActionItem records for the Action Center', () => {
      const mockAnomaly = {
        id: 'anom_payment_spike_99',
        metric: 'payment_failure_rate',
        title: 'Elevated Payment Failure Rate',
        category: 'operations',
        severity: 'critical' as const,
        state: 'open' as const,
        firstDetectedAt: '2026-10-25T10:00:00.000Z',
        lastObservedAt: '2026-10-25T10:30:00.000Z',
        occurrenceCount: 3,
        latestValue: 24.5,
        thresholdValue: 20.0,
        recommendation: {
          category: 'operations',
          explanation:
            'Payment gateway timeout spike detected on prepaid transactions',
          suggestedNextStep: {
            safeDeepLink: '/admin/anomalies',
          },
        },
      };

      const actionItem = fromAnomalyRecord(mockAnomaly as any);
      expect(actionItem.sourceType).toBe('anomaly');
      expect(actionItem.priority).toBe('critical'); // Severity is critical
      expect(actionItem.isExecutable).toBe(false); // Read-only investigation
      expect(actionItem.evidence.deepLink).toBe('/admin/anomalies');

      // Schema validation check
      const parsed = UnifiedActionItemSchema.safeParse(actionItem);
      expect(parsed.success).toBe(true);
    });
  });

  // ─── 3. Decision Simulator Offline Sandboxing ───────────────────────────────
  describe('3. Decision Simulator Sandboxed Scenario Modeling', () => {
    const sampleFixture: SimulationFixture = {
      id: 'fix_festive_2026',
      name: 'Diwali 2026 Catalog Snapshot',
      periodDays: 30,
      totalHistoricalOrders: 450,
      historicalAov: 14200,
      products: [
        {
          id: 'prod_kundan_necklace_01',
          sku: 'RUH-KUN-01',
          name: 'Royal Kundan Choker',
          currentPrice: 24000,
          costPrice: 15000,
          stockQuantity: 12,
          lowStockThreshold: 4,
          historical30DaySalesUnits: 10,
        },
        {
          id: 'prod_polki_earrings_02',
          sku: 'RUH-POL-02',
          name: 'Classic Polki Jhumkas',
          currentPrice: 12000,
          costPrice: 7500,
          stockQuantity: 5,
          lowStockThreshold: 3,
          historical30DaySalesUnits: 8,
        },
      ],
    };

    it('simulates inventory safety buffer adjustment deterministically without mutation', () => {
      const scenario: SimulationScenarioConfig = {
        type: 'inventory_safety_buffer_adjustment',
        title: 'Increase Kundan Safety Buffer',
        description:
          'Test raising safety buffer by +3 units to reduce festive stockout risk',
        parameters: {
          thresholdAdjustmentDelta: 3,
          targetProductIds: ['prod_kundan_necklace_01'],
        },
      };

      const result = simulateDecisionScenario(scenario, sampleFixture);
      expect(result.simulationId).toMatch(/^sim_/);
      expect(result.comparisons.length).toBeGreaterThan(0);
      expect(result.assumptions.length).toBeGreaterThan(0);

      // Verify no changes occurred to fixture
      expect(sampleFixture.products[0].lowStockThreshold).toBe(4);
      expect(sampleFixture.products[0].stockQuantity).toBe(12);
    });

    it('handles empty fixture data gracefully with zero division errors', () => {
      const emptyFixture: SimulationFixture = {
        id: 'fix_empty',
        name: 'Empty Fixture',
        periodDays: 30,
        totalHistoricalOrders: 0,
        historicalAov: 0,
        products: [],
      };

      const scenario: SimulationScenarioConfig = {
        type: 'inventory_safety_buffer_adjustment',
        title: 'Buffer Test Empty',
        description: 'Handle zero products',
        parameters: { thresholdAdjustmentDelta: 2 },
      };

      const result = simulateDecisionScenario(scenario, emptyFixture);
      expect(result.projectedWorkingCapitalDelta).toBe(0);
      expect(result.projectedProfitDelta).toBe(0);
      expect(result.comparisons).toBeDefined();
    });
  });

  // ─── 4. Customer 360 Privacy & RBAC Boundaries ─────────────────────────────
  describe('4. Customer 360 Privacy & RBAC Boundaries', () => {
    it('enforces mandatory PII masking for operational staff while allowing unmasked view for admins', () => {
      // Frontline operational staff
      const staffPerms = evaluateLookupPermissions('staff', 'cust_123');
      expect(staffPerms.allowed).toBe(true);
      expect(staffPerms.maskPii).toBe(true);
      expect(staffPerms.canViewFinancials).toBe(false);
      expect(staffPerms.canExecuteErasure).toBe(false);

      // Admin
      const adminPerms = evaluateLookupPermissions('admin', 'cust_123');
      expect(adminPerms.allowed).toBe(true);
      expect(adminPerms.maskPii).toBe(false);
      expect(adminPerms.canViewFinancials).toBe(true);
      expect(adminPerms.canExecuteErasure).toBe(true);

      // Unauthenticated customer looking at another profile
      const custOtherPerms = evaluateLookupPermissions(
        'customer',
        'cust_target_99',
        'cust_actor_11'
      );
      expect(custOtherPerms.allowed).toBe(false);
    });

    it('correctly normalizes Indian phone numbers into canonical E.164 and masks customer PII', () => {
      expect(normalizeIndianPhoneNumber('9876543210')).toBe('+919876543210');
      expect(normalizeIndianPhoneNumber('+91 98765 43210')).toBe(
        '+919876543210'
      );
      expect(normalizeIndianPhoneNumber('09876543210')).toBe('+919876543210');

      const mockCustomer: CustomerIdentityRecord = {
        id: 'cust_priya_123',
        firebaseUid: 'fb_priya_778',
        email: 'priya.sharma@example.com',
        emailVerified: true,
        phone: '+919876543210',
        phoneVerified: true,
        fullName: 'Priya Sharma',
        role: 'customer',
        accountStatus: 'active',
        createdAt: '2026-01-15T00:00:00.000Z',
      };

      const masked = maskCustomerProfilePii(mockCustomer);
      expect(masked.fullName).toBe('Priya S.');
      expect(masked.email).toMatch(/p•••@example\.com/);
      expect(masked.phone).toBe('+919876••••10');
      expect(masked.firebaseUid).toBe('••••••••');
    });
  });

  // ─── 5. Self-Audit Registry and Remediation Safety Guarantees ────────────────
  describe('5. Self-Audit Registry and Remediation Safety Guarantees', () => {
    it('executes read-only self-audit checks safely within execution time limits', async () => {
      expect(REGISTERED_SELF_AUDIT_CHECKS.length).toBeGreaterThan(0);

      const check = getSelfAuditCheck('chk_arch_app_router_routes');
      expect(check).toBeDefined();
      expect(check?.isDestructive).toBe(false);

      const result = await executeCheck('chk_arch_app_router_routes');
      expect(result.checkId).toBe('chk_arch_app_router_routes');
      expect(['PASS', 'FAIL', 'WARN']).toContain(result.status);
      expect(result.durationMs).toBeLessThan(5000);
    });

    it('generates approval-gated remediation proposals with hard compile-time execution blocks', () => {
      const finding: SelfAuditFinding = {
        id: 'fnd_db_conn_limit_01',
        fingerprint: 'fp_db_conn_limit_01',
        checkId: 'PERF-DB-001',
        category: 'performance',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        title: 'Connection Pool Near Saturation',
        evidenceSource: 'PostgreSQL pg_stat_activity',
        message:
          'Active database connections at 88% capacity exceeding threshold',
        remediationHint:
          'Scale pool size or configure PgBouncer connection pooling.',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        occurrenceCount: 4,
        reopenCount: 0,
        history: [],
        sanitizedObservedValue: { activeConnections: 88, maxConnections: 100 },
      };

      const proposal = generateRemediationProposal(finding);
      expect(proposal.isExecutionBlocked).toBe(true); // Hard safety invariant
      expect(proposal.requiredApproverRole).toBe('super_admin'); // Critical requires super_admin
      expect(proposal.testPlan.length).toBeGreaterThan(0);
      expect(proposal.rollbackPlan.length).toBeGreaterThan(0);

      // Bridges safely into Action Center as a proposed action
      const actionProposal = bridgeRemediationToActionCenter(proposal);
      expect(actionProposal.state).toBe('proposed');
      expect(actionProposal.category).toBe('quality');
    });

    it('concludes insufficientEvidence when finding telemetry lacks requisite evidence', () => {
      const ambiguousFinding: SelfAuditFinding = {
        id: 'fnd_ambiguous_01',
        fingerprint: 'fp_ambiguous_01',
        checkId: 'SEC-CLIENT-001',
        category: 'security',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        title: 'Ambiguous Diagnostic Telemetry',
        evidenceSource: 'Client Audit Scanner',
        message: 'timeout',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        occurrenceCount: 1,
        reopenCount: 0,
        history: [],
      };

      const proposal = generateRemediationProposal(ambiguousFinding);
      expect(proposal.insufficientEvidence).toBe(true);
      expect(proposal.summary).toContain('telemetry is insufficient');
    });
  });

  // ─── 6. QA Guardian Journey Definitions Verification ────────────────────────
  describe('6. QA Guardian Critical Journey Coverage Verification', () => {
    it('verifies all 14 critical regression journeys are registered with explicit safety bounds', () => {
      expect(CRITICAL_JOURNEYS.length).toBe(14);

      const journeyIds = CRITICAL_JOURNEYS.map((j) => j.id);
      expect(journeyIds).toContain('J-GUEST-01'); // Browse & Filter
      expect(journeyIds).toContain('J-CUST-02'); // Add to Bag & Checkout
      expect(journeyIds).toContain('J-CUST-03'); // COD Order Flow
      expect(journeyIds).toContain('J-STAFF-01'); // Staff Order Fulfillment

      for (const journey of CRITICAL_JOURNEYS) {
        expect(journey.steps.length).toBeGreaterThan(0);
        expect(journey.invariants.length).toBeGreaterThan(0);
        expect(journey.failureThresholds.maxResponseTimeMs).toBeGreaterThan(0);
      }
    });
  });

  // ─── 7. Customer Storefront Zero-Breakage Invariant ──────────────────────────
  describe('7. Customer Storefront Zero-Breakage Invariant', () => {
    it('ensures COD threshold and eligibility calculations run safely and fail open', async () => {
      // 1. Settings lookup fails open to default 2
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const threshold = await getCodRefusalThreshold();
      expect(threshold).toBe(2);

      // 2. Customer eligibility check fails open when no previous refusal record exists
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const eligibility = await getCodEligibility('cust_clean_buyer_01');
      expect(eligibility.cod_disabled).toBe(false);
      expect(eligibility.cod_refusal_count).toBe(0);
    });

    it('ensures coin rewards engine functions deterministically without side effects', async () => {
      // Non-existent order returns false without throwing
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await awardCoinsForDeliveredOrder('ord_missing_order');
      expect(result.awarded).toBe(false);
      expect(result.coins).toBe(0);
    });
  });
});
