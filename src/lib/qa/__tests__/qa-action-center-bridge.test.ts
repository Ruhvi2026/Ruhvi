jest.mock('server-only', () => ({}));

import {
  createQaActionProposal,
  createProposalFromProbeDiagnostic,
  createProposalFromSyntheticTransaction,
  clearQaProposalCache,
  type QaFailurePayload,
} from '../qa-action-center-bridge';
import type { ProbeDiagnostic } from '../health-probes';
import type { SyntheticTransactionResult } from '../synthetic-transaction-service';

describe('QA Guardian to Action Center Bridge (Track H - Phase 42)', () => {
  beforeEach(() => {
    clearQaProposalCache();
  });

  describe('Proposal Creation & Schema Compliance', () => {
    it('creates a compliant ActionProposal and UnifiedActionItem from a QA failure event', () => {
      const payload: QaFailurePayload = {
        journeyId: 'J-CUST-02',
        journeyTitle: 'Checkout, Coupon & Payment',
        testName: 'Coupon Discount Boundary Check',
        failureMessage: 'Coupon discount exceeded order subtotal by ₹500',
        affectedRoutes: ['/checkout', '/api/checkout'],
        observedStatus: 500,
        latencyMs: 1450,
        runLogLink: '/admin/system-alerts?run=test-run-123',
        executionId: 'exec_qa_001',
      };

      const res = createQaActionProposal(payload);

      expect(res.isDeduplicated).toBe(false);
      expect(res.proposal).toBeDefined();
      expect(res.proposal.state).toBe('proposed');
      expect(res.proposal.category).toBe('quality');
      expect(res.proposal.impactTier).toBe('low_risk_triage');
      expect(res.proposal.payloadHash).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256

      // Verify parameters
      expect(res.proposal.payload.parameters.journeyId).toBe('J-CUST-02');
      expect(res.proposal.payload.parameters.runLogLink).toBe(
        '/admin/system-alerts?run=test-run-123'
      );

      // Verify Action Item
      expect(res.actionItem).toBeDefined();
      expect(res.actionItem.category).toBe('quality');
      expect(res.actionItem.priority).toBe('high');
      expect(res.actionItem.evidence.deepLink).toBe(
        '/admin/system-alerts?run=test-run-123'
      );
    });

    it('escalates to security_configuration impact tier when security route fails', () => {
      const payload: QaFailurePayload = {
        journeyId: 'J-STAFF-01',
        journeyTitle: 'Admin Authentication & RBAC',
        testName: 'Admin Security Barrier Leak',
        failureMessage:
          'Admin route /admin/dashboard returned 200 OK without auth',
        affectedRoutes: ['/admin/dashboard'],
      };

      const res = createQaActionProposal(payload);

      expect(res.proposal.impactTier).toBe('security_configuration');
      expect(res.actionItem.priority).toBe('critical');
    });
  });

  describe('Deduplication Protection', () => {
    it('deduplicates identical failures occurring within the 24-hour window', () => {
      const payload: QaFailurePayload = {
        journeyId: 'J-GUEST-01',
        journeyTitle: 'Catalog Browsing',
        testName: 'Category Search Failure',
        failureMessage: 'Search API timed out after 3000ms',
        affectedRoutes: ['/products'],
      };

      const firstRes = createQaActionProposal(payload);
      expect(firstRes.isDeduplicated).toBe(false);

      const secondRes = createQaActionProposal(payload);
      expect(secondRes.isDeduplicated).toBe(true);
      expect(secondRes.proposal.payload.parameters.deduplicatedFrom).toBe(
        firstRes.proposal.id
      );
    });

    it('resets deduplication after clearQaProposalCache() is called', () => {
      const payload: QaFailurePayload = {
        journeyId: 'J-GUEST-01',
        journeyTitle: 'Catalog Browsing',
        testName: 'Category Search Failure',
        failureMessage: 'Search API timed out after 3000ms',
        affectedRoutes: ['/products'],
      };

      createQaActionProposal(payload);
      clearQaProposalCache();

      const thirdRes = createQaActionProposal(payload);
      expect(thirdRes.isDeduplicated).toBe(false);
    });
  });

  describe('Adapters from Probes and Synthetic Transactions', () => {
    it('returns null when probe status is PASS', () => {
      const passingProbe: ProbeDiagnostic = {
        probeId: 'PROBE_HOME',
        name: 'Storefront Homepage',
        targetPath: '/',
        expectedStatus: [200],
        observedStatus: 200,
        latencyMs: 120,
        status: 'PASS',
        message: 'Probe succeeded',
        checkedAt: new Date().toISOString(),
        isReadOnly: true,
      };

      const res = createProposalFromProbeDiagnostic(passingProbe);
      expect(res).toBeNull();
    });

    it('creates an action proposal when probe status is FAIL', () => {
      const failingProbe: ProbeDiagnostic = {
        probeId: 'PROBE_CATALOG',
        name: 'Product Catalog Listing',
        targetPath: '/products',
        expectedStatus: [200],
        observedStatus: 500,
        latencyMs: 850,
        status: 'FAIL',
        message: 'HTTP status mismatch: expected [200], observed 500',
        checkedAt: new Date().toISOString(),
        isReadOnly: true,
      };

      const res = createProposalFromProbeDiagnostic(
        failingProbe,
        '/admin/probes-run-456'
      );
      expect(res).not.toBeNull();
      expect(res!.proposal.title).toContain('Product Catalog Listing');
      expect(res!.proposal.payload.parameters.observedStatus).toBe(500);
      expect(res!.proposal.payload.parameters.runLogLink).toBe(
        '/admin/probes-run-456'
      );
    });

    it('returns null when synthetic transaction status is SUCCESS', () => {
      const successTxn: SyntheticTransactionResult = {
        executionId: 'synth_123',
        status: 'SUCCESS',
        testOrderNumber: 'SYNTH_ORD_123',
        testOrderId: 'ord_123',
        grossAmount: 25000,
        discountApplied: 0,
        netAmount: 25000,
        cleanRollback: true,
        stepLogs: [],
        invariantsVerified: {
          isolatedFromCanonicalKpis: true,
          realPaymentBypassed: true,
          physicalShippingBypassed: true,
          inventoryRestored: true,
          cartCleanedUp: true,
        },
        durationMs: 45,
        executedAt: new Date().toISOString(),
      };

      const res = createProposalFromSyntheticTransaction(successTxn);
      expect(res).toBeNull();
    });

    it('creates an action proposal when synthetic transaction fails', () => {
      const failedTxn: SyntheticTransactionResult = {
        executionId: 'synth_failed_999',
        status: 'FAILED',
        testOrderNumber: null,
        testOrderId: null,
        grossAmount: 0,
        discountApplied: 0,
        netAmount: 0,
        cleanRollback: true,
        stepLogs: [
          {
            step: 'cart_simulation',
            status: 'FAIL',
            durationMs: 15,
            details: 'Cart item validation error: missing price metadata',
          },
        ],
        invariantsVerified: {
          isolatedFromCanonicalKpis: true,
          realPaymentBypassed: true,
          physicalShippingBypassed: true,
          inventoryRestored: true,
          cartCleanedUp: true,
        },
        durationMs: 30,
        executedAt: new Date().toISOString(),
      };

      const res = createProposalFromSyntheticTransaction(failedTxn);
      expect(res).not.toBeNull();
      expect(res!.proposal.title).toContain('Checkout, Coupon & Payment');
      expect(res!.proposal.payload.parameters.failureMessage).toContain(
        'Cart item validation error'
      );
      expect(res!.proposal.payload.parameters.executionId).toBe(
        'synth_failed_999'
      );
    });
  });
});
