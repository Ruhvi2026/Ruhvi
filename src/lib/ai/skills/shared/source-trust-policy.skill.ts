// src/lib/ai/skills/shared/source-trust-policy.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const sourceTrustPolicySkill: RuntimeSkill = {
  id: 'shared_source_trust_policy',
  name: 'Source Trust & Corroboration Policy',
  version: '1.0.0',
  owner: 'co-founder-core',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['*'],
  description:
    'Ranks primary/official sources over secondary aggregators, detects stale or undated information, and requires multi-source corroboration for material decisions.',
  explicitNonCapabilities: [
    'Cannot accept anonymous forum rumors as confirmed market facts.',
    'Cannot treat undated blog posts as fresh intelligence.',
    'Cannot silently resolve conflicting sources without highlighting divergence to the founder.',
  ],
  allowedTools: [],
  requiredDataSources: ['research_sources', 'evidence_ledger'],
  requiredInputs: ['sources', 'claim'],
  outputSchema: {
    corroborated: 'boolean',
    primarySourcePresent: 'boolean',
    conflictsDetected: 'string[]',
  },
  evidenceRequirements: [
    'High-impact facts require 1 primary/official source or 2 independent secondary sources.',
    'Sources lacking published dates must be tagged as "undated".',
  ],
  safetyRules: [
    'Flag contradictions immediately rather than picking a favorite source.',
    'Respect robots.txt and public fair-use boundaries.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 5,
    maxTokens: 500,
  },
  failureStates: ['stale', 'partial', 'verified', 'unavailable'],
  instructions: `SOURCE TRUST & CORROBORATION INSTRUCTIONS:
1. Prioritize official announcements, government gazettes (e.g. GST Council notifications), and company documentation over secondary commentary.
2. If two sources disagree on pricing, policy, or metrics, explicitly show both and describe the discrepancy.
3. Mark any undated retrieved content as [undated] to avoid anchoring on stale information.`,
};
