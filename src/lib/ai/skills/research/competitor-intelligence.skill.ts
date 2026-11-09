// src/lib/ai/skills/research/competitor-intelligence.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const competitorIntelligenceSkill: RuntimeSkill = {
  id: 'research_competitor_intelligence',
  name: 'Competitor Intelligence & Benchmark Analysis',
  version: '1.0.0',
  owner: 'competitor-research-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: [
    'worker_competitor_research',
    'worker_marketing',
    'worker_product',
  ],
  description:
    'Extracts competitor jewellery catalog prices, promotions, shipping terms, return policies, and consumer sentiment across Indian D2C competitors (e.g. Giva, Palmonas, Mia by Tanishq).',
  explicitNonCapabilities: [
    'Cannot execute automated purchases or cart checkouts on competitor sites.',
    'Cannot bypass anti-bot challenges or break third-party terms of service.',
    'Cannot guess competitor margins or financial metrics without public source evidence.',
  ],
  allowedTools: [
    'browse_website',
    'get_competitors',
    'analyze_competitor',
    'web_search',
    'read_webpage',
    'research_topic',
    'search_public_discussions',
  ],
  requiredDataSources: ['competitor_registry', 'public_web', 'evidence_ledger'],
  requiredInputs: ['competitor_name_or_domain', 'focus_category'],
  outputSchema: {
    competitor: 'string',
    priceRange: '{ min: number; max: number; currency: string }',
    policyHighlights: '{ shipping: string; returns: string; warranty: string }',
    promotions: 'string[]',
    sources: 'string[]',
  },
  evidenceRequirements: [
    'Catalog prices must be quoted with snapshot date and URL.',
    'Promotions must specify whether they are active or historical.',
  ],
  safetyRules: [
    'Safe outbound policy (SSRF validation) on all competitor domains.',
    'Do not scrape private or gated customer account portals.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 30,
    maxTokens: 2500,
    maxPages: 6,
    maxSpendUsd: 0,
  },
  failureStates: ['unavailable', 'partial', 'stale', 'verified'],
  instructions: `COMPETITOR BENCHMARKING RULES:
1. Compare competitor jewelry specs (anti-tarnish coating, 18K/22K gold plating, base metal 925 silver vs brass/stainless steel) accurately against Ruhvi.
2. Verify return/exchange windows (e.g., 7-day, 15-day, 30-day) and warranty terms.
3. Track active promotional codes and free shipping thresholds.`,
};
