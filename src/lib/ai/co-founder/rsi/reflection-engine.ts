/**
 * Ruhvi AI Co-Founder — Reflection & Verified Learning Engine
 * Phase 4: Turns observed failures into testable candidate lessons,
 * prevents premature self-promotion, and promotes to verified lessons.
 */

import { getCofounderDataClient } from '../data-client';
import { CandidateLesson, FailureClass } from './types';
import { assertRsiOperationAllowed } from './governance';

export class RsiReflectionEngine {
  private client = getCofounderDataClient();

  /**
   * 1. Generate a candidate lesson from an observed failure
   */
  async createCandidateLesson(params: {
    failureClass: FailureClass;
    lesson: string;
    observedFailure: string;
    hypothesis: string;
    evidenceRefs: string[];
    initialConfidence?: number;
  }): Promise<{ success: boolean; candidateId?: string; error?: string }> {
    assertRsiOperationAllowed('reflection_write');

    if (!params.lesson || !params.observedFailure) {
      return {
        success: false,
        error: 'Lesson and observed failure description required',
      };
    }

    const res = await this.client.saveCandidateLesson({
      lesson: params.lesson,
      observed_failure: `[${params.failureClass}] ${params.observedFailure}`,
      evidence_refs: params.evidenceRefs,
      confidence: params.initialConfidence ?? 0.5,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, candidateId: res.data?.id };
  }

  /**
   * 2. Verify and promote a candidate lesson
   * Rule: Cannot self-promote without an evaluation test pass and minimum evidence count.
   */
  async promoteCandidateLesson(params: {
    candidateId: string;
    testRunsCount: number;
    passRate: number;
    verificationSummary: string;
    evidenceRefs: string[];
  }): Promise<{ success: boolean; verifiedId?: string; error?: string }> {
    assertRsiOperationAllowed('reflection_promote');

    // Strict promotion guard: must have at least 2 successful test runs with >= 90% pass rate
    if (params.testRunsCount < 2 || params.passRate < 0.9) {
      return {
        success: false,
        error: `Promotion rejected: Requires at least 2 test runs with >= 90% pass rate (got ${params.testRunsCount} runs, ${Math.round(params.passRate * 100)}% pass rate)`,
      };
    }

    if (!params.candidateId) {
      return {
        success: false,
        error: 'Promotion rejected: Candidate ID is required',
      };
    }

    // Require non-empty durable evaluation evidence refs (RSI-05)
    if (!params.evidenceRefs || params.evidenceRefs.length === 0) {
      return {
        success: false,
        error:
          'Promotion rejected: Minimum of 1 valid evaluation evidence reference is required',
      };
    }

    const res = await this.client.verifyLesson({
      candidate_id: params.candidateId,
      verification_summary: params.verificationSummary,
      evidence_refs: params.evidenceRefs,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, verifiedId: res.data?.id };
  }
}
