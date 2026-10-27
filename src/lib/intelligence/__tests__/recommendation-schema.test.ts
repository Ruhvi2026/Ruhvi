import {
  BusinessRecommendationSchema,
  validateRecommendation,
  formatRecommendationSummary,
  type BusinessRecommendation,
} from '../recommendation-schema';

describe('Evidence-Backed Recommendation Schema (Track C - Phase 19)', () => {
  const baseValidRecommendation: BusinessRecommendation = {
    id: 'rec_rto_spike_001',
    title: 'Elevated Return-to-Origin rate detected in Delhi NCR corridor',
    category: 'operations',
    priority: 'high',
    evidenceType: 'measured_fact',
    supportingMetrics: [
      {
        metric: 'rto_rate',
        value: 18.5,
        source: 'supabase:orders',
        timeWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timeZone: 'Asia/Kolkata',
        },
        sampleSize: {
          numerator: 37,
          denominator: 200,
        },
      },
    ],
    observationWindow: {
      start: '2026-10-20T00:00:00.000Z',
      end: '2026-10-27T00:00:00.000Z',
      timeZone: 'Asia/Kolkata',
    },
    thresholdRule: {
      ruleId: 'rule_rto_elevated',
      metric: 'rto_rate',
      condition: 'gt',
      actualValue: 18.5,
      thresholdValue: 15.0,
    },
    explanation:
      'Observed RTO rate reached 18.5% over the last 7 days exceeding the operational safety threshold of 15.0%. Primary concentration observed in express shipments.',
    uncertaintyBasis: {
      confidence: 0.95,
      confidenceReason:
        'Derived from 200 authoritative delivered/RTO order transitions recorded in Supabase.',
      assumptions: [
        'Courier transit webhooks are timely and not delayed by network outage.',
      ],
      riskFactors: ['Potential courier scan delays over festival weekend.'],
    },
    suggestedNextStep: {
      actionTitle: 'Verify courier delivery scans and review pincode blocklist',
      actionType: 'investigation',
      targetEntity: {
        type: 'order',
        id: 'bulk_rto_orders',
      },
      safeDeepLink: '/admin/orders',
      requiresApproval: true,
    },
    reviewState: 'pending_review',
    createdAt: '2026-10-27T00:00:00.000Z',
    expiresAt: '2026-11-03T00:00:00.000Z',
  };

  // 1. Valid Recommendation
  it('successfully parses a valid measured_fact recommendation', () => {
    const result = validateRecommendation(baseValidRecommendation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('rec_rto_spike_001');
      expect(result.data.evidenceType).toBe('measured_fact');
      expect(result.data.supportingMetrics).toHaveLength(1);
    }
  });

  // 2. Format Summary
  it('formats a concise human-readable summary', () => {
    const summary = formatRecommendationSummary(baseValidRecommendation);
    expect(summary).toContain('[HIGH] [OPERATIONS]');
    expect(summary).toContain('rec_rto_spike_001');
    expect(summary).toContain('Evidence Type: measured_fact | Confidence: 95%');
    expect(summary).toContain('Requires Human Approval: YES');
  });

  // 3. Evidence Requirement Invariant
  it('rejects measured_fact when supportingMetrics is empty', () => {
    const invalid = {
      ...baseValidRecommendation,
      supportingMetrics: [],
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes(
            'must provide at least one verified supporting metric'
          )
        )
      ).toBe(true);
    }
  });

  it('rejects deterministic_rule when supportingMetrics is empty', () => {
    const invalid = {
      ...baseValidRecommendation,
      evidenceType: 'deterministic_rule',
      supportingMetrics: [],
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes(
            'must provide at least one verified supporting metric'
          )
        )
      ).toBe(true);
    }
  });

  // 4. Threshold Condition Consistency
  it('rejects threshold rule when condition does not hold (actual <= threshold for gt)', () => {
    const invalid = {
      ...baseValidRecommendation,
      thresholdRule: {
        ruleId: 'rule_rto_elevated',
        metric: 'rto_rate' as const,
        condition: 'gt' as const,
        actualValue: 12.0, // Should be > 15.0
        thresholdValue: 15.0,
      },
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes('Threshold rule condition breach violation')
        )
      ).toBe(true);
    }
  });

  it('accepts valid threshold condition evaluation for lte', () => {
    const valid = {
      ...baseValidRecommendation,
      thresholdRule: {
        ruleId: 'rule_inventory_healthy',
        metric: 'stock_out_rate' as const,
        condition: 'lte' as const,
        actualValue: 4.5,
        thresholdValue: 5.0,
      },
    };
    const result = validateRecommendation(valid);
    expect(result.success).toBe(true);
  });

  // 5. Simulation Confidence Cap
  it('rejects simulation recommendations claiming confidence > 0.85', () => {
    const invalid = {
      ...baseValidRecommendation,
      evidenceType: 'simulation',
      uncertaintyBasis: {
        ...baseValidRecommendation.uncertaintyBasis,
        confidence: 0.92, // Exceeds 0.85 cap for simulations
      },
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes(
            'Simulation projections cannot claim confidence greater than 0.85'
          )
        )
      ).toBe(true);
    }
  });

  it('accepts simulation recommendations with confidence <= 0.85', () => {
    const valid = {
      ...baseValidRecommendation,
      evidenceType: 'simulation',
      uncertaintyBasis: {
        ...baseValidRecommendation.uncertaintyBasis,
        confidence: 0.8,
      },
    };
    const result = validateRecommendation(valid);
    expect(result.success).toBe(true);
  });

  // 6. Chronological Expiry Guard
  it('rejects when expiresAt is earlier than or equal to createdAt', () => {
    const invalid = {
      ...baseValidRecommendation,
      createdAt: '2026-10-27T12:00:00.000Z',
      expiresAt: '2026-10-27T10:00:00.000Z',
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes(
            'expiresAt must be chronologically after createdAt'
          )
        )
      ).toBe(true);
    }
  });

  // 7. Human-In-The-Loop Approval Enforcement
  it('strictly rejects suggestedNextStep when requiresApproval is false', () => {
    const invalid = {
      ...baseValidRecommendation,
      suggestedNextStep: {
        ...baseValidRecommendation.suggestedNextStep,
        requiresApproval: false,
      },
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes('Automated execution prohibited')
        )
      ).toBe(true);
    }
  });

  // 8. Safe Deep Link Verification
  it('rejects unsafe external deep links', () => {
    const invalid = {
      ...baseValidRecommendation,
      suggestedNextStep: {
        ...baseValidRecommendation.suggestedNextStep,
        safeDeepLink: 'https://malicious-external-site.com/steal-token',
      },
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes(
            'safeDeepLink must point to an authorized internal portal route'
          )
        )
      ).toBe(true);
    }
  });

  // 9. Review State Lifecycle Invariants
  it('rejects reviewState="approved" without reviewedAt and reviewedBy', () => {
    const invalid = {
      ...baseValidRecommendation,
      reviewState: 'approved',
      // missing reviewedAt, reviewedBy
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) => e.message.includes('reviewedAt is required'))
      ).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes('reviewedBy is required'))
      ).toBe(true);
    }
  });

  it('rejects reviewState="rejected" without rejectionReason', () => {
    const invalid = {
      ...baseValidRecommendation,
      reviewState: 'rejected',
      reviewedAt: '2026-10-27T01:00:00.000Z',
      reviewedBy: 'usr_admin_42',
      // missing rejectionReason
    };
    const result = validateRecommendation(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.message.includes('rejectionReason is required')
        )
      ).toBe(true);
    }
  });

  it('accepts reviewState="rejected" when fully attributed', () => {
    const valid = {
      ...baseValidRecommendation,
      reviewState: 'rejected',
      reviewedAt: '2026-10-27T01:00:00.000Z',
      reviewedBy: 'usr_admin_42',
      rejectionReason:
        'Courier logistics partner already acknowledged carrier delay in Delhi hub.',
    };
    const result = validateRecommendation(valid);
    expect(result.success).toBe(true);
  });
});
