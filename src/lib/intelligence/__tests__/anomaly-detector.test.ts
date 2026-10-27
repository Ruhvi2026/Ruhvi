jest.mock('server-only', () => ({}));

import {
  detectBusinessAnomalies,
  ENABLED_ANOMALY_RULES,
  DISABLED_ANOMALY_RULES,
} from '../anomaly-detector';
import * as metricsService from '../metrics-service';
import { validateRecommendation } from '../recommendation-schema';

jest.mock('../metrics-service', () => {
  const actual = jest.requireActual('../metrics-service');
  return {
    ...actual,
    getCanonicalMetric: jest.fn(),
  };
});

describe('Deterministic Rule-Based Anomaly Detector (Track C - Phase 20)', () => {
  const mockedGetCanonicalMetric =
    metricsService.getCanonicalMetric as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Rule Catalog & Documentation
  describe('Rule Catalog Integrity', () => {
    it('defines required metadata for all enabled rules', () => {
      const rules = Object.values(ENABLED_ANOMALY_RULES);
      expect(rules.length).toBeGreaterThanOrEqual(5);

      for (const rule of rules) {
        expect(rule.id).toMatch(/^rule_/);
        expect(rule.name.length).toBeGreaterThan(5);
        expect(rule.rationale.length).toBeGreaterThan(15);
        expect(rule.warningThreshold).toBeLessThan(rule.criticalThreshold);
        expect(rule.minSampleSize).toBeGreaterThan(0);
        expect(rule.source.length).toBeGreaterThan(0);
        expect(rule.deepLink.startsWith('/admin/')).toBe(true);
        expect(rule.actionTitle.length).toBeGreaterThan(5);
      }
    });

    it('documents disabled rules with concrete technical justifications', () => {
      expect(DISABLED_ANOMALY_RULES.length).toBeGreaterThanOrEqual(3);
      for (const disabled of DISABLED_ANOMALY_RULES) {
        expect(disabled.id).toMatch(/^rule_/);
        expect(disabled.reason).toContain('Disabled:');
      }
    });
  });

  // 2. Minimum Sample Size Guardrail
  describe('Minimum Sample Size Guard', () => {
    it('suppresses anomaly when sample size is below minSampleSize threshold', async () => {
      // Metric is 50% (massive breach), but only 2 transactions observed (minSampleSize is 10)
      mockedGetCanonicalMetric.mockResolvedValue({
        metric: 'payment_failure_rate',
        value: 50.0,
        timeWindow: {
          start: '2026-10-20T00:00:00.000Z',
          end: '2026-10-27T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          preset: 'last_7_days',
        },
        status: 'available',
        metadata: {
          numerator: 1,
          denominator: 2, // < 10
        },
        calculatedAt: '2026-10-27T00:00:00.000Z',
      });

      const report = await detectBusinessAnomalies({ preset: 'last_7_days' });

      expect(report.anomaliesDetectedCount).toBe(0);
      expect(report.suppressedCount).toBeGreaterThanOrEqual(1);

      const suppressedPayment = report.suppressed.find(
        (s) => s.ruleId === 'rule_payment_failure_spike'
      );
      expect(suppressedPayment).toBeDefined();
      expect(suppressedPayment?.observedSampleSize).toBe(2);
      expect(suppressedPayment?.minSampleRequired).toBe(10);
      expect(suppressedPayment?.reason).toContain(
        'below statistical minimum guard'
      );
    });

    it('triggers anomaly when sample size meets minSampleSize requirement', async () => {
      // Metric is 25% (critical breach) with 12 attempts (>= 10)
      mockedGetCanonicalMetric.mockImplementation((metric) => {
        if (metric === 'payment_failure_rate') {
          return Promise.resolve({
            metric: 'payment_failure_rate',
            value: 25.0,
            timeWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_7_days',
            },
            status: 'available',
            metadata: {
              numerator: 3,
              denominator: 12,
            },
            calculatedAt: '2026-10-27T00:00:00.000Z',
          });
        }
        return Promise.resolve({
          metric,
          value: 2.0, // healthy for all others
          timeWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          status: 'available',
          metadata: { denominator: 50 },
          calculatedAt: '2026-10-27T00:00:00.000Z',
        });
      });

      const report = await detectBusinessAnomalies({ preset: 'last_7_days' });

      expect(report.anomaliesDetectedCount).toBe(1);
      const finding = report.anomalies[0];
      expect(finding.ruleId).toBe('rule_payment_failure_spike');
      expect(finding.severity).toBe('critical');
      expect(finding.priority).toBe('critical');
      expect(finding.actualValue).toBe(25.0);
      expect(finding.thresholdValue).toBe(20.0);
    });
  });

  // 3. Warning vs Critical Severity Thresholds
  describe('Deterministic Threshold Stratification', () => {
    it('emits warning severity when value exceeds warning threshold but is below critical', async () => {
      mockedGetCanonicalMetric.mockImplementation((metric) => {
        if (metric === 'cancellation_rate') {
          return Promise.resolve({
            metric: 'cancellation_rate',
            value: 12.5, // > 10% warning, <= 15% critical
            timeWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_7_days',
            },
            status: 'available',
            metadata: { numerator: 5, denominator: 40 },
            calculatedAt: '2026-10-27T00:00:00.000Z',
          });
        }
        return Promise.resolve({
          metric,
          value: 1.0,
          timeWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          status: 'available',
          metadata: { denominator: 40 },
          calculatedAt: '2026-10-27T00:00:00.000Z',
        });
      });

      const report = await detectBusinessAnomalies({ preset: 'last_7_days' });
      expect(report.anomaliesDetectedCount).toBe(1);

      const finding = report.anomalies[0];
      expect(finding.ruleId).toBe('rule_cancellation_rate_surge');
      expect(finding.severity).toBe('warning');
      expect(finding.priority).toBe('high');
      expect(finding.thresholdValue).toBe(10.0);
    });

    it('emits critical severity when value exceeds critical threshold', async () => {
      mockedGetCanonicalMetric.mockImplementation((metric) => {
        if (metric === 'rto_rate') {
          return Promise.resolve({
            metric: 'rto_rate',
            value: 18.0, // > 15% critical
            timeWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_7_days',
            },
            status: 'available',
            metadata: { numerator: 9, denominator: 50 },
            calculatedAt: '2026-10-27T00:00:00.000Z',
          });
        }
        return Promise.resolve({
          metric,
          value: 1.0,
          timeWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          status: 'available',
          metadata: { denominator: 50 },
          calculatedAt: '2026-10-27T00:00:00.000Z',
        });
      });

      const report = await detectBusinessAnomalies({ preset: 'last_7_days' });
      expect(report.anomaliesDetectedCount).toBe(1);

      const finding = report.anomalies[0];
      expect(finding.ruleId).toBe('rule_rto_rate_surge');
      expect(finding.severity).toBe('critical');
      expect(finding.priority).toBe('critical');
      expect(finding.thresholdValue).toBe(15.0);
    });
  });

  // 4. Contract Conformance with Phase 19 Recommendation Schema
  describe('Phase 19 Recommendation Contract Conformance', () => {
    it('validates that every emitted recommendation strictly satisfies BusinessRecommendationSchema', async () => {
      mockedGetCanonicalMetric.mockImplementation((metric) => {
        // Trigger anomalies on both stockout and returns
        if (metric === 'stock_out_rate') {
          return Promise.resolve({
            metric: 'stock_out_rate',
            value: 22.0, // > 20% critical
            timeWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_7_days',
            },
            status: 'available',
            metadata: { numerator: 11, denominator: 50 },
            calculatedAt: '2026-10-27T00:00:00.000Z',
          });
        }
        if (metric === 'return_rate') {
          return Promise.resolve({
            metric: 'return_rate',
            value: 12.0, // > 10% critical
            timeWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
              preset: 'last_7_days',
            },
            status: 'available',
            metadata: { numerator: 6, denominator: 50 },
            calculatedAt: '2026-10-27T00:00:00.000Z',
          });
        }
        return Promise.resolve({
          metric,
          value: 1.0,
          timeWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          status: 'available',
          metadata: { denominator: 50 },
          calculatedAt: '2026-10-27T00:00:00.000Z',
        });
      });

      const report = await detectBusinessAnomalies({ preset: 'last_7_days' });
      expect(report.anomaliesDetectedCount).toBe(2);

      for (const finding of report.anomalies) {
        // Assert full schema validation
        const validation = validateRecommendation(finding.recommendation);
        expect(validation.success).toBe(true);

        // Assert action safety invariants
        expect(finding.recommendation.suggestedNextStep.requiresApproval).toBe(
          true
        );
        expect(finding.recommendation.evidenceType).toBe('deterministic_rule');
        expect(finding.recommendation.supportingMetrics.length).toBeGreaterThan(
          0
        );
        expect(finding.recommendation.thresholdRule).toBeDefined();
        expect(finding.recommendation.thresholdRule?.actualValue).toBe(
          finding.actualValue
        );
        expect(finding.recommendation.suggestedNextStep.safeDeepLink).toMatch(
          /^\/admin\//
        );
      }
    });
  });
});
