// src/lib/ai/skills/research/general-web-research.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const generalWebResearchSkill: RuntimeSkill = {
  id: 'research_general_web_research',
  name: 'General Web Research & Discovery Gateway',
  version: '1.0.0',
  owner: 'research-gateway',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: [
    'worker_competitor_research',
    'worker_marketing',
    'worker_seo',
  ],
  description:
    'Decomposes research topics, executes governed multi-provider web searches (Crawl4AI Cloud -> Tavily -> Exa), extracts page evidence, and formats citations.',
  explicitNonCapabilities: [
    'Cannot access paid API endpoints when free quotas are exhausted.',
    'Cannot browse internal corporate networks, private IPs, or localhost (SSRF fail-closed).',
    'Cannot fabricate search findings or pretend search succeeded when providers are offline.',
  ],
  allowedTools: [
    'web_search',
    'read_webpage',
    'research_topic',
    'get_research_provider_health',
  ],
  requiredDataSources: ['research_gateway', 'evidence_ledger'],
  requiredInputs: ['topic_or_query'],
  outputSchema: {
    status: 'live | cached | partial | unavailable',
    summary: 'string',
    citations: 'Array<{ title: string; url: string; publishedAt?: string }>',
  },
  evidenceRequirements: [
    'Every factual answer must include source citations with URLs.',
    'Retrieved timestamp must be preserved for each cited webpage.',
  ],
  safetyRules: [
    'Pre-flight SSRF check required before every webpage fetch.',
    'Scrub all API tokens, bearer headers, and cookies from output traces.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2000,
    maxPages: 5,
    maxSpendUsd: 0,
  },
  failureStates: ['unavailable', 'partial', 'stale', 'verified'],
  instructions: `GENERAL WEB RESEARCH PROTOCOL:
1. Formulate concise, focused queries targeting authoritative domains.
2. Cross-verify claims across multiple search results when researching business-critical topics.
3. Attach exact URLs and access timestamps to every factual assertion.
4. Report provider health and fallback status transparently.`,
};
