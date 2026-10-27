jest.mock('server-only', () => ({}));

import {
  createActionProposal,
  approveActionProposal,
  rejectActionProposal,
  verifyExecutionEligibility,
  transitionToExecuting,
  transitionToCompleted,
  transitionToFailed,
  computeActionPayloadHash,
  sanitizeParametersForAudit,
  type ApproverAttribution,
  type ActionPayloadSpec,
} from '../approval-policy';

describe('Recommendation Approval & Authorization Policy (Track E - Phase 29)', () => {
  const samplePayload: ActionPayloadSpec = {
    actionType: 'inventory_restock',
    targetEntity: { type: 'product', id: 'sku_solitaire_1001' },
    parameters: {
      unitsToOrder: 50,
      vendorId: 'vendor_surat_diamonds',
      expectedLeadDays: 7,
    },
    version: 1,
  };

  const humanAdminApprover: ApproverAttribution = {
    actorId: 'admin_usr_123',
    actorEmail: 'admin@ruhvi.in',
    actorRole: 'admin',
    actorType: 'human',
    approvedAt: '2026-10-26T12:00:00.000Z',
  };

  const humanManagerApprover: ApproverAttribution = {
    actorId: 'manager_usr_456',
    actorEmail: 'manager@ruhvi.in',
    actorRole: 'manager',
    actorType: 'human',
    approvedAt: '2026-10-26T12:00:00.000Z',
  };

  const humanStaffApprover: ApproverAttribution = {
    actorId: 'staff_usr_789',
    actorEmail: 'staff@ruhvi.in',
    actorRole: 'staff',
    actorType: 'human',
    approvedAt: '2026-10-26T12:00:00.000Z',
  };

  const humanSuperAdminApprover: ApproverAttribution = {
    actorId: 'super_admin_001',
    actorEmail: 'founder@ruhvi.in',
    actorRole: 'super_admin',
    actorType: 'human',
    approvedAt: '2026-10-26T12:00:00.000Z',
  };

  // 1. Proposal Creation and Hash Determinism
  describe('Proposal Creation and Cryptographic Hashing', () => {
    it('initializes proposal in proposed state with valid SHA-256 payload hash', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_stock_01',
        title: 'Restock Diamond Solitaire Ring',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: samplePayload.actionType,
        targetEntity: samplePayload.targetEntity,
        parameters: samplePayload.parameters,
      });

      expect(proposal.id).toMatch(/^act_prop_/);
      expect(proposal.state).toBe('proposed');
      expect(proposal.payloadHash).toMatch(/^[a-f0-9]{64}$/);
      expect(proposal.approvals).toHaveLength(0);
    });

    it('produces identical hash regardless of parameter object key ordering', () => {
      const payloadA: ActionPayloadSpec = {
        actionType: 'inventory_restock',
        targetEntity: { type: 'product', id: 'sku_1' },
        parameters: { a: 1, b: 2, c: { x: 10, y: 20 } },
        version: 1,
      };

      const payloadB: ActionPayloadSpec = {
        actionType: 'inventory_restock',
        targetEntity: { type: 'product', id: 'sku_1' },
        parameters: { c: { y: 20, x: 10 }, b: 2, a: 1 },
        version: 1,
      };

      const hashA = computeActionPayloadHash(payloadA);
      const hashB = computeActionPayloadHash(payloadB);
      expect(hashA).toBe(hashB);
    });
  });

  // 2. Role-Based Approval Authorization & Impact Tiers
  describe('Role-Based Authorization Policies', () => {
    it('allows manager to approve inventory_operational actions', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_inv_1',
        title: 'Restock SKU',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: samplePayload.actionType,
        targetEntity: samplePayload.targetEntity,
        parameters: samplePayload.parameters,
      });

      const approved = approveActionProposal(
        proposal,
        humanManagerApprover,
        samplePayload
      );
      expect(approved.state).toBe('approved');
      expect(approved.approvals).toHaveLength(1);
      expect(approved.approvedPayloadHash).toBe(proposal.payloadHash);
    });

    it('rejects staff from approving financial_commercial actions', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_fin_1',
        title: 'Apply 20% Commercial Discount Coupon',
        category: 'financial',
        impactTier: 'financial_commercial',
        actionType: 'pricing_adjustment',
        targetEntity: { type: 'coupon', id: 'promo_gold_20' },
        parameters: { discountPct: 20 },
      });

      expect(() => {
        approveActionProposal(proposal, humanStaffApprover, proposal.payload);
      }).toThrow(/INSUFFICIENT_ROLE/);
    });

    it('allows admin to approve financial_commercial actions', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_fin_1',
        title: 'Apply 20% Commercial Discount Coupon',
        category: 'financial',
        impactTier: 'financial_commercial',
        actionType: 'pricing_adjustment',
        targetEntity: { type: 'coupon', id: 'promo_gold_20' },
        parameters: { discountPct: 20 },
      });

      const approved = approveActionProposal(
        proposal,
        humanAdminApprover,
        proposal.payload
      );
      expect(approved.state).toBe('approved');
    });

    it('rejects admin from approving security_configuration actions (requires super_admin)', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_sec_1',
        title: 'Rotate Payment Webhook Secret',
        category: 'infrastructure',
        impactTier: 'security_configuration',
        actionType: 'config_update',
        targetEntity: { type: 'system', id: 'webhook_secret' },
        parameters: { targetProvider: 'phonepe' },
      });

      expect(() => {
        approveActionProposal(proposal, humanAdminApprover, proposal.payload);
      }).toThrow(/INSUFFICIENT_ROLE/);

      // Super admin succeeds
      const approved = approveActionProposal(
        proposal,
        humanSuperAdminApprover,
        proposal.payload
      );
      expect(approved.state).toBe('approved');
    });
  });

  // 3. Human-In-The-Loop Verification
  describe('Human-In-The-Loop Enforcement', () => {
    it('prohibits automated AI self-approval', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_1',
        title: 'Automated Action',
        category: 'operations',
        impactTier: 'low_risk_triage',
        actionType: 'manual_review',
        targetEntity: { type: 'order', id: 'ord_1' },
        parameters: {},
      });

      const aiApprover: any = {
        actorId: 'co_founder_ai_agent',
        actorEmail: 'agent@ruhvi.ai',
        actorRole: 'admin',
        actorType: 'ai', // VIOLATION
        approvedAt: new Date().toISOString(),
      };

      expect(() => {
        approveActionProposal(proposal, aiApprover, proposal.payload);
      }).toThrow(/HUMAN_APPROVAL_REQUIRED/);
    });
  });

  // 4. Cryptographic Payload Tamper-Resistance
  describe('Payload Anti-Tampering Integrity', () => {
    it('rejects approval if payload is modified between proposal and approval', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_inv_1',
        title: 'Restock SKU',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: samplePayload.actionType,
        targetEntity: samplePayload.targetEntity,
        parameters: { unitsToOrder: 50 },
      });

      // Rogue modification: sneakily order 500 units instead of 50
      const tamperedPayload: ActionPayloadSpec = {
        ...proposal.payload,
        parameters: { unitsToOrder: 500 },
      };

      expect(() => {
        approveActionProposal(proposal, humanManagerApprover, tamperedPayload);
      }).toThrow(/PAYLOAD_TAMPERED/);
    });

    it('blocks execution if approved payload is tampered before execution', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_inv_1',
        title: 'Restock SKU',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: samplePayload.actionType,
        targetEntity: samplePayload.targetEntity,
        parameters: { unitsToOrder: 50 },
      });

      const approved = approveActionProposal(
        proposal,
        humanManagerApprover,
        proposal.payload
      );

      // Attempt execution with tampered parameter
      const tamperedExecutionPayload: ActionPayloadSpec = {
        ...proposal.payload,
        parameters: { unitsToOrder: 9999 },
      };

      const eligibility = verifyExecutionEligibility(
        approved,
        'manager',
        tamperedExecutionPayload
      );
      expect(eligibility.allowed).toBe(false);
      expect(eligibility.code).toBe('PAYLOAD_TAMPERED');

      expect(() => {
        transitionToExecuting(
          approved,
          'usr_exec',
          tamperedExecutionPayload,
          'manager'
        );
      }).toThrow(/PAYLOAD_TAMPERED/);
    });
  });

  // 5. Two-Person Rule Enforcement
  describe('Two-Person Rule Approval', () => {
    it('requires 2 distinct approvers before execution can be triggered', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_high_risk_1',
        title: 'High Risk Ledger Adjustment',
        category: 'financial',
        impactTier: 'two_person_rule',
        actionType: 'pricing_adjustment',
        targetEntity: { type: 'ledger', id: 'account_001' },
        parameters: { adjustmentAmount: 500000 },
      });

      // 1st approval by Super Admin
      const firstSigned = approveActionProposal(
        proposal,
        humanSuperAdminApprover,
        proposal.payload
      );

      // Blocked from executing with only 1 signature
      const eligibilityAfterOne = verifyExecutionEligibility(
        firstSigned,
        'admin',
        proposal.payload
      );
      expect(eligibilityAfterOne.allowed).toBe(false);
      expect(eligibilityAfterOne.code).toBe('TWO_PERSON_RULE_PENDING');

      // Reject duplicate approval by the same actor
      expect(() => {
        approveActionProposal(
          firstSigned,
          humanSuperAdminApprover,
          proposal.payload
        );
      }).toThrow(/DUPLICATE_APPROVER/);

      // 2nd distinct approval by Admin
      const fullySigned = approveActionProposal(
        firstSigned,
        humanAdminApprover,
        proposal.payload
      );
      expect(fullySigned.approvals).toHaveLength(2);

      // Execution is now permitted
      const eligibilityAfterTwo = verifyExecutionEligibility(
        fullySigned,
        'admin',
        proposal.payload
      );
      expect(eligibilityAfterTwo.allowed).toBe(true);
    });
  });

  // 6. Chronological Expiry Guard
  describe('Chronological Expiry Protection', () => {
    it('rejects approval on an expired proposal', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_exp_1',
        title: 'Expired Proposal',
        category: 'operations',
        impactTier: 'low_risk_triage',
        actionType: 'manual_review',
        targetEntity: { type: 'order', id: 'ord_1' },
        parameters: {},
        expiresInHours: -1, // Expired in the past
      });

      expect(() => {
        approveActionProposal(proposal, humanStaffApprover, proposal.payload);
      }).toThrow(/EXPIRED/);
    });
  });

  // 7. Full Lifecycle Execution Transitions
  describe('Lifecycle State Transitions (executing -> completed / failed)', () => {
    it('executes full lifecycle from proposed -> approved -> executing -> completed', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_life_1',
        title: 'Lifecycle Test Action',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: samplePayload.actionType,
        targetEntity: samplePayload.targetEntity,
        parameters: samplePayload.parameters,
      });

      // 1. Approve
      const approved = approveActionProposal(
        proposal,
        humanManagerApprover,
        samplePayload
      );
      expect(approved.state).toBe('approved');

      // 2. Transition to executing
      const executing = transitionToExecuting(
        approved,
        'manager_usr_456',
        samplePayload,
        'manager'
      );
      expect(executing.state).toBe('executing');
      expect(executing.executionHistory.startedAt).toBeDefined();

      // 3. Double execution blocked
      expect(() => {
        transitionToExecuting(
          executing,
          'manager_usr_456',
          samplePayload,
          'manager'
        );
      }).toThrow(/INVALID_STATE/);

      // 4. Complete
      const completed = transitionToCompleted(
        executing,
        'Restock purchase order #PO_99182 dispatched to vendor successfully.'
      );
      expect(completed.state).toBe('completed');
      expect(completed.executionHistory.completedAt).toBeDefined();
    });

    it('transitions to failed state with diagnostic error logged on failure', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_fail_1',
        title: 'Failing Action Test',
        category: 'inventory',
        impactTier: 'inventory_operational',
        actionType: samplePayload.actionType,
        targetEntity: samplePayload.targetEntity,
        parameters: samplePayload.parameters,
      });

      const approved = approveActionProposal(
        proposal,
        humanManagerApprover,
        samplePayload
      );
      const executing = transitionToExecuting(
        approved,
        'manager_usr_456',
        samplePayload,
        'manager'
      );

      const failed = transitionToFailed(
        executing,
        'Vendor EDI API returned HTTP 503 Service Unavailable'
      );
      expect(failed.state).toBe('failed');
      expect(failed.executionHistory.failedAt).toBeDefined();
      expect(failed.executionHistory.failureReason).toContain(
        '503 Service Unavailable'
      );
    });

    it('allows human rejection with documented justification', () => {
      const proposal = createActionProposal({
        recommendationId: 'rec_rej_1',
        title: 'Rejected Action Test',
        category: 'operations',
        impactTier: 'low_risk_triage',
        actionType: 'manual_review',
        targetEntity: { type: 'order', id: 'ord_1' },
        parameters: {},
      });

      const rejected = rejectActionProposal(proposal, {
        actorId: 'admin_1',
        actorEmail: 'admin@ruhvi.in',
        actorRole: 'admin',
        reason: 'Customer cancelled the return claim over phone.',
      });

      expect(rejected.state).toBe('rejected');
      expect(rejected.rejectedBy?.rejectionReason).toBe(
        'Customer cancelled the return claim over phone.'
      );

      // Rejected action cannot be approved or executed
      expect(() => {
        approveActionProposal(rejected, humanAdminApprover, rejected.payload);
      }).toThrow(/INVALID_STATE/);
    });
  });

  // 8. Parameter Sanitization for Audit Logging
  describe('Audit Parameter Sanitization', () => {
    it('redacts sensitive secrets, keys, and tokens from audit parameters', () => {
      const sensitiveParams = {
        orderId: 'ord_123',
        amount: 2500,
        api_secret_key: 'sk_live_secret_key_12345',
        auth_token: 'bearer_token_xyz',
        customer_pan: '4111222233334444',
        nested: {
          password_hash: 'super_secret',
          publicName: 'Ruhvi Gold',
        },
      };

      const sanitized = sanitizeParametersForAudit(sensitiveParams);

      expect(sanitized.orderId).toBe('ord_123');
      expect(sanitized.amount).toBe(2500);
      expect(sanitized.api_secret_key).toBe('[REDACTED_SECRET]');
      expect(sanitized.auth_token).toBe('[REDACTED_SECRET]');
      expect(sanitized.customer_pan).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.password_hash).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.publicName).toBe('Ruhvi Gold');
    });
  });
});
