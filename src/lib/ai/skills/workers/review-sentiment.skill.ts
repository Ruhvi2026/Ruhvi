// src/lib/ai/skills/workers/review-sentiment.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const reviewSentimentSkill: RuntimeSkill = {
  id: 'worker_review_feedback',
  name: 'Review Mining & Customer Sentiment Synthesis',
  version: '1.0.0',
  owner: 'review-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_review_feedback'],
  description:
    'Mines verified customer reviews and post-purchase ratings to classify manufacturing defects, packaging issues, and craftsmanship praises.',
  explicitNonCapabilities: [
    'Cannot fabricate review counts, ratings, or customer sentiment percentages.',
    'Cannot delete or suppress negative customer reviews on the storefront.',
    'Cannot generate fake promotional testimonials.',
  ],
  allowedTools: [
    'get_reviews',
    'get_product_detail',
    'record_outcome_feedback',
    'analyze_review_sentiment',
    'get_recent_reviews',
    'draft_review_response',
  ],
  requiredDataSources: [
    'authoritative_db:reviews',
    'authoritative_db:products',
  ],
  requiredInputs: ['product_id_or_all', 'timeframe'],
  outputSchema: {
    totalReviews: 'number',
    averageRating: 'number',
    sentimentDistribution:
      '{ positive: number; neutral: number; negative: number }',
    praiseThemes: 'string[]',
    defectThemes: 'string[]',
  },
  evidenceRequirements: [
    'Every reported praise or defect theme must cite verified purchaser review excerpts.',
    'If zero reviews exist, report INSUFFICIENT_DATA; never invent default praise frequencies.',
  ],
  safetyRules: [
    'Only verified buyer feedback may influence product design and supplier defect logs.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 15,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `REVIEW & SENTIMENT SYNTHESIS:
1. Parse review text dynamically for defect keywords (clasp, tarnished, scratch, box, color).
2. Report the exact count of verified purchaser reviews analyzed.
3. If no reviews are found in the query window, return INSUFFICIENT_DATA.`,
};
