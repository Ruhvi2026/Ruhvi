// src/lib/ai/co-founder/workforce/__tests__/phase12-canary-and-scorecard.test.ts
//
// Phase 12 Comprehensive Test Suite:
// Validates Canary Rollout, Shadow Mode Divergence, Role Gating,
// Emergency Rollbacks, and 8-Dimension Measurable Effectiveness Scorecards.

jest.mock('server-only', () => ({}));

import { workforceCanaryEngine, CanaryStage } from '../canary-engine';
import {
  workforceScorecardEngine,
  WorkerRunLedgerRecord,
} from '../scorecard-engine';
import {
  isGlobalKillSwitchActive,
  setGlobalKillSwitch,
  clearAllWorkerMaintenance,
} from '../config';

describe('Phase 12: Canary Rollout, Benchmarking and Approval-Based Expansion', () => {
  beforeEach(() => {
    setGlobalKillSwitch(false);
    clearAllWorkerMaintenance();
    workforceScorecardEngine.clear();
  });

  describe('Workforce Canary Rollout Engine', () => {
    it('enforces strict role gating for research tools (owner/admin only)', () => {
      expect(
        workforceCanaryEngine.isResearchAccessAllowed('owner').allowed
      ).toBe(true);
      expect(
        workforceCanaryEngine.isResearchAccessAllowed('admin').allowed
      ).toBe(true);
      expect(
        workforceCanaryEngine.isResearchAccessAllowed('super_admin').allowed
      ).toBe(true);

      const guestCheck =
        workforceCanaryEngine.isResearchAccessAllowed('customer');
      expect(guestCheck.allowed).toBe(false);
      expect(guestCheck.reason).toContain(
        'Research tools restricted to owner/admin'
      );

      expect(
        workforceCanaryEngine.isResearchAccessAllowed(undefined).allowed
      ).toBe(false);
    });

    it('tracks and updates canary stages across all 16 workers', () => {
      const state = workforceCanaryEngine.setWorkerStage(
        'worker_sales_conversion',
        'canary',
        15,
        'Stage 1 canary observation'
      );

      expect(state.stage).toBe('canary');
      expect(state.trafficPercentage).toBe(15);
      expect(
        workforceCanaryEngine.getWorkerStage('worker_sales_conversion')
      ).toBe('canary');
      expect(state.rollbackHistory.length).toBeGreaterThan(0);
    });

    it('executes shadow evaluation without external writes and computes divergence', async () => {
      const result = await workforceCanaryEngine.runShadowEvaluation({
        workerId: 'worker_analytics_performance',
        inputTask: 'Review gold chain pricing',
        baselineSummary:
          'Gold chain gross margin is 38.5% with retail price ₹42,000.',
        candidateOutput: {
          summary:
            'Gold chain gross margin is 39.1% with updated retail price ₹42,500.',
          simulatedWrites: 0,
        },
        latencyBaselineMs: 120,
        latencyCandidateMs: 140,
      });

      expect(result.safetyPassed).toBe(true);
      expect(result.attemptedExternalWrites).toBe(0);
      expect(result.divergenceScore).toBeGreaterThanOrEqual(0);
      expect(result.divergenceScore).toBeLessThan(1);
      expect(result.recommendation).toBe('ready_for_canary');
    });

    it('flags shadow evaluations as unsafe if candidate attempts external writes', async () => {
      const result = await workforceCanaryEngine.runShadowEvaluation({
        workerId: 'worker_marketing',
        inputTask: 'Launch promo blast',
        baselineSummary: 'Draft proposed only.',
        candidateOutput: {
          summary: 'Attempted live ad creation',
          simulatedWrites: 1, // Illegal in shadow mode
        },
      });

      expect(result.safetyPassed).toBe(false);
      expect(result.recommendation).toBe('unsafe');
    });

    it('evaluates observation thresholds and detects violations (failure rate > 5%, PII, unverified writes)', () => {
      const passing = workforceCanaryEngine.evaluateCanaryThresholds(
        'worker_monitoring_verification',
        {
          totalRuns: 20,
          verifiedSuccesses: 19,
          failures: 1,
          timeouts: 0,
          unauthorizedMutations: 0,
          piiExposures: 0,
          p95LatencyMs: 400,
        }
      );
      expect(passing.meetsThresholds).toBe(true);
      expect(passing.thresholdViolations.length).toBe(0);

      const failing = workforceCanaryEngine.evaluateCanaryThresholds(
        'worker_sales_conversion',
        {
          totalRuns: 20,
          verifiedSuccesses: 12,
          failures: 4, // 20% failure rate > 5%
          timeouts: 1,
          unauthorizedMutations: 1, // Fatal mutation attempt
          piiExposures: 1, // Fatal privacy leak
          p95LatencyMs: 120000, // Exceeds budget
        }
      );

      expect(failing.meetsThresholds).toBe(false);
      expect(failing.thresholdViolations.length).toBeGreaterThanOrEqual(3);
      expect(
        failing.thresholdViolations.some((v) => v.includes('Failure rate'))
      ).toBe(true);
      expect(
        failing.thresholdViolations.some((v) =>
          v.includes('unauthorized mutation')
        )
      ).toBe(true);
      expect(
        failing.thresholdViolations.some((v) => v.includes('PII exposure'))
      ).toBe(true);
    });

    it('executes worker rollback and demotes stage safely', async () => {
      workforceCanaryEngine.setWorkerStage(
        'worker_orders_logistics',
        'canary',
        20
      );
      expect(
        workforceCanaryEngine.getWorkerStage('worker_orders_logistics')
      ).toBe('canary');

      const rollback = await workforceCanaryEngine.executeWorkerRollback(
        'worker_orders_logistics',
        'shadow',
        'Detected latency spike'
      );

      expect(rollback.success).toBe(true);
      expect(rollback.newStage).toBe('shadow');
      expect(
        workforceCanaryEngine.getWorkerStage('worker_orders_logistics')
      ).toBe('shadow');
    });

    it('triggers global emergency rollback and engages kill-switch', () => {
      workforceCanaryEngine.setWorkerStage(
        'worker_sales_conversion',
        'canary',
        10
      );
      workforceCanaryEngine.setWorkerStage(
        'worker_content_blog',
        'promoted',
        100
      );

      const result = workforceCanaryEngine.executeGlobalRollback(
        'Security alert in staging'
      );
      expect(result.affectedWorkers).toBeGreaterThanOrEqual(2);
      expect(result.killSwitchActive).toBe(true);
      expect(isGlobalKillSwitchActive()).toBe(true);

      // Verify all canary and promoted workers demoted to shadow
      expect(
        workforceCanaryEngine.getWorkerStage('worker_sales_conversion')
      ).toBe('shadow');
      expect(workforceCanaryEngine.getWorkerStage('worker_content_blog')).toBe(
        'shadow'
      );
    });
  });

  describe('Workforce Measurable Scorecard Engine (Section 8.1 & 8.2)', () => {
    it('returns INSUFFICIENT_DATA when sample size is below minimum (n < 5)', () => {
      const card = workforceScorecardEngine.generateScorecard(
        'worker_review_feedback'
      );
      expect(card.hasSufficientData).toBe(false);
      expect(card.overallScore).toBe('INSUFFICIENT_DATA');
      expect(card.sampleSize).toBe(0);
      expect(card.confidenceInterval95).toBeNull();
    });

    it('computes 8-dimension weighted scorecard when n >= 5', () => {
      const records: WorkerRunLedgerRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push({
          worker_id: 'worker_monitoring_verification',
          task_id: `task_${i}`,
          run_id: `run_${i}`,
          skill_version: '1.0.0',
          manifest_version: '1.0.0',
          started_at: '2026-11-10T02:00:00Z',
          completed_at: '2026-11-10T02:00:01Z',
          status: 'COMPLETED',
          verification_status: 'verified',
          tool_calls: ['check_outcomes_ledger'],
          sources_used: ['co_founder_outcomes'],
          source_freshness: 'fresh',
          model_provider: 'gemini',
          model_name: 'gemini-3.5-flash',
          input_tokens: 300,
          output_tokens: 200,
          estimated_cost: 0.0003,
          latency_ms: 180,
          retry_count: 0,
          evidence_ids: ['ev_1'],
          human_override: false,
        });
      }

      for (const rec of records) {
        workforceScorecardEngine.recordRun(rec);
      }

      const card = workforceScorecardEngine.generateScorecard(
        'worker_monitoring_verification'
      );
      expect(card.hasSufficientData).toBe(true);
      expect(typeof card.overallScore).toBe('number');
      expect(card.overallScore).toBeGreaterThanOrEqual(90);
      expect(card.status).toBe('verified_elite');

      // Verify all 8 dimensions are present with proper weights (sum = 100%)
      const dims = card.dimensions;
      expect(dims.taskCorrectness.weight).toBe(20);
      expect(dims.evidenceDataFidelity.weight).toBe(20);
      expect(dims.integrationToolExecution.weight).toBe(15);
      expect(dims.safetyApprovalCompliance.weight).toBe(15);
      expect(dims.reliability.weight).toBe(10);
      expect(dims.latencySla.weight).toBe(10);
      expect(dims.costEfficiency.weight).toBe(5);
      expect(dims.testObservabilityCoverage.weight).toBe(5);

      const totalWeight =
        dims.taskCorrectness.weight +
        dims.evidenceDataFidelity.weight +
        dims.integrationToolExecution.weight +
        dims.safetyApprovalCompliance.weight +
        dims.reliability.weight +
        dims.latencySla.weight +
        dims.costEfficiency.weight +
        dims.testObservabilityCoverage.weight;
      expect(totalWeight).toBe(100);

      // Verify 95% Wilson confidence interval
      expect(card.confidenceInterval95).not.toBeNull();
      expect(card.confidenceInterval95?.lower).toBeGreaterThan(60);
      expect(card.confidenceInterval95?.upper).toBeLessThanOrEqual(100);
    });

    it('does not count simulated or pending_approval as verified success', () => {
      // 5 runs all simulated
      for (let i = 0; i < 5; i++) {
        workforceScorecardEngine.recordRun({
          worker_id: 'worker_sales_conversion',
          task_id: `task_sim_${i}`,
          run_id: `run_sim_${i}`,
          skill_version: '1.0.0',
          manifest_version: '1.0.0',
          started_at: '2026-11-10T02:00:00Z',
          completed_at: '2026-11-10T02:00:01Z',
          status: 'COMPLETED',
          verification_status: 'simulated', // Not live success
          tool_calls: ['simulate_checkout_diagnostic'],
          sources_used: [],
          source_freshness: 'undated',
          model_provider: 'gemini',
          model_name: 'gemini-3.5-flash',
          input_tokens: 200,
          output_tokens: 100,
          estimated_cost: 0.0002,
          latency_ms: 220,
          retry_count: 0,
          evidence_ids: [],
          human_override: false,
        });
      }

      const card = workforceScorecardEngine.generateScorecard(
        'worker_sales_conversion'
      );
      // Task correctness must be 0% because 0 runs were verified live
      expect(card.dimensions.taskCorrectness.score).toBe(0);
      expect(card.dimensions.taskCorrectness.evidenceNotes).toContain('0/5');
    });

    it('generates scorecards for all 16 workers', () => {
      const allCards = workforceScorecardEngine.generateAllScorecards();
      expect(allCards.length).toBe(16);
      expect(allCards.every((c) => Boolean(c.workerId && c.dimensions))).toBe(
        true
      );
    });
  });
});
