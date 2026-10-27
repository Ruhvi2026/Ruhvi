jest.mock('server-only', () => ({}));

import {
  generateCoFounderRecommendations,
  verifyRecommendationEvidence,
  parseAndValidateLlmRecommendation,
  type StructuredCoFounderRecommendation,
} from '../co-founder-recommendations';
import { validateRecommendation } from '../recommendation-schema';
import type { CoFounderBusinessContext } from '../co-founder-context';

describe('Evidence-Bound AI Co-Founder Recommendations (Track E - Phase 27)', () => {
  const mockContext: CoFounderBusinessContext = {
    assembledAt: '2026-10-26T12:00:00.000Z',
    timeWindow: {
      start: '2026-10-20T00:00:00.000Z',
      end: '2026-10-27T00:00:00.000Z',
      timezone: 'Asia/Kolkata',
      preset: 'last_7_days',
    },
    callerRole: 'admin',
    provenance: [
      {
        source: 'supabase:canonical_metrics',
        status: 'available',
        freshness: '2026-10-26T12:00:00.000Z',
      },
      {
        source: 'supabase:products',
        status: 'available',
        freshness: '2026-10-26T12:00:00.000Z',
      },
    ],
    unavailableSources: [],
    financialMetrics: [
      {
        metric: 'gross_sales',
        label: 'Gross Sales',
        category: 'financial',
        value: 250000,
        unit: 'INR',
        status: 'available',
      },
      {
        metric: 'average_order_value',
        label: 'Average Order Value (AOV)',
        category: 'financial',
        value: 5000,
        unit: 'INR',
        status: 'available',
      },
    ],
    operationalMetrics: [
      {
        metric: 'payment_failure_rate',
        label: 'Payment Failure Rate',
        category: 'infrastructure',
        value: 22.5, // Breaches 20% critical threshold
        unit: '%',
        status: 'available',
      },
      {
        metric: 'cancellation_rate',
        label: 'Order Cancellation Rate',
        category: 'operations',
        value: 4.0,
        unit: '%',
        status: 'available',
      },
      {
        metric: 'stock_out_rate',
        label: 'Catalog Stock-Out Rate',
        category: 'inventory',
        value: 15.0, // Breaches 10% warning threshold
        unit: '%',
        status: 'available',
      },
    ],
    inventorySignals: {
      activeSkuCount: 100,
      stockOutRate: 15.0,
      outOfStockSkuCount: 15,
      lowStockSkuCount: 8,
      status: 'available',
    },
    funnelSummary: {
      ordersCreated: 50,
      paidOrders: 45,
      cancellations: 2,
      returns: 1,
      cancellationRate: 4.0,
      returnRate: 2.2,
      status: 'available',
    },
    systemHealth: {
      paymentFailureRate: 22.5,
      aiFailureIncidentCount: 1,
      healthState: 'critical',
      status: 'available',
    },
    activeAnomalies: [],
    privacyGuarantees: {
      noPiiIncluded: true,
      noRawConversations: true,
      sanitizedRole: 'admin',
      financialAccessGranted: true,
    },
    promptContextMarkdown: 'mock markdown context',
    characterCount: 21,
  };

  // 1. Generation & Partitioned Reasoning
  describe('Structured Recommendation Generation', () => {
    it('generates schema-compliant recommendations with partitioned reasoning', () => {
      const recs = generateCoFounderRecommendations(mockContext);

      expect(recs.length).toBeGreaterThanOrEqual(2);

      for (const rec of recs) {
        // Must pass Phase 19 schema validation
        const val = validateRecommendation(rec);
        expect(val.success).toBe(true);

        // Partition separation verification
        expect(rec.partitions).toBeDefined();
        expect(Array.isArray(rec.partitions.observations)).toBe(true);
        expect(Array.isArray(rec.partitions.likelyExplanations)).toBe(true);
        expect(Array.isArray(rec.partitions.suggestedInvestigations)).toBe(
          true
        );
        expect(Array.isArray(rec.partitions.predictions)).toBe(true);

        // Human approval invariant
        expect(rec.suggestedNextStep.requiresApproval).toBe(true);

        // Safe deep link verification
        expect(rec.suggestedNextStep.safeDeepLink).toMatch(/^\/admin\//);

        // Prediction confidence capped at 0.85
        for (const pred of rec.partitions.predictions) {
          expect(pred.confidence).toBeLessThanOrEqual(0.85);
        }
      }
    });

    it('generates critical payment gateway recommendation when failure rate exceeds threshold', () => {
      const recs = generateCoFounderRecommendations(mockContext);
      const payRec = recs.find((r) => r.category === 'infrastructure');

      expect(payRec).toBeDefined();
      expect(payRec?.priority).toBe('critical');
      expect(payRec?.evidenceType).toBe('deterministic_rule');
      expect(payRec?.supportingMetrics[0].metric).toBe('payment_failure_rate');
      expect(payRec?.suggestedNextStep.safeDeepLink).toBe('/admin/payments');
      expect(payRec?.partitions.observations[0].observedValue).toBe('22.5%');
    });

    it('generates catalog stockout warning when stockout rate breaches buffer', () => {
      const recs = generateCoFounderRecommendations(mockContext);
      const stockRec = recs.find((r) => r.category === 'inventory');

      expect(stockRec).toBeDefined();
      expect(stockRec?.priority).toBe('high');
      expect(stockRec?.suggestedNextStep.safeDeepLink).toBe(
        '/admin/reports/inventory'
      );
      expect(stockRec?.partitions.observations[0].observedValue).toBe('15.0%');
    });
  });

  // 2. Missing Data Disclosures
  describe('Missing Data Disclosures', () => {
    it('discloses degraded upstream sources and generates a data hygiene recommendation', () => {
      const degradedContext: CoFounderBusinessContext = {
        ...mockContext,
        unavailableSources: ['orders_funnel', 'ai_failure_diagnostics'],
      };

      const recs = generateCoFounderRecommendations(degradedContext);
      const hygieneRec = recs.find((r) =>
        r.title.includes('Data Hygiene Notice')
      );

      expect(hygieneRec).toBeDefined();
      expect(hygieneRec?.evidenceType).toBe('statistical_hypothesis');
      expect(hygieneRec?.partitions.missingDataDisclosures.length).toBe(2);
      expect(
        hygieneRec?.partitions.missingDataDisclosures[0].unmeasuredArea
      ).toBe('orders_funnel');
    });
  });

  // 3. Evidence Verification Guardrails
  describe('Evidence Verification and Claim Qualification', () => {
    it('rejects recommendations marked as deterministic_rule that lack supporting metrics', () => {
      const invalidRec: any = {
        id: 'rec_unbacked_1',
        title: 'Unbacked Revenue Breach Claim',
        category: 'financial',
        priority: 'high',
        evidenceType: 'deterministic_rule',
        supportingMetrics: [], // VIOLATION: Must have supporting metric
        observationWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timeZone: 'Asia/Kolkata',
        },
        explanation: 'Revenue claim with zero supporting metrics provided.',
        uncertaintyBasis: {
          confidence: 0.9,
          confidenceReason: 'No basis',
          assumptions: ['None'],
          riskFactors: [],
        },
        suggestedNextStep: {
          actionTitle: 'Check revenue',
          actionType: 'manual_review',
          safeDeepLink: '/admin/orders',
          requiresApproval: true,
        },
        createdAt: '2026-10-26T12:00:00.000Z',
        expiresAt: '2026-10-28T12:00:00.000Z',
      };

      const result = verifyRecommendationEvidence(invalidRec, mockContext);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        'must include at least one verified supporting metric'
      );
    });

    it('rejects recommendations attempting autonomous execution without human approval', () => {
      const recs = generateCoFounderRecommendations(mockContext);
      const rogueRec = {
        ...recs[0],
        suggestedNextStep: {
          ...recs[0].suggestedNextStep,
          requiresApproval: false as any, // VIOLATION: Autonomous write attempt
        },
      };

      const result = verifyRecommendationEvidence(rogueRec, mockContext);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Autonomous execution prohibited');
    });

    it('rejects simulation projections claiming confidence greater than 0.85', () => {
      const recs = generateCoFounderRecommendations(mockContext);
      const overconfidentSim = {
        ...recs[0],
        evidenceType: 'simulation' as const,
        uncertaintyBasis: {
          ...recs[0].uncertaintyBasis,
          confidence: 0.98, // VIOLATION: Capped at 0.85
        },
      };

      const result = verifyRecommendationEvidence(
        overconfidentSim,
        mockContext
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('confidence cap of 0.85');
    });

    it('rejects safeDeepLink pointing to external or unauthorized routes', () => {
      const recs = generateCoFounderRecommendations(mockContext);
      const rogueLinkRec = {
        ...recs[0],
        suggestedNextStep: {
          ...recs[0].suggestedNextStep,
          safeDeepLink: 'https://external-site.com/steal-data', // VIOLATION
        },
      };

      const result = verifyRecommendationEvidence(rogueLinkRec, mockContext);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        'must route to an authorized internal admin portal'
      );
    });
  });

  // 4. Untrusted / LLM Ingestion Verifier
  describe('LLM Recommendation Parser and Sanitizer', () => {
    it('approves well-formed LLM candidate grounded in context', () => {
      const recs = generateCoFounderRecommendations(mockContext);
      const candidate = recs[0];

      const res = parseAndValidateLlmRecommendation(candidate, mockContext);
      expect(res.success).toBe(true);
    });

    it('rejects malformed LLM candidate with schema violations', () => {
      const malformedPayload = {
        id: 'bad_id',
        title: 'Short',
      };

      const res = parseAndValidateLlmRecommendation(
        malformedPayload,
        mockContext
      );
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
