// src/lib/ai/skills/shared/evidence-quality.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const evidenceQualitySkill: RuntimeSkill = {
  id: 'shared_evidence_quality',
  name: 'Evidence Quality & Non-Fabrication Standard',
  version: '1.0.0',
  owner: 'co-founder-core',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['*'],
  description:
    'Mandatory factual grounding contract: every empirical claim must map to verified database, telemetry, or external research evidence.',
  explicitNonCapabilities: [
    'Never fabricate visitor, conversion, or revenue metrics when telemetry is missing.',
    'Never estimate benchmark ratios and present them as measured facts.',
    'Never state an external integration succeeded without remote API confirmation.',
  ],
  allowedTools: [],
  requiredDataSources: ['authoritative_db', 'telemetry', 'evidence_ledger'],
  requiredInputs: ['claim_statements', 'source_references'],
  outputSchema: {
    status: 'verified | partial | insufficient_data | unavailable',
    claims: 'Array<{ claim: string; sourceId: string; confidence: number }>',
  },
  evidenceRequirements: [
    'Every factual claim must cite a specific sourceId or database record.',
    'Material metrics require verifiable denominators and timestamps.',
    'Missing data must be explicitly reported as insufficient_data or unavailable.',
  ],
  safetyRules: [
    'Zero-Fabrication Contract is active and inviolable.',
    'Differentiate between measured observations and forward-looking inferences.',
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
  failureStates: ['insufficient_data', 'unavailable', 'partial', 'verified'],
  instructions: `EVIDENCE QUALITY STANDARD:
1. Every factual statement or metric claim must be grounded in an authoritative source record.
2. If telemetry or records are absent, state "INSUFFICIENT_DATA" or "UNAVAILABLE".
3. Never use static benchmarks or fabricated numbers to fill telemetry gaps.
4. Distinguish clearly between empirical observations (e.g. "We recorded 14 orders") and strategic hypotheses (e.g. "Increasing ad spend may lift traffic").`,
};
